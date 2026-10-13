import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionPlaceholder } from '@/features/backoffice';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.sections.team');
  return { title: t('title') };
}

export default function DashboardTeamPage() {
  return <SectionPlaceholder section="team" />;
}
