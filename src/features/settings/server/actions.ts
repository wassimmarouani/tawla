'use server';

import { refresh, updateTag } from 'next/cache';
import type { z } from 'zod';
import { withBackofficeAccess } from '@/features/backoffice';
import { menuCacheTags } from '@/features/menu';
import { validationError, type ActionResult } from '@/lib/errors';
import {
  appearanceSchema,
  hoursSchema,
  languagesSchema,
  linksSchema,
  manualStatusInputSchema,
  serviceSettingsSchema,
  venueInfoSchema,
  type Appearance,
  type Hours,
  type Languages,
  type Links,
  type ManualStatusInput,
  type ServiceSettings,
  type VenueInfo,
} from '../schemas/settings';
import {
  saveAppearance,
  saveHours,
  saveLanguages,
  saveLinks,
  saveManualStatus,
  saveServiceSettings,
  saveVenueInfo,
  type SettingsScope,
} from './mutations';

/* Settings Server Actions (P1-14): settings.edit, then the customer menu cache is invalidated. */

function settingsAction<S extends z.ZodType>(
  schema: S,
  operation: string,
  write: (scope: SettingsScope, values: z.output<S>) => Promise<void>,
) {
  return async (input: z.input<S>): Promise<ActionResult> => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    return withBackofficeAccess('settings.edit', operation, async ({ scope, restaurant }) => {
      await write(scope, parsed.data);
      for (const tag of menuCacheTags(restaurant.slug, restaurant.publicId)) updateTag(tag);
      refresh();
      return undefined;
    });
  };
}

const venueAction = settingsAction(venueInfoSchema, 'settings.venue', saveVenueInfo);
const hoursAction = settingsAction(hoursSchema, 'settings.hours', saveHours);
const statusAction = settingsAction(manualStatusInputSchema, 'settings.status', saveManualStatus);
const languagesAction = settingsAction(languagesSchema, 'settings.languages', saveLanguages);
const appearanceAction = settingsAction(appearanceSchema, 'settings.appearance', saveAppearance);
const linksAction = settingsAction(linksSchema, 'settings.links', saveLinks);
const serviceAction = settingsAction(
  serviceSettingsSchema,
  'settings.service',
  saveServiceSettings,
);

export async function updateVenueInfo(input: VenueInfo): Promise<ActionResult> {
  return venueAction(input);
}
export async function updateHours(input: Hours): Promise<ActionResult> {
  return hoursAction(input);
}
export async function updateManualStatus(input: ManualStatusInput): Promise<ActionResult> {
  return statusAction(input);
}
export async function updateLanguages(input: Languages): Promise<ActionResult> {
  return languagesAction(input);
}
export async function updateAppearance(input: Appearance): Promise<ActionResult> {
  return appearanceAction(input);
}
export async function updateLinks(input: Links): Promise<ActionResult> {
  return linksAction(input);
}
export async function updateServiceSettings(input: ServiceSettings): Promise<ActionResult> {
  return serviceAction(input);
}
