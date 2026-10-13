import { MailCheck, Unlink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { ConfirmLinkForm } from '@/components/forms/confirm-link-form';
import { Button } from '@/components/ui/button';
import { tokenHashSchema } from '@/features/auth';
import type { ActionResult } from '@/lib/errors';
import { AuthHeading } from './auth-heading';

interface EmailLinkPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  title: string;
  description: string;
  submitLabel: string;
  action: (tokenHash: string) => Promise<ActionResult>;
}

/**
 * Landing page of an email link (sign-up confirmation, password recovery). The GET only shows
 * a button; the token is exchanged by the Server Action on click (CLAUDE.md rule 14).
 */
export async function EmailLinkPage({
  searchParams,
  title,
  description,
  submitLabel,
  action,
}: EmailLinkPageProps) {
  const t = await getTranslations('auth.confirm');
  const token = tokenHashSchema.safeParse((await searchParams).token_hash);

  if (!token.success) {
    return (
      <div className="flex flex-col gap-8">
        <AuthHeading
          icon={<Unlink />}
          title={t('invalidTitle')}
          description={t('invalidDescription')}
        />
        <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
          {t('toLogin')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <AuthHeading icon={<MailCheck />} title={title} description={description} />
      <ConfirmLinkForm action={action} tokenHash={token.data} submitLabel={submitLabel} />
    </div>
  );
}
