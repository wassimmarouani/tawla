import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SectionPlaceholder } from '@/features/backoffice';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.sections.menu');
  return { title: t('title') };
}

export default function DashboardMenuPage() {
  return <SectionPlaceholder section="menu" />;
}
