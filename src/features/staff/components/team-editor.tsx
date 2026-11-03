'use client';

import { LogOut, MonitorSmartphone, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/forms/form-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { ActionError, ActionResult } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { DEVICE_MODES, INVITABLE_ROLES } from '../schemas/staff';
import { formatPairingCode } from '../services/pairing-code';
import {
  endSessionAction,
  inviteStaffAction,
  revokeDeviceAction,
  revokeInvitationAction,
  saveDevice,
  startPairing,
  type PairingTicket,
} from '../server/team-actions';

type Role = 'owner' | 'manager' | 'counter' | 'waiter' | 'station';
type Mode = (typeof DEVICE_MODES)[number];

export interface TeamData {
  members: {
    id: string;
    email: string;
    displayName: string | null;
    role: Role;
    isActive: boolean;
  }[];
  invitations: { id: string; email: string; role: Role; expiresAt: string }[];
  devices: {
    id: string;
    label: string;
    mode: Mode;
    createdAt: string;
    lastSeenAt: string | null;
  }[];
  sessions: {
    id: string;
    deviceLabel: string;
    memberEmail: string;
    memberName: string | null;
    startedAt: string;
    expiresAt: string;
  }[];
  /** `null` = unlimited. */
  seatsLeft: number | null;
  currentEmail: string | null;
  appHost: string;
}

/** Translates an action failure; field errors are handled by the forms themselves. */
function useTeamErrors() {
  const t = useTranslations('team');
  return (error: ActionError): string => {
    if (error.code === 'PLAN_LIMIT_REACHED') return t('errors.planLimit');
    if (error.details?.reason === 'readOnly') return t('errors.readOnly');
    if (error.code === 'FORBIDDEN') return t('errors.forbidden');
    if (error.code === 'NOT_FOUND') return t('errors.notFound');
    return t('toast.failed');
  };
}

function useRun() {
  const errorText = useTeamErrors();
  const [pending, setPending] = useState(false);
  const run = async <T,>(
    action: () => Promise<ActionResult<T>>,
    onError?: (error: ActionError) => boolean,
  ): Promise<ActionResult<T>> => {
    setPending(true);
    try {
      const result = await action();
      if (!result.ok && !onError?.(result.error)) toast.error(errorText(result.error));
      return result;
    } finally {
      setPending(false);
    }
  };
  return { pending, run };
}

/** Team page body (P1-11, spec 04 "Staff and devices"). */
export function TeamEditor({ data }: { data: TeamData }) {
  const t = useTranslations('team');
  const format = useFormatter();
  const { run } = useRun();
  const [inviting, setInviting] = useState(false);
  const [pairing, setPairing] = useState(false);
  const [editing, setEditing] = useState<TeamData['devices'][number] | null>(null);
  const [revoking, setRevoking] = useState<TeamData['devices'][number] | null>(null);

  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: 'medium' });
  const time = (value: string) =>
    format.dateTime(new Date(value), { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col gap-8">
      <Section
        title={t('members.title')}
        description={
          data.seatsLeft === null
            ? t('members.unlimited')
            : t('members.seats', { count: data.seatsLeft })
        }
        action={
          <Button
            onClick={() => {
              setInviting(true);
            }}
          >
            <UserPlus aria-hidden="true" />
            {t('members.invite')}
          </Button>
        }
      >
        <ul className="divide-y divide-border">
          {data.members.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 flex-col">
                <span className="font-medium break-all text-foreground" dir="auto">
                  {member.displayName ?? member.email}
                  {member.email === data.currentEmail ? (
                    <span className="ms-2 text-sm font-normal text-muted-foreground">
                      ({t('members.you')})
                    </span>
                  ) : null}
                </span>
                {member.displayName ? (
                  <span className="text-sm break-all text-muted-foreground" dir="ltr">
                    {member.email}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{t(`roles.${member.role}`)}</Badge>
                {member.isActive ? null : <Badge variant="outline">{t('members.inactive')}</Badge>}
              </div>
            </li>
          ))}
          {data.invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-medium break-all text-foreground" dir="ltr">
                  {invitation.email}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('members.pending')} ·{' '}
                  {t('members.expires', { date: date(invitation.expiresAt) })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{t(`roles.${invitation.role}`)}</Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('members.revokeLabel', { email: invitation.email })}
                  onClick={() => {
                    void run(() => revokeInvitationAction(invitation.id)).then((result) => {
                      if (result.ok) toast.success(t('toast.inviteRevoked'));
                    });
                  }}
                >
                  <X aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title={t('devices.title')}
        description={t('devices.description')}
        action={
          <Button
            variant="outline"
            onClick={() => {
              setPairing(true);
            }}
          >
            <Plus aria-hidden="true" />
            {t('devices.pair')}
          </Button>
        }
      >
        {data.devices.length === 0 ? (
          <p className="py-3 text-muted-foreground">{t('devices.empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.devices.map((device) => (
              <li
                key={device.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <MonitorSmartphone
                    aria-hidden="true"
                    className="size-5 shrink-0 text-muted-foreground"
                  />
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium break-words text-foreground" dir="auto">
                      {device.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t(`devices.modes.${device.mode}`)} ·{' '}
                      {device.lastSeenAt
                        ? t('devices.lastSeen', { date: date(device.lastSeenAt) })
                        : t('devices.never')}
                    </span>
                  </div>
                </div>
                <div
                  role="group"
                  aria-label={t('devices.actions', { name: device.label })}
                  className="flex gap-2"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditing(device);
                    }}
                  >
                    <Pencil aria-hidden="true" />
                    {t('devices.rename')}
                  </Button>
                  <Button
                    variant="destructive-soft"
                    size="sm"
                    onClick={() => {
                      setRevoking(device);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    {t('devices.revoke')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t('sessions.title')}>
        {data.sessions.length === 0 ? (
          <p className="py-3 text-muted-foreground">{t('sessions.empty')}</p>
        ) : (
          <ul className="divide-y divide-border">
            {data.sessions.map((session) => {
              const name = session.memberName ?? session.memberEmail;
              return (
                <li
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium break-all text-foreground" dir="auto">
                      {name}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {t('sessions.on', { device: session.deviceLabel })} ·{' '}
                      {t('sessions.until', { time: time(session.expiresAt) })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t('sessions.endLabel', { name })}
                    onClick={() => {
                      void run(() => endSessionAction(session.id)).then((result) => {
                        if (result.ok) toast.success(t('toast.sessionEnded'));
                      });
                    }}
                  >
                    <LogOut aria-hidden="true" />
                    {t('sessions.end')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {inviting ? (
        <InviteDialog
          onClose={() => {
            setInviting(false);
          }}
        />
      ) : null}
      {pairing ? (
        <PairDialog
          appHost={data.appHost}
          onClose={() => {
            setPairing(false);
          }}
        />
      ) : null}
      {editing ? (
        <DeviceDialog
          device={editing}
          onClose={() => {
            setEditing(null);
          }}
        />
      ) : null}
      {revoking ? (
        <RevokeDialog
          device={revoking}
          onClose={() => {
            setRevoking(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-xl font-title tracking-heading text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Radio cards: one choice with a hint per option. */
function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly { value: T; label: string; hint: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium text-foreground">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex min-h-target cursor-pointer items-start gap-3 rounded-sm border p-3 has-focus-visible:ring-2 has-focus-visible:ring-ring',
            value === option.value ? 'border-brand bg-brand-subtle' : 'border-border bg-card',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => {
              onChange(option.value);
            }}
            className="mt-1 size-4 accent-brand"
          />
          <span className="flex flex-col">
            <span className="font-medium text-foreground">{option.label}</span>
            <span className="text-sm text-muted-foreground">{option.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function InviteDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('team');
  const locale = useLocale();
  const tErrors = useTranslations('common.forms.errors');
  const { pending, run } = useRun();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof INVITABLE_ROLES)[number]>('waiter');
  const [emailError, setEmailError] = useState<string | undefined>();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            setEmailError(undefined);
            void run(
              () => inviteStaffAction({ email, role }, locale),
              (error) => {
                const field = error.details?.fields?.email;
                if (!field) return false;
                setEmailError(tErrors(field as 'required'));
                return true;
              },
            ).then((result) => {
              if (!result.ok) return;
              toast.success(t('toast.invited', { email: email.trim().toLowerCase() }));
              onClose();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('invite.title')}</DialogTitle>
            <DialogDescription>{t('invite.description')}</DialogDescription>
          </DialogHeader>
          <FormField label={t('invite.email')} error={emailError}>
            <Input
              type="email"
              autoComplete="off"
              dir="ltr"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </FormField>
          <ChoiceGroup
            legend={t('invite.role')}
            name="role"
            value={role}
            onChange={setRole}
            options={INVITABLE_ROLES.map((value) => ({
              value,
              label: t(`roles.${value}`),
              hint: t(`invite.roleHints.${value}`),
            }))}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('invite.cancel')}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {t('invite.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PairDialog({ appHost, onClose }: { appHost: string; onClose: () => void }) {
  const t = useTranslations('team');
  const tErrors = useTranslations('common.forms.errors');
  const format = useFormatter();
  const { pending, run } = useRun();
  const [label, setLabel] = useState('');
  const [mode, setMode] = useState<Mode>('fixed');
  const [labelError, setLabelError] = useState<string | undefined>();
  const [ticket, setTicket] = useState<PairingTicket | null>(null);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {ticket ? (
          <div className="flex flex-col gap-5">
            <DialogHeader>
              <DialogTitle>{t('pairing.codeTitle')}</DialogTitle>
              <DialogDescription>
                {t('pairing.codeHint', { url: `${appHost}/staff/pair` })}
              </DialogDescription>
            </DialogHeader>
            <p
              className="text-center font-mono text-4xl font-semibold tracking-widest text-foreground"
              dir="ltr"
              data-pairing-code={ticket.code}
            >
              {formatPairingCode(ticket.code)}
            </p>
            {/* Dark modules on light, in both themes: scanners expect it. */}
            <div data-theme="light" className="mx-auto rounded-sm bg-card p-1 text-foreground">
              <svg
                role="img"
                aria-label={t('pairing.qr')}
                viewBox={`0 0 ${String(ticket.qr.size)} ${String(ticket.qr.size)}`}
                className="size-48"
                shapeRendering="crispEdges"
              >
                <path d={ticket.qr.path} fill="currentColor" />
              </svg>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {t('pairing.expires', {
                time: format.dateTime(new Date(ticket.expiresAt), {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              })}
            </p>
            <DialogFooter>
              <Button onClick={onClose}>{t('pairing.done')}</Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            noValidate
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!label.trim()) {
                setLabelError(tErrors('required'));
                return;
              }
              setLabelError(undefined);
              void run(() => startPairing({ label, mode })).then((result) => {
                if (result.ok) setTicket(result.data);
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>{t('pairing.title')}</DialogTitle>
              <DialogDescription>{t('pairing.description')}</DialogDescription>
            </DialogHeader>
            <FormField label={t('pairing.label')} error={labelError}>
              <Input
                value={label}
                dir="auto"
                maxLength={40}
                placeholder={t('pairing.labelPlaceholder')}
                onChange={(event) => {
                  setLabel(event.target.value);
                }}
              />
            </FormField>
            <ChoiceGroup
              legend={t('pairing.mode')}
              name="mode"
              value={mode}
              onChange={setMode}
              options={DEVICE_MODES.map((value) => ({
                value,
                label: t(`devices.modes.${value}`),
                hint: t(`devices.modeHints.${value}`),
              }))}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('rename.cancel')}
              </Button>
              <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
                {t('pairing.submit')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeviceDialog({
  device,
  onClose,
}: {
  device: TeamData['devices'][number];
  onClose: () => void;
}) {
  const t = useTranslations('team');
  const tErrors = useTranslations('common.forms.errors');
  const { pending, run } = useRun();
  const [label, setLabel] = useState(device.label);
  const [mode, setMode] = useState<Mode>(device.mode);
  const [labelError, setLabelError] = useState<string | undefined>();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!label.trim()) {
              setLabelError(tErrors('required'));
              return;
            }
            void run(() => saveDevice({ deviceId: device.id, label, mode })).then((result) => {
              if (!result.ok) return;
              toast.success(t('toast.deviceSaved'));
              onClose();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t('rename.title')}</DialogTitle>
          </DialogHeader>
          <FormField label={t('pairing.label')} error={labelError}>
            <Input
              value={label}
              dir="auto"
              maxLength={40}
              onChange={(event) => {
                setLabel(event.target.value);
              }}
            />
          </FormField>
          <ChoiceGroup
            legend={t('pairing.mode')}
            name="mode"
            value={mode}
            onChange={setMode}
            options={DEVICE_MODES.map((value) => ({
              value,
              label: t(`devices.modes.${value}`),
              hint: t(`devices.modeHints.${value}`),
            }))}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('rename.cancel')}
            </Button>
            <Button type="submit" disabled={pending} aria-busy={pending || undefined}>
              {t('rename.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RevokeDialog({
  device,
  onClose,
}: {
  device: TeamData['devices'][number];
  onClose: () => void;
}) {
  const t = useTranslations('team');
  const { pending, run } = useRun();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('revoke.title', { name: device.label })}</DialogTitle>
          <DialogDescription>{t('revoke.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('revoke.cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={() => {
              void run(() => revokeDeviceAction(device.id)).then((result) => {
                if (!result.ok) return;
                toast.success(t('toast.deviceRevoked'));
                onClose();
              });
            }}
          >
            {t('revoke.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
