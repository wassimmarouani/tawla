import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/states/empty-state';
import { can } from '@/features/auth';
import { getTenantContext } from '@/features/tenancy';
import { getSessionClaims } from '@/lib/auth/session';
import { env } from '@/lib/env';
import { loadTeam } from '../server/team-data';
import { TeamEditor } from './team-editor';

/** /dashboard/team (P1-11): members and invitations, paired devices, active sessions. */
export async function TeamScreen() {
  const [claims, tenant] = await Promise.all([getSessionClaims(), getTenantContext()]);
  if (!claims || tenant.kind !== 'ok') return null;
  const { role, restaurant } = tenant.context;
  const t = await getTranslations('team');
  const tSection = await getTranslations('dashboard.sections.team');
  const header = <PageHeader title={tSection('title')} description={t('page.description')} />;
  // Permission checked before the privileged read (CLAUDE.md rule 10).
  if (!can(role, 'staff.manage') || restaurant.status !== 'active') {
    return (
      <div className="flex flex-col gap-8">
        {header}
        <EmptyState
          icon={<Lock />}
          title={restaurant.status === 'active' ? t('errors.forbidden') : t('errors.readOnly')}
          className="bg-card py-16"
        />
      </div>
    );
  }
  const team = await loadTeam(restaurant.id);
  return (
    <div className="flex flex-col gap-8">
      {header}
      <TeamEditor
        data={{
          members: team.members,
          invitations: team.invitations,
          devices: team.devices,
          sessions: team.sessions,
          seatsLeft: Number.isFinite(team.seats.left) ? team.seats.left : null,
          currentEmail: claims.email ?? null,
          appHost: env.APP_DOMAIN,
        }}
      />
    </div>
  );
}
