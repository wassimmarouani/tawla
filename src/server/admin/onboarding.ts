import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { LOCALES } from '@/i18n/locales';
import { rawDb } from '@/lib/db/client';
import type { DbTransaction } from '@/lib/db/rls';
import {
  memberships,
  organizations,
  plans,
  reservedSlugs,
  restaurantType,
  restaurants,
  slugRedirects,
  subscriptions,
} from '@/lib/db/schema/schema';
import { RESERVED_SLUGS, SLUG_PATTERN } from '@/lib/tenancy/reserved-slugs';
import { writeAudit } from './audit';

/**
 * Venue creation at sign-up (P0-11, spec 04 step 1). Privileged: organizations, restaurants,
 * owner memberships and subscriptions have no client INSERT policy (ADR-0003).
 */
export const createVenueInputSchema = z.object({
  ownerId: z.uuid(),
  venueName: z.string().trim().min(1).max(120),
  venueType: z.enum(restaurantType.enumValues),
  locale: z.enum(LOCALES),
  /** Ordered candidates from the onboarding slug service; the first free one wins. */
  slugCandidates: z
    .array(
      z
        .string()
        .regex(SLUG_PATTERN)
        .refine((slug) => !RESERVED_SLUGS.has(slug), 'reserved slug'),
    )
    .min(1)
    .max(10),
});

export type CreateVenueInput = z.input<typeof createVenueInputSchema>;

export interface CreateVenueResult {
  restaurantId: string;
  slug: string;
  /** false when the owner already had a venue (double submit, retried confirmation). */
  created: boolean;
}

export class OnboardingError extends Error {
  constructor(readonly code: 'USER_NOT_FOUND' | 'EMAIL_NOT_CONFIRMED' | 'SLUG_UNAVAILABLE') {
    super(code);
    this.name = 'OnboardingError';
  }
}

const BASIC_PLAN = 'basic';

/**
 * Creates organization + restaurant + owner membership + Basic subscription + audit entry in
 * one transaction. Idempotent per owner: a second call returns the existing venue. A slug taken
 * concurrently by another sign-up is retried once with the remaining candidates.
 */
export async function createVenue(input: CreateVenueInput): Promise<CreateVenueResult> {
  const data = createVenueInputSchema.parse(input);
  try {
    return await createVenueOnce(data);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return createVenueOnce(data);
  }
}

async function createVenueOnce(
  data: z.output<typeof createVenueInputSchema>,
): Promise<CreateVenueResult> {
  return rawDb().transaction(async (tx) => {
    // Serializes concurrent submissions of the same owner (double click, two tabs).
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`onboarding:${data.ownerId}`}, 0))`,
    );

    const [owner] = await tx.execute<{ confirmed: boolean }>(
      sql`select email_confirmed_at is not null as confirmed from auth.users where id = ${data.ownerId}`,
    );
    if (!owner) throw new OnboardingError('USER_NOT_FOUND');
    if (!owner.confirmed) throw new OnboardingError('EMAIL_NOT_CONFIRMED');

    const [existing] = await tx
      .select({ restaurantId: restaurants.id, slug: restaurants.slug })
      .from(memberships)
      .innerJoin(restaurants, eq(restaurants.id, memberships.restaurantId))
      .where(
        and(
          eq(memberships.userId, data.ownerId),
          eq(memberships.role, 'owner'),
          isNull(restaurants.deletedAt),
        ),
      )
      .limit(1);
    if (existing) return { ...existing, created: false };

    const slug = await firstFreeSlug(tx, data.slugCandidates);
    const [plan] = await tx
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.code, BASIC_PLAN))
      .limit(1);
    if (!plan) throw new Error(`Plan "${BASIC_PLAN}" is missing`);

    const [organization] = await tx
      .insert(organizations)
      .values({ name: data.venueName })
      .returning({ id: organizations.id });
    if (!organization) throw new Error('Organization insert returned no row');

    const [restaurant] = await tx
      .insert(restaurants)
      .values({
        organizationId: organization.id,
        slug,
        name: data.venueName,
        type: data.venueType,
        defaultLocale: data.locale,
      })
      .returning({ id: restaurants.id });
    if (!restaurant) throw new Error('Restaurant insert returned no row');

    await tx
      .insert(memberships)
      .values({ restaurantId: restaurant.id, userId: data.ownerId, role: 'owner' });
    // Phase 1 billing is manual (spec 05): pilots start on an active Basic plan.
    await tx
      .insert(subscriptions)
      .values({ restaurantId: restaurant.id, planId: plan.id, status: 'active' });

    await writeAudit(
      {
        restaurantId: restaurant.id,
        actorId: data.ownerId,
        action: 'restaurant.create',
        entity: 'restaurant',
        entityId: restaurant.id,
        diff: { slug, type: data.venueType, plan: BASIC_PLAN },
      },
      tx,
    );
    return { restaurantId: restaurant.id, slug, created: true };
  });
}

async function firstFreeSlug(tx: DbTransaction, candidates: readonly string[]): Promise<string> {
  const list = [...candidates];
  const taken = new Set<string>();
  const queries = [
    tx.select({ slug: restaurants.slug }).from(restaurants).where(inArray(restaurants.slug, list)),
    tx
      .select({ slug: reservedSlugs.slug })
      .from(reservedSlugs)
      .where(inArray(reservedSlugs.slug, list)),
    tx
      .select({ slug: slugRedirects.oldSlug })
      .from(slugRedirects)
      .where(inArray(slugRedirects.oldSlug, list)),
  ];
  for (const rows of await Promise.all(queries)) for (const row of rows) taken.add(row.slug);
  const free = list.find((candidate) => !taken.has(candidate));
  if (!free) throw new OnboardingError('SLUG_UNAVAILABLE');
  return free;
}

function isUniqueViolation(error: unknown): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ((current as Error & { code?: unknown }).code === '23505') return true;
  }
  return false;
}
