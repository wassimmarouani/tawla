import { CircleCheck, LogOut, MonitorSmartphone } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AuthHeading } from '@/components/layout/auth-heading';
import { Button } from '@/components/ui/button';
import { LoginForm } from '@/features/auth';
import { getSessionClaims } from '@/lib/auth/session';
import { activeStaffSession, currentDevice, requireStaffPage } from '../server/context';
import { staffLogIn, staffLogOut } from '../server/staff-actions';
import { PairForm } from './pair-form';

/** /staff/pair: a device that is already paired goes on to sign-in. */
export async function StaffPairScreen({ code }: { code: string | undefined }) {
  if (await currentDevice()) redirect('/staff/login');
  const t = await getTranslations('staff.pair');
  return (
    <div className="flex flex-col gap-8">
      <AuthHeading icon={<MonitorSmartphone />} title={t('title')} description={t('description')} />
      <PairForm initialCode={code ?? ''} />
    </div>
  );
}

/** /staff/login: email sign-in on a paired device (ADR-0010 §8, Phase 1). */
export async function StaffLoginScreen() {
  const device = await currentDevice();
  if (!device) redirect('/staff/pair');
  const claims = await getSessionClaims();
  if (claims && (await activeStaffSession({ deviceId: device.id, userId: claims.sub }))) {
    redirect('/staff');
  }
  const t = await getTranslations('staff.login');
  return (
    <div className="flex flex-col gap-8">
      <AuthHeading
        title={t('title')}
        description={t('description', { device: device.label, venue: device.restaurantName })}
      />
      <LoginForm action={staffLogIn} compact />
    </div>
  );
}

/**
 * /staff: the staff home. Phase 1 shows the paired device and the session; the live service
 * screen (calls, bills, availability, push) replaces the body in P1-12.
 */
export async function StaffHomeScreen() {
  const { device, session } = await requireStaffPage();
  const t = await getTranslations('staff.home');
  const tRoles = await getTranslations('team.roles');
  const format = await getFormatter();
  return (
    <div className="flex flex-col gap-8">
      <AuthHeading
        icon={<CircleCheck />}
        title={t('title')}
        description={t('description', { device: device.label, role: tRoles(session.role) })}
      />
      <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-5">
        <p className="font-semibold text-foreground" dir="auto">
          {device.restaurantName}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('until', {
            time: format.dateTime(new Date(session.expiresAt), {
              weekday: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
          })}
        </p>
        <p className="text-sm text-muted-foreground">{t('next')}</p>
      </div>
      <form action={staffLogOut}>
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <LogOut aria-hidden="true" />
          {t('logout')}
        </Button>
      </form>
    </div>
  );
}
