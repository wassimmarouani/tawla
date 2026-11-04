import type { ActionError } from '@/lib/errors';

export type AiErrorKey =
  'quota' | 'notConfigured' | 'refused' | 'invalid' | 'unavailable' | 'photos' | 'failed';

/** Message key (menuEditor.ai.errors.*) of an AI action failure. */
export function aiErrorKey(error: ActionError): AiErrorKey {
  switch (error.code) {
    case 'AI_QUOTA_EXCEEDED':
      return 'quota';
    case 'AI_REFUSED':
      return 'refused';
    case 'AI_INVALID_OUTPUT':
      return 'invalid';
    case 'AI_UNAVAILABLE':
      return error.details?.reason === 'notConfigured' ? 'notConfigured' : 'unavailable';
    case 'VALIDATION_FAILED':
      return error.details?.reason === 'photoCount' || error.details?.reason === 'photoType'
        ? 'photos'
        : 'failed';
    default:
      return 'failed';
  }
}
