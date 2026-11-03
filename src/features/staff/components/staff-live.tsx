'use client';

import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { BellRing, LogOut, Receipt } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/states/empty-state';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';
import {
  applyRequestEvent,
  connectionLevel,
  minutesSince,
  visibleRequests,
  type ConnectionLevel,
  type LiveRequest,
  type LiveRequestStatus,
} from '../services/live';
import { staffLogOut } from '../server/staff-actions';
import { chime, unlockAudio } from './chime';

type NotificationState = 'on' | 'denied' | 'unavailable' | 'off';

export interface StaffLiveProps {
  restaurantId: string;
  userId: string;
  deviceMode: 'fixed' | 'mobile';
  heading: string;
  subheading: string;
  realtime: { url: string; publishableKey: string };
  vapidPublicKey: string | null;
}

interface AvailabilityItem {
  id: string;
  name: string;
  category: string;
  isAvailable: boolean;
}

const STATUSES: ReadonlySet<string> = new Set(['open', 'claimed', 'done', 'cancelled']);

/** Any staff API answer that means "this device or session is no longer valid". */
function expired(response: Response) {
  return response.status === 401;
}

const subscribeNever = () => () => undefined;

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** Subscribes this device to Web Push (ADR-0022) when keys exist and permission is granted. */
async function subscribePush(vapidPublicKey: string | null): Promise<NotificationState> {
  if (!vapidPublicKey) return 'off';
  if (
    !('Notification' in window) ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return 'unavailable';
  }
  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== 'granted') return 'denied';
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToBytes(vapidPublicKey),
      }));
    const json = subscription.toJSON();
    const response = await fetch('/api/staff/push-subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    });
    return response.ok ? 'on' : 'unavailable';
  } catch {
    return 'unavailable';
  }
}

/**
 * Staff live screen (spec 03, P1-12): "Start service" gate, then service requests in real time
 * with sounds, vibration, atomic claim and acks, plus the availability toggles.
 */
export function StaffLive(props: StaffLiveProps) {
  const t = useTranslations('staff');
  const [started, setStarted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationState>('off');
  // iPhone outside the home-screen app: push needs "Add to Home Screen" (ADR-0022 §4).
  const isIos = useSyncExternalStore(
    subscribeNever,
    () =>
      /iPhone|iPad|iPod/.test(navigator.userAgent) &&
      !window.matchMedia('(display-mode: standalone)').matches,
    () => false,
  );

  if (!started) {
    return (
      <section className="m-auto flex w-full max-w-md flex-col gap-6 rounded-md border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-3xl font-title tracking-heading text-foreground">{t('start.title')}</h1>
        <p className="text-md text-muted-foreground">{t('start.description')}</p>
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            // Inside the tap: browsers only allow audio and permission prompts from a gesture.
            unlockAudio();
            setStarted(true);
            void subscribePush(props.vapidPublicKey).then(setNotifications);
          }}
        >
          {t('start.button')}
        </Button>
        {isIos ? <p className="text-sm text-muted-foreground">{t('start.iosHint')}</p> : null}
      </section>
    );
  }
  return <LiveScreen {...props} notifications={notifications} />;
}

function LiveScreen({
  restaurantId,
  userId,
  deviceMode,
  heading,
  subheading,
  realtime,
  notifications,
}: StaffLiveProps & { notifications: NotificationState }) {
  const t = useTranslations('staff.live');
  const locale = useLocale();
  const [tab, setTab] = useState<'requests' | 'availability'>('requests');
  const [requests, setRequests] = useState<LiveRequest[]>([]);
  const [subscribed, setSubscribed] = useState(false);
  const [downSince, setDownSince] = useState<number | null>(null);
  const [browserOnline, setBrowserOnline] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const seen = useRef(new Set<string>());
  const pendingAcks = useRef<string[]>([]);

  const level: ConnectionLevel = connectionLevel({ browserOnline, subscribed, downSince, now });

  const router = useRouter();
  // /staff redirects to pairing or sign-in when the device or the session is gone.
  const leave = (response: Response) => {
    if (expired(response)) router.replace('/staff');
  };

  /** New ids: ring, vibrate and queue an ack (ADR-0007 §3). */
  const announce = useEffectEvent((list: readonly LiveRequest[], ring: boolean) => {
    const fresh = list.filter((request) => !seen.current.has(request.id));
    for (const request of fresh) {
      seen.current.add(request.id);
      pendingAcks.current.push(request.id);
    }
    const first = fresh.find((request) => request.status === 'open');
    if (ring && first) {
      chime(first.kind);
      if ('vibrate' in navigator) {
        navigator.vibrate(first.kind === 'bill' ? [200, 100, 200, 100, 200] : [300, 150, 300]);
      }
    }
  });

  const refetch = useEffectEvent(async (ring: boolean) => {
    try {
      const response = await fetch('/api/staff/requests', { cache: 'no-store' });
      if (!response.ok) {
        leave(response);
        return;
      }
      const { requests: fresh } = (await response.json()) as { requests: LiveRequest[] };
      announce(fresh, ring);
      setRequests(fresh);
    } catch {
      // Offline: the indicator turns red and the poll retries.
    }
  });

  const onEvent = useEffectEvent((event: string, payload: Record<string, unknown>) => {
    const { id, status, version } = payload;
    if (typeof id !== 'string' || typeof status !== 'string' || typeof version !== 'number') return;
    if (!STATUSES.has(status)) return;
    if (event === 'request.created') {
      const {
        kind,
        table_number: tableNumber,
        payment_method: payment,
        created_at: createdAt,
      } = payload;
      if ((kind !== 'waiter' && kind !== 'bill') || typeof tableNumber !== 'number') {
        void refetch(true);
        return;
      }
      const request: LiveRequest = {
        id,
        kind,
        status: status as LiveRequestStatus,
        tableNumber,
        tableLabel: null,
        paymentMethod: payment === 'cash' || payment === 'card' ? payment : null,
        createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
        claimedBy: null,
        claimedByName: null,
        version,
      };
      announce([request], true);
      setRequests((current) =>
        current.some((item) => item.id === id) ? current : [...current, request],
      );
      return;
    }
    setRequests((current) => {
      const next = applyRequestEvent(current, { id, status: status as LiveRequestStatus, version });
      if (next) return next;
      void refetch(false);
      return current;
    });
  });

  // Realtime on the private staff topic (ADR-0008): refetch on every (re)connect.
  const { url, publishableKey } = realtime;
  useEffect(() => {
    const supabase = supabaseBrowser(url, publishableKey);
    const life = { cancelled: false };
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (life.cancelled) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      channel = supabase.channel(`r:${restaurantId}:requests`, { config: { private: true } });
      channel.on('broadcast', { event: '*' }, (message) => {
        const payload: unknown = message.payload;
        onEvent(
          message.event,
          typeof payload === 'object' && payload !== null
            ? (payload as Record<string, unknown>)
            : {},
        );
      });
      channel.subscribe((status) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          setSubscribed(true);
          setDownSince(null);
          void refetch(false);
        } else {
          setSubscribed(false);
          setDownSince((since) => since ?? Date.now());
        }
      });
    })();
    return () => {
      life.cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [restaurantId, url, publishableKey]);

  // Clock for ages and the indicator; polling while the socket is down (ADR-0008 §6).
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => {
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (level !== 'offline') return;
    const poll = setInterval(() => void refetch(false), 10_000);
    return () => {
      clearInterval(poll);
    };
  }, [level]);

  // Acks, batched every 500 ms (the latency metric is measured from them, ADR-0007 §6).
  useEffect(() => {
    const flush = setInterval(() => {
      const events = pendingAcks.current.splice(0, 50);
      if (events.length === 0) return;
      void fetch('/api/staff/acks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      }).catch(() => {
        pendingAcks.current.unshift(...events);
      });
    }, 500);
    return () => {
      clearInterval(flush);
    };
  }, []);

  // Connectivity, and the Wake Lock on fixed devices (re-acquired when the tab comes back).
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (deviceMode !== 'fixed' || !('wakeLock' in navigator)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // Battery saver or unsupported: the screen may sleep, push still rings.
      }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
        void refetch(false);
      }
    };
    const connectivity = () => {
      setBrowserOnline(navigator.onLine);
    };
    void acquire();
    connectivity();
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
      void lock?.release();
    };
  }, [deviceMode]);

  async function act(request: LiveRequest, action: 'claim' | 'done') {
    const before = requests;
    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? { ...item, status: action === 'claim' ? 'claimed' : 'done', claimedBy: userId }
          : item,
      ),
    );
    try {
      const response = await fetch(`/api/staff/requests/${request.id}/${action}`, {
        method: 'POST',
      });
      if (response.ok) {
        const { version } = (await response.json()) as { version: number };
        setRequests((current) =>
          current.map((item) =>
            item.id === request.id ? { ...item, version: Math.max(item.version, version) } : item,
          ),
        );
        return;
      }
      leave(response);
      const body = (await response.json().catch(() => null)) as {
        details?: { reason?: string; by?: string | null };
      } | null;
      if (response.status === 409) {
        // Someone else was faster: the request leaves this screen.
        setRequests((current) => current.filter((item) => item.id !== request.id));
        toast.info(
          body?.details?.reason === 'alreadyClaimed'
            ? t('alreadyClaimed', { name: body.details.by ?? '—' })
            : t('alreadyDone'),
        );
        return;
      }
      setRequests(before);
      toast.error(t('failed'));
    } catch {
      setRequests(before);
      toast.error(t('failed'));
    }
  }

  const shown = visibleRequests(requests, userId);

  return (
    <div className="flex w-full flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <h1 className="text-2xl font-title tracking-heading text-foreground">{heading}</h1>
          <p className="text-sm text-foreground">{subheading}</p>
          <p className="text-sm text-muted-foreground">{t(`notifications.${notifications}`)}</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge level={level} label={t(`connection.${level}`)} />
          <form action={staffLogOut}>
            <Button type="submit" variant="ghost" size="icon-lg" aria-label={t('logout')}>
              <LogOut aria-hidden="true" />
            </Button>
          </form>
        </div>
      </header>

      <div role="tablist" aria-label={heading} className="grid grid-cols-2 gap-2">
        {(['requests', 'availability'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
            }}
            className={cn(
              'min-h-target-staff rounded-sm border px-4 text-md font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab === value
                ? 'border-brand bg-brand text-on-brand'
                : 'border-border bg-card text-foreground',
            )}
          >
            {t(`tabs.${value}`)}
            {value === 'requests' && shown.length > 0 ? ` · ${String(shown.length)}` : ''}
          </button>
        ))}
      </div>

      {tab === 'requests' ? (
        <section aria-label={t('count', { count: shown.length })} aria-live="polite">
          {shown.length === 0 ? (
            <EmptyState
              icon={<BellRing />}
              title={t('empty.title')}
              description={t('empty.description')}
              className="bg-card py-16"
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  mine={request.claimedBy === userId}
                  now={now}
                  onClaim={() => void act(request, 'claim')}
                  onDone={() => void act(request, 'done')}
                />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <AvailabilityPanel locale={locale} />
      )}
    </div>
  );
}

function ConnectionBadge({ level, label }: { level: ConnectionLevel; label: string }) {
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-2.5 rounded-full',
          level === 'online' && 'bg-success',
          level === 'reconnecting' && 'bg-warning',
          level === 'offline' && 'bg-destructive',
        )}
      />
      {label}
    </p>
  );
}

function RequestCard({
  request,
  mine,
  now,
  onClaim,
  onDone,
}: {
  request: LiveRequest;
  mine: boolean;
  now: number;
  onClaim: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('staff.live');
  const Icon = request.kind === 'bill' ? Receipt : BellRing;
  const table = t('table', { number: request.tableNumber });
  return (
    <li
      data-request-id={request.id}
      className={cn(
        'flex flex-col gap-4 rounded-md border-2 bg-card p-5 shadow-sm',
        mine ? 'border-border' : 'border-brand',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <span className="sr-only">{table}</span>
          <span
            aria-hidden="true"
            className="text-display leading-none font-title text-foreground tabular-nums"
          >
            {request.tableNumber}
          </span>
          {request.tableLabel ? (
            <span className="text-sm text-muted-foreground" dir="auto">
              {request.tableLabel}
            </span>
          ) : null}
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {t('age', { minutes: minutesSince(request.createdAt, now) })}
        </span>
      </div>
      <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <Icon aria-hidden="true" className="size-6 shrink-0" />
        {t(`kinds.${request.kind}`)}
        {request.paymentMethod ? ` · ${t(`payment.${request.paymentMethod}`)}` : ''}
      </p>
      {mine ? (
        <>
          <p className="text-sm font-medium text-success">{t('mine')}</p>
          <Button size="lg" variant="outline" className="w-full" onClick={onDone}>
            {t('done')}
          </Button>
        </>
      ) : (
        <Button size="lg" className="w-full" onClick={onClaim}>
          {t('claim')}
        </Button>
      )}
    </li>
  );
}

function AvailabilityPanel({ locale }: { locale: string }) {
  const t = useTranslations('staff.live.availability');
  const router = useRouter();
  const [items, setItems] = useState<AvailabilityItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/staff/availability?locale=${encodeURIComponent(locale)}`, {
      cache: 'no-store',
    }).then(async (response) => {
      if (cancelled) return;
      if (expired(response)) {
        router.replace('/staff');
        return;
      }
      if (response.ok) setItems(((await response.json()) as { items: AvailabilityItem[] }).items);
    });
    return () => {
      cancelled = true;
    };
  }, [locale, router]);

  async function toggle(item: AvailabilityItem, isAvailable: boolean) {
    setItems(
      (current) =>
        current?.map((entry) => (entry.id === item.id ? { ...entry, isAvailable } : entry)) ?? null,
    );
    const response = await fetch('/api/staff/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: item.id, isAvailable }),
    }).catch(() => null);
    if (!response?.ok) {
      setItems(
        (current) =>
          current?.map((entry) =>
            entry.id === item.id ? { ...entry, isAvailable: item.isAvailable } : entry,
          ) ?? null,
      );
    }
  }

  if (!items) return null;
  if (items.length === 0) return <p className="text-muted-foreground">{t('empty')}</p>;
  const categories = [...new Set(items.map((item) => item.category))];
  return (
    <section className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">{t('description')}</p>
      {categories.map((category) => (
        <div key={category} className="flex flex-col gap-1">
          <h2
            className="text-sm font-semibold tracking-label text-muted-foreground uppercase"
            dir="auto"
          >
            {category}
          </h2>
          <ul className="divide-y divide-border rounded-md border border-border bg-card">
            {items
              .filter((item) => item.category === category)
              .map((item) => (
                <li
                  key={item.id}
                  className="flex min-h-target-staff items-center justify-between gap-3 px-4"
                >
                  <span
                    dir="auto"
                    className={cn(
                      'font-medium',
                      item.isAvailable ? 'text-foreground' : 'text-muted-foreground line-through',
                    )}
                  >
                    {item.name}
                  </span>
                  <Switch
                    checked={item.isAvailable}
                    aria-label={t('available', { name: item.name })}
                    onCheckedChange={(checked) => void toggle(item, checked)}
                  />
                </li>
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
