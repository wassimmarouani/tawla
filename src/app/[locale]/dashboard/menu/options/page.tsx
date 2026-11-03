import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OptionGroupsScreen } from '@/features/menu-editor';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('menuEditor.options');
  return { title: t('title') };
}

export default function OptionGroupsPage() {
  return <OptionGroupsScreen />;
}
