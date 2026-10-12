import { env } from '@/lib/env';

// Placeholder until the marketing pages (P1-16). The brand name is not translatable copy.
export default function HomePage() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <h1 className="text-4xl font-semibold tracking-tight">{env.NEXT_PUBLIC_APP_NAME}</h1>
    </main>
  );
}
