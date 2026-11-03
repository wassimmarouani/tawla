import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TablesScreen } from '@/features/tables';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('dashboard.sections.tables');
  return { title: t('title') };
}

export default function DashboardTablesPage() {
  return <TablesScreen />;
}
