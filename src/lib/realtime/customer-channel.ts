import { REALTIME_SUBSCRIBE_STATES, RealtimeClient } from '@supabase/realtime-js';

/**
 * Receive-only private channels for the anonymous customer menu (ADR-0008): `m:{menu}` for
 * availability, `s:{table session}` for request updates. Loaded lazily, never on page load.
 * Uses realtime-js alone (no auth, REST or storage clients) to keep the chunk small.
 */

export interface RealtimeConfig {
  url: string;
  /** Publishable key: anon role, private topics are authorised by RLS (ADR-0008). */
  publishableKey: string;
}

export interface CustomerChannel {
  config: RealtimeConfig;
  topic: string;
  onEvent: (event: string, payload: Record<string, unknown>) => void;
  /** `true` once joined, `false` on error, timeout or close; clients refetch on `true`. */
  onStatus: (connected: boolean) => void;
}

let client: RealtimeClient | null = null;

function shared(config: RealtimeConfig): RealtimeClient {
  client ??= new RealtimeClient(`${config.url}/realtime/v1`, {
    params: { apikey: config.publishableKey },
    accessToken: () => Promise.resolve(config.publishableKey),
  });
  return client;
}

/** Joins `topic` and returns a function that leaves it. */
export function openCustomerChannel(options: CustomerChannel): () => void {
  const realtime = shared(options.config);
  const channel = realtime.channel(options.topic, { config: { private: true } });
  channel.on('broadcast', { event: '*' }, (message) => {
    const payload: unknown = message.payload;
    options.onEvent(
      message.event,
      typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {},
    );
  });
  channel.subscribe((status) => {
    options.onStatus(status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
  });
  return () => {
    void realtime.removeChannel(channel);
  };
}
