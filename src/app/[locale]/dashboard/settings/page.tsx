import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SettingsScreen } from '@/features/settings';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.sections.settings');
  return { title: t('title') };
}

export default function DashboardSettingsPage() {
  return <SettingsScreen />;
}
