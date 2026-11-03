import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { MenuImportScreen } from '@/features/menu-editor';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('menuEditor.ai.import');
  return { title: t('title') };
}

export default function MenuImportPage() {
  return <MenuImportScreen />;
}
