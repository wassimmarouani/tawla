import { describe, expect, it } from 'vitest';
import { restaurantType } from '@/lib/db/schema/schema';
import { VENUE_TYPES, venueSchema } from './venue';

describe('venueSchema', () => {
  it('mirrors the restaurant_type database enum', () => {
    expect([...VENUE_TYPES]).toEqual(restaurantType.enumValues);
  });

  it('trims the name and accepts every venue type', () => {
    for (const venueType of VENUE_TYPES) {
      expect(venueSchema.parse({ venueName: '  Café El Bahja ', venueType })).toEqual({
        venueName: 'Café El Bahja',
        venueType,
      });
    }
  });

  it('reports message keys', () => {
    const result = venueSchema.safeParse({ venueName: ' ', venueType: 'bar' });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => [issue.path[0], issue.message])).toEqual([
      ['venueName', 'required'],
      ['venueType', 'required'],
    ]);
    const long = venueSchema.safeParse({ venueName: 'x'.repeat(121), venueType: 'cafe' });
    expect(long.error?.issues[0]?.message).toBe('tooLong');
  });
});
