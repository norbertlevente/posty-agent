import { randomUUID } from 'crypto';
import { ApiError, PostyAPI } from '../api';
import { getConfig } from '../config';
import { result, status, fail } from '../output';

/*
  FOTOAI (fotoai.hu) FROM A SHELL.

  Images and videos generated with the key owner's OWN FotoAI account and
  credits, saved into the workspace's media library, ready for posts:create.
  The person connects FotoAI once in Posty (the connect_url the commands
  print); after that the CLI never sees a FotoAI credential.

  SPENDING NEEDS --yes. Without it `fotoai:generate` only prices the job and
  prints the quote, so an agent shows the price to the person before any
  credit is spent. With it, the quoted price is the ceiling: FotoAI refuses
  with PRICE_CHANGED rather than charge more.
*/

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The FotoAI refusal in one line, with the link or the wait the person needs. */
const failFotoAi = (context: string, error: any): never => {
  if (error instanceof ApiError) {
    let body: any = null;
    try {
      body = JSON.parse(error.body);
    } catch {
      /* not JSON */
    }
    /*
      A 404 without a FotoAI code is the route itself missing: this Posty
      server runs without FotoAI (it is switched off there, or older than it).
      A generation that does not exist answers 404 WITH a code, below.
    */
    if (error.status === 404 && !body?.code) {
      status('❌ FotoAI is not available on this Posty server yet.');
      process.exit(1);
    }
    if (body?.code) {
      const details = body.details || {};
      status(`❌ ${context}: ${body.msg || body.code} (${body.code})`);
      if (details.connect_url) {
        status(`Connect FotoAI in Posty once: ${details.connect_url}`);
      }
      if (details.topup_url) {
        status(`FotoAI credits can be bought at ${details.topup_url}`);
      }
      if (typeof details.quote === 'number') {
        status(`The new price is ${details.quote / 1000} credits. Quote again and confirm it.`);
      }
      if (body.retryAfter) {
        status(`Try again in ${body.retryAfter} seconds.`);
      }
      process.exit(1);
    }
  }
  fail(context, error);
};

const paramsOf = (args: any) => {
  const params: Record<string, unknown> = {};
  if (args.aspect) params.aspect = String(args.aspect);
  if (args.duration) params.duration = Number(args.duration);
  if (args.resolution) params.resolution = String(args.resolution);
  return params;
};

/** `posty fotoai:status` — connected or not, as whom, and the credit balance. */
export async function fotoAiStatus() {
  const api = new PostyAPI(getConfig());
  try {
    const current: any = await api.fotoAiStatus();
    if (!current.connected) {
      status(
        current.needsReconnect
          ? `The FotoAI connection has expired. Connect again in Posty: ${current.connectUrl}`
          : `FotoAI is not connected. The person connects it once in Posty: ${current.connectUrl}`
      );
    }
    result(current);
  } catch (error: any) {
    failFotoAi('Failed to read the FotoAI status', error);
  }
}

/** `posty fotoai:models [--category image|video]` — models, parameters and prices. */
export async function fotoAiModels(args: any) {
  const api = new PostyAPI(getConfig());
  try {
    const catalog: any = await api.fotoAiModels(args.category);
    const models = (catalog.models || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      category: m.category,
      can_use: !!m.can_use,
      estimated_seconds: m.estimated_seconds ?? null,
      max_duration_seconds: m.max_duration_seconds ?? null,
      base_price_credits: (() => {
        const prices = (m.price?.configs || [])
          .map((c: any) => Number(c.millicredits))
          .filter((n: number) => Number.isFinite(n) && n > 0);
        return prices.length ? Math.min(...prices) / 1000 : null;
      })(),
      params: (m.params || []).map((p: any) => ({
        key: p.key,
        default: p.default ?? null,
        options: (p.options || []).map((o: any) => o.value),
      })),
    }));
    result({ catalog_version: catalog.catalog_version || null, models });
  } catch (error: any) {
    failFotoAi('Failed to list the FotoAI models', error);
  }
}

/**
 * `posty fotoai:get <id> [--wait 60]` — the status, and once it is done the
 * outputs saved into the media library (imported if they are not yet).
 */
export async function fotoAiGet(args: any) {
  const api = new PostyAPI(getConfig());
  const deadline = Date.now() + Math.max(0, Number(args.wait) || 0) * 1000;
  try {
    let current: any = await api.fotoAiImport(String(args.id));
    while (
      (['queued', 'running'].includes(current.status) ||
        (current.status === 'completed' && !current.media?.length && !current.import_error)) &&
      Date.now() < deadline
    ) {
      await sleep(3000);
      current = await api.fotoAiImport(String(args.id));
    }
    if (current.media?.length) {
      status(`Saved in the media library. Attach each media[].path with posts:create.`);
    } else if (['queued', 'running'].includes(current.status)) {
      status(`Still ${current.status}. Run "posty fotoai:get ${current.id} --wait 60" again.`);
    }
    result(current);
  } catch (error: any) {
    failFotoAi('Failed to read the FotoAI generation', error);
  }
}

/**
 * `posty fotoai:generate -m <model> -p "prompt" [--aspect 4:5] [--yes] [--wait 60]`
 */
export async function fotoAiGenerate(args: any) {
  const api = new PostyAPI(getConfig());
  const request = {
    model: String(args.model),
    prompt: String(args.prompt),
    params: paramsOf(args),
  };
  let quote: any;
  try {
    quote = await api.fotoAiQuote(request);
  } catch (error: any) {
    failFotoAi('Failed to price the FotoAI generation', error);
  }

  const balance =
    typeof quote.available_millicredits === 'number'
      ? `, balance ${quote.available_millicredits / 1000} credits`
      : '';
  if (quote.insufficient) {
    status(
      `Not enough FotoAI credits: this costs ${quote.credits} credits${balance}.${
        quote.topup_url ? ` Buy credits at ${quote.topup_url}` : ''
      }`
    );
    result({ generated: false, quote });
    process.exit(1);
  }
  if (!args.yes) {
    status(
      `This costs ${quote.credits} FotoAI credits${balance}. Nothing was spent. Run the same command with --yes to generate.`
    );
    result({ generated: false, quote });
    return;
  }

  try {
    const started: any = await api.fotoAiGenerate({
      ...request,
      quote_id: quote.quote_id,
      idempotency_key: args.idempotencyKey || randomUUID(),
    });
    status(`Generating (about ${started.estimated_seconds ?? '?'} seconds), id ${started.id}.`);
    if (!Number(args.wait)) {
      status(`Run "posty fotoai:get ${started.id} --wait 60" for the media paths.`);
      result(started);
      return;
    }
    await fotoAiGet({ id: started.id, wait: args.wait });
  } catch (error: any) {
    failFotoAi('Failed to start the FotoAI generation', error);
  }
}
