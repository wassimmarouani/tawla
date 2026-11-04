import 'server-only';
import { cacheLife, cacheTag } from 'next/cache';
import { z } from 'zod';
import { listPublicPlanRows } from '@/server/admin/public-plans';
import { publicPlanSchema, type PublicPlan } from '../schemas/plans';

/** Cache tag of the public plan catalogue: revalidate it when plans change. */
export const PLANS_CACHE_TAG = 'plans';

/** Public plans, validated and cached for hours (prices change rarely, by migration). */
export async function publicPlans(): Promise<PublicPlan[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(PLANS_CACHE_TAG);
  return z.array(publicPlanSchema).parse(await listPublicPlanRows());
}
