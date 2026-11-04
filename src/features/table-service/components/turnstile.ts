/**
 * Cloudflare Turnstile, loaded only when the server answers CHALLENGE_REQUIRED (ADR-0011 §3).
 * "interaction-only": most visitors never see the widget; it appears in `container` only when
 * Cloudflare needs a click.
 */

interface TurnstileOptions {
  sitekey: string;
  appearance: 'interaction-only';
  language: string;
  callback: (token: string) => void;
  'error-callback': () => void;
  'timeout-callback': () => void;
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileOptions) => string | undefined;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SCRIPT =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loading: Promise<TurnstileApi> | null = null;

function load(): Promise<TurnstileApi> {
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT;
    script.async = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('turnstile.missing'));
    };
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error('turnstile.load_failed'));
    };
    document.head.append(script);
  });
  return loading;
}

/** Resolves with a single-use token for the server's siteverify call. */
export async function solveTurnstile(
  siteKey: string,
  container: HTMLElement,
  language: string,
): Promise<string> {
  const api = await load();
  return new Promise<string>((resolve, reject) => {
    const done = () => {
      if (widgetId !== undefined) api.remove(widgetId);
    };
    const widgetId = api.render(container, {
      sitekey: siteKey,
      appearance: 'interaction-only',
      language,
      callback: (token) => {
        resolve(token);
        setTimeout(done, 0);
      },
      'error-callback': () => {
        done();
        reject(new Error('turnstile.error'));
      },
      'timeout-callback': () => {
        done();
        reject(new Error('turnstile.timeout'));
      },
    });
  });
}
