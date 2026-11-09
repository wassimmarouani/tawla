import 'server-only';

/** Re-export the public venue directory as a feature adapter (ADR-0003). */
export {
  DIRECTORY_CACHE_TAG,
  listPublicVenues,
  type DirectoryVenue,
} from '@/server/admin/public-directory';
