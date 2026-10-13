import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignUpForm } from '@/features/onboarding';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.meta');
  return { title: t('signup') };
}

export default function SignUpPage() {
  return <SignUpForm />;
}
