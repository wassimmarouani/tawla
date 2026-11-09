import { Bell, Inbox, Plus, ReceiptText, Search, Settings2, Trash2 } from 'lucide-react';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { EmptyState, ErrorState, LoadingRegion, OfflineBanner } from '@/components/states';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LOCALES } from '@/i18n/locales';
import { env } from '@/lib/env';
import { formatMoney } from '@/lib/money';
import { COLOR_TOKENS } from '@/styles/tokens';

/**
 * P0-07 component gallery (dev-only, ENABLE_DEV_ROUTES=true at build time).
 * /dev/design-system/{light|dark} — captured at 390 / 768 / 1440 in FR and AR.
 * Labels here are developer tooling, not product copy.
 */
const THEMES = ['light', 'dark'] as const;

export function generateStaticParams() {
  return THEMES.map((theme) => ({ theme }));
}

export const metadata = { robots: { index: false, follow: false } };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-title tracking-heading">{title}</h2>
      {children}
    </section>
  );
}

export default async function DesignSystemPage({
  params,
}: PageProps<'/[locale]/dev/design-system/[theme]'>) {
  if (!env.ENABLE_DEV_ROUTES) notFound();
  const { locale, theme } = await params;
  if (!hasLocale(LOCALES, locale) || !(THEMES as readonly string[]).includes(theme)) notFound();
  const t = await getTranslations({ locale, namespace: 'common.states' });

  return (
    <div data-theme={theme} className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:px-6">
        <header className="flex flex-col gap-2">
          <Badge variant="soft">ADR-0029 · Taply</Badge>
          <h1 className="text-3xl font-title tracking-title">Design system</h1>
          <p className="max-w-prose text-muted-foreground">
            Tokens, components and states. Every pair below is AA-checked in tokens.test.ts.
          </p>
        </header>

        <Section title="Colour tokens">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {COLOR_TOKENS.map((token) => (
              <li key={token} className="flex flex-col gap-1.5">
                <span
                  className="h-12 rounded-xs border border-border"
                  style={{ background: `var(--${token})` }}
                />
                <code className="truncate text-2xs text-muted-foreground">{token}</code>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Typography">
          <div className="flex flex-col gap-3">
            <p className="tabular text-display font-title tracking-title">9</p>
            <p className="text-4xl font-title tracking-title">Café El Bahja</p>
            <p className="text-2xl font-title tracking-heading">مقهى البهجة</p>
            <p className="text-xl font-title tracking-heading">01 Cafés & thés</p>
            <p className="text-base">
              Body 16 — Thé vert, menthe fraîche, pignons. شاي أخضر ونعناع طازج.
            </p>
            <p className="text-md font-semibold">
              Label 15 — Citronnade maison{' '}
              <span className="tabular">{formatMoney(3500, locale)}</span>
            </p>
            <p className="text-xs text-muted-foreground">Meta 13 — Ouvert · jusqu’à 23:00</p>
          </div>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <Plus /> Primary
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2 /> Delete
            </Button>
            <Button variant="destructive-soft">Cancel order</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button>Default 44</Button>
            <Button size="lg">Staff 48</Button>
            <Button size="icon" variant="outline" aria-label="Settings">
              <Settings2 />
            </Button>
            <Button shape="pill" variant="secondary">
              <Bell /> Appeler le serveur
            </Button>
            <Button shape="pill">
              <ReceiptText /> L’addition
            </Button>
          </div>
        </Section>

        <Section title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge>Nouveau</Badge>
            <Badge variant="soft">Populaire</Badge>
            <Badge variant="secondary">Café</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Servie</Badge>
            <Badge variant="warning">En attente</Badge>
            <Badge variant="destructive">Épicé</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </Section>

        <Section title="Forms">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-name">Nom du produit</Label>
              <Input id="ds-name" placeholder="Citronnade maison" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-price">Prix</Label>
              <Input id="ds-price" inputMode="decimal" defaultValue="3,500" aria-invalid />
              <p className="text-xs text-destructive-text">Trois décimales maximum.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-search">Recherche</Label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input id="ds-search" className="ps-10" placeholder="Rechercher…" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ds-category">Catégorie</Label>
              <Select defaultValue="cafes">
                <SelectTrigger id="ds-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cafes">Cafés & thés</SelectItem>
                  <SelectItem value="boissons">Boissons fraîches</SelectItem>
                  <SelectItem value="douceurs">Douceurs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="ds-note">Description</Label>
              <Textarea id="ds-note" placeholder="Citron pressé, menthe, glace pilée" />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <Label className="gap-3">
                <Checkbox defaultChecked /> Disponible
              </Label>
              <Label className="gap-3">
                <Switch defaultChecked /> Commandes activées
              </Label>
            </div>
            <RadioGroup defaultValue="cash" className="flex flex-wrap gap-6">
              <Label className="gap-3">
                <RadioGroupItem value="cash" /> Espèces
              </Label>
              <Label className="gap-3">
                <RadioGroupItem value="card" /> Carte
              </Label>
            </RadioGroup>
          </div>
        </Section>

        <Section title="Tabs, card, avatar">
          <Tabs defaultValue="menu">
            <TabsList>
              <TabsTrigger value="menu">Menu</TabsTrigger>
              <TabsTrigger value="tables">Tables</TabsTrigger>
              <TabsTrigger value="staff">Équipe</TabsTrigger>
            </TabsList>
            <TabsContent value="menu" className="pt-4">
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Café El Bahja</CardTitle>
                  <CardDescription>4 catégories · 14 produits · 3 langues</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>EB</AvatarFallback>
                  </Avatar>
                  <Separator orientation="vertical" className="h-8" />
                  <span className="text-sm text-muted-foreground">Mis à jour il y a 2 min</span>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                  <Button variant="ghost">Aperçu</Button>
                  <Button>Publier</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="States">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              icon={<Inbox />}
              title="Ajoutez votre première catégorie"
              description="Les catégories organisent votre menu : cafés, boissons, douceurs…"
              action={
                <Button>
                  <Plus /> Ajouter une catégorie
                </Button>
              }
            />
            <div className="flex flex-col gap-4">
              <ErrorState
                title={t('error.title')}
                description={t('error.description')}
                action={
                  <Button size="sm" variant="outline">
                    {t('error.retry')}
                  </Button>
                }
              />
              <OfflineBanner
                forceVisible
                title={t('offline.title')}
                description={t('offline.description')}
              />
              <LoadingRegion label={t('loading')} className="flex items-center gap-3">
                <Skeleton className="size-14 rounded-sm" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </LoadingRegion>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
}
