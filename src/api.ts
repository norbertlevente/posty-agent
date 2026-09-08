export interface PostyConfig {
  apiKey: string;
  apiUrl?: string;
}

/**
 * Thrown for any non-2xx answer from the API. `status` survives so command
 * handlers can say something more useful than the raw body — in particular
 * a 401/403 should point the user at `posty auth:login`, not at the JSON.
 */
export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`API Error (${status}): ${body}`);
    this.name = 'ApiError';
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  get isRateLimit() {
    return this.status === 429;
  }
}

/** `POST /public/v1/upload-link`: the page to show the person, and its id. */
export interface UploadLink {
  id: string;
  url: string;
  expiresAt: string;
}

/** `GET /public/v1/upload-link/:id`: what arrived through the link so far. */
export interface UploadLinkFiles {
  id: string;
  status: 'empty' | 'ready';
  count: number;
  files: Array<{ id: string; name: string; path: string; type: string }>;
}

export class PostyAPI {
  private apiKey: string;
  private apiUrl: string;

  constructor(config: PostyConfig) {
    this.apiKey = config.apiKey;
    // `api.posty.hu` is live and equivalent; the same API is also served under
    // `/api` on the main host, which is the safer fallback for a key set by
    // hand. `posty auth:login` stores the real base in credentials.json.
    this.apiUrl = config.apiUrl || 'https://posty.hu/api';
  }

  private async request(endpoint: string, options: any = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: this.apiKey,
      ...options.headers,
    };

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error: any) {
      throw new Error(`Could not reach ${this.apiUrl}: ${error.message}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new ApiError(response.status, error);
    }

    return await response.json();
  }

  async createPost(data: any) {
    return this.request('/public/v1/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listPosts(filters: any = {}) {
    const queryString = new URLSearchParams(
      Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString();

    const endpoint = queryString
      ? `/public/v1/posts?${queryString}`
      : '/public/v1/posts';

    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async deletePost(id: string) {
    return this.request(`/public/v1/posts/${id}`, {
      method: 'DELETE',
    });
  }

  async findSlot(integrationId: string) {
    return this.request(
      `/public/v1/find-slot/${encodeURIComponent(integrationId)}`,
      {
        method: 'GET',
      }
    );
  }

  async upload(file: Buffer, filename: string) {
    const formData = new FormData();
    const extension = filename.split('.').pop()?.toLowerCase() || '';

    // The server sniffs magic bytes and accepts exactly eight types; this map
    // only sets the declared Content-Type for the multipart part.
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      avif: 'image/avif',
      bmp: 'image/bmp',
      tif: 'image/tiff',
      tiff: 'image/tiff',
      mp4: 'video/mp4',
    };

    const type = mimeTypes[extension] || 'application/octet-stream';

    const blob = new Blob([new Uint8Array(file)], { type });
    formData.append('file', blob, filename);

    const url = `${this.apiUrl}/public/v1/upload`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          Authorization: this.apiKey,
        },
      });
    } catch (error: any) {
      throw new Error(`Could not reach ${this.apiUrl}: ${error.message}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new ApiError(response.status, error);
    }

    return await response.json();
  }

  async getMissingContent(postId: string) {
    return this.request(`/public/v1/posts/${postId}/missing`, {
      method: 'GET',
    });
  }

  async updateReleaseId(postId: string, releaseId: string) {
    return this.request(`/public/v1/posts/${postId}/release-id`, {
      method: 'PUT',
      body: JSON.stringify({ releaseId }),
    });
  }

  async changePostStatus(postId: string, status: 'draft' | 'schedule') {
    return this.request(`/public/v1/posts/${postId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getAnalytics(integrationId: string, date: string) {
    return this.request(`/public/v1/analytics/${integrationId}?date=${encodeURIComponent(date)}`, {
      method: 'GET',
    });
  }

  async getPostAnalytics(postId: string, date: string) {
    return this.request(`/public/v1/analytics/post/${postId}?date=${encodeURIComponent(date)}`, {
      method: 'GET',
    });
  }

  async listIntegrations(group?: string) {
    const query = group ? `?group=${encodeURIComponent(group)}` : '';
    return this.request(`/public/v1/integrations${query}`, {
      method: 'GET',
    });
  }

  async listGroups() {
    return this.request('/public/v1/groups', {
      method: 'GET',
    });
  }

  async getIntegrationSettings(integrationId: string) {
    return this.request(`/public/v1/integration-settings/${integrationId}`, {
      method: 'GET',
    });
  }

  async triggerIntegrationTool(
    integrationId: string,
    methodName: string,
    data: Record<string, string>
  ) {
    return this.request(`/public/v1/integration-trigger/${integrationId}`, {
      method: 'POST',
      body: JSON.stringify({ methodName, data }),
    });
  }

  /**
   * A browser upload link for a file this process does not hold. `upload`
   * covers the file on disk; this covers the one on the person's phone.
   */
  async createUploadLink(): Promise<UploadLink> {
    return (await this.request('/public/v1/upload-link', {
      method: 'POST',
      body: JSON.stringify({}),
    })) as UploadLink;
  }

  async getUploadLinkFiles(id: string): Promise<UploadLinkFiles> {
    return (await this.request(
      `/public/v1/upload-link/${encodeURIComponent(id)}`,
      { method: 'GET' }
    )) as UploadLinkFiles;
  }
}
