import { z } from 'zod';
import { FEATURE_KEYS } from './features';

export const featureKeySchema = z.enum(FEATURE_KEYS);

/** `restaurants.settings.features`: switches that may only disable a plan feature. */
export const featureSettingsSchema = z
  .object({ features: z.partialRecord(featureKeySchema, z.boolean()).default({}) })
  .catch({ features: {} });
