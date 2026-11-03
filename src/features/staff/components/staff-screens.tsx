import { MonitorSmartphone } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AuthHeading } from '@/components/layout/auth-heading';
import { LoginForm } from '@/features/auth';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { activeStaffSession, currentDevice, requireStaffPage } from '../server/context';
import { staffLogIn } from '../server/staff-actions';
import { PairForm } from './pair-form';
import { StaffLive } from './staff-live';

/** /staff/pair: a device that is already paired goes on to sign-in. */
export async function StaffPairScreen({ code }: { code: string | undefined }) {
  if (await currentDevice()) redirect('/staff/login');
  const t = await getTranslations('staff.pair');
  return (
    <div className="m-auto flex w-full max-w-sm flex-col gap-8">
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
    <div className="m-auto flex w-full max-w-sm flex-col gap-8">
      <AuthHeading
        title={t('title')}
        description={t('description', { device: device.label, venue: device.restaurantName })}
      />
      <LoginForm action={staffLogIn} compact />
    </div>
  );
}

/** /staff: the live service screen (P1-12) on a paired device with a live staff session. */
export async function StaffHomeScreen() {
  const { device, claims, session } = await requireStaffPage();
  const tRoles = await getTranslations('team.roles');
  const t = await getTranslations('staff.live');
  return (
    <StaffLive
      restaurantId={device.restaurantId}
      userId={claims.sub}
      deviceMode={device.mode}
      heading={device.restaurantName}
      subheading={t('signedIn', { device: device.label, role: tRoles(session.role) })}
      realtime={{
        url: env.NEXT_PUBLIC_SUPABASE_URL,
        publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      }}
      vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
    />
  );
}
