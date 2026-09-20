export interface PostyConfig {
  apiKey: string;
  apiUrl?: string;
  /**
   * The workspace every request is about, sent as the `showorg` header.
   * Required by the API when the key spans several workspaces; harmless when
   * it spans one. See `posty workspaces:list` / `posty workspaces:use`.
   */
  workspaceId?: string;
}

/** `GET /public/v1/workspaces`: what the credential can act on. */
export interface Workspace {
  id: string;
  name: string;
  role: string;
  /** True for the workspace this request acted on. */
  current: boolean;
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

  /**
   * The 403 a multi-workspace key gets when no workspace was named. Not an
   * auth failure: the key is fine, the request is missing a choice, and the
   * fix is `workspaces:use`, not `auth:login`.
   */
  get isWorkspaceChoice() {
    return (
      this.status === 403 && this.body.includes('spans several workspaces')
    );
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

/** `GET /public/v1/plans`: the four plans and the workspace's current tier. */
export interface Plans {
  currency: string;
  trial: string;
  trialDays: number;
  trialAvailableHere: boolean;
  current: { tier: string; plan: string; slug: string | null };
  plans: Array<{
    tier: string;
    plan: string;
    slug: string;
    monthly: { amount: number; formatted: string };
    yearly: { amount: number; formatted: string; savesPerYear: number };
    limits: Record<string, number | boolean | null>;
  }>;
}

/** `POST /public/v1/subscriptions/checkout`: the link the PERSON opens. */
export interface SubscriptionCheckout {
  status: 'requires_payment';
  checkoutUrl: string;
  checkoutId: string;
  tier: string;
  plan: string;
  period: 'MONTHLY' | 'YEARLY';
  amount: number;
  currency: string;
  trial: boolean;
  trialDays: number;
  expiresAt: string;
}

/** `GET /public/v1/subscription`: where the workspace stands. */
export interface SubscriptionState {
  state: 'none' | 'trialing' | 'active' | 'past_due' | 'read_only' | 'cancelled';
  tier: string | null;
  plan: string | null;
  period: 'MONTHLY' | 'YEARLY' | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  payerIsCaller: boolean;
  noPayerYet: boolean;
  pendingCheckout: {
    checkoutId: string;
    checkoutUrl: string;
    plan: string;
    period: string | null;
    expiresAt: string;
  } | null;
  apiAndMcpAccess: boolean;
}

export class PostyAPI {
  private apiKey: string;
  private apiUrl: string;
  private workspaceId?: string;

  constructor(config: PostyConfig) {
    this.apiKey = config.apiKey;
    this.workspaceId = config.workspaceId;
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
      ...this.workspaceHeader(),
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
          ...this.workspaceHeader(),
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

  private workspaceHeader(): Record<string, string> {
    return this.workspaceId ? { showorg: this.workspaceId } : {};
  }

  async listWorkspaces(): Promise<Workspace[]> {
    return (await this.request('/public/v1/workspaces', {
      method: 'GET',
    })) as Workspace[];
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

  /*
    BILLING. These four answer without the plan gate on the server, so they
    work for a workspace that has no subscription yet: they are how it gets
    one. The checkout and the portal need an OAuth token or a full-workspace
    key (the "whole workspace" box on the `posty auth:login` approval page);
    a scoped key is refused with a sentence that says so.
  */

  async getPlans(): Promise<Plans> {
    return (await this.request('/public/v1/plans', { method: 'GET' })) as Plans;
  }

  async getSubscription(): Promise<SubscriptionState> {
    return (await this.request('/public/v1/subscription', {
      method: 'GET',
    })) as SubscriptionState;
  }

  /** Nothing is charged by this call; the person pays on the returned link. */
  async createSubscriptionCheckout(
    tier: string,
    period: string
  ): Promise<SubscriptionCheckout> {
    return (await this.request('/public/v1/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier, period }),
    })) as SubscriptionCheckout;
  }

  async getSubscriptionPortal(): Promise<{ portalUrl: string; note: string }> {
    return (await this.request('/public/v1/subscription/portal', {
      method: 'GET',
    })) as { portalUrl: string; note: string };
  }
}
