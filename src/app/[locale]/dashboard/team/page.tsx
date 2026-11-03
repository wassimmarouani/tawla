import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TeamScreen } from '@/features/staff';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.sections.team');
  return { title: t('title') };
}

export default function DashboardTeamPage() {
  return <TeamScreen />;
}
