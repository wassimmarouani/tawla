import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MenuEditorScreen } from '@/features/menu-editor';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.sections.menu');
  return { title: t('title') };
}

export default function DashboardMenuPage() {
  return <MenuEditorScreen />;
}
