import type { getTranslations } from 'next-intl/server';
import type { ComponentType } from 'react';
import type { Locale } from '@/i18n/locales';
import type { PublicMenu } from '../schemas/public-menu';
import type { MenuTemplateId } from './ids';

/** The `client` namespace translator, shared by every template body. */
export type MenuTranslator = Awaited<ReturnType<typeof getTranslations<'client'>>>;

/**
 * Props the headless shell (`PublicMenuView`) hands to a template body. The shell owns the
 * invisible/infra layer — tenant + theme wrapper, brand resolver, variant fonts, realtime
 * availability, header, powered-by badge and the service bar — so each template body only decides
 * how the *menu content* is structured and styled (brief §6.1: shared code lives in the engine and
 * invisible primitives; everything visible is the template's own).
 */
export interface MenuTemplateProps {
  menu: PublicMenu;
  locale: Locale;
  /** Pre-resolved `client` translator, so a body can stay a plain (non-async) component. */
  t: MenuTranslator;
}

/**
 * A menu template: one genuinely distinct customer-facing layout (brief §6.2 MATRIX). The engine
 * selects one per venue from its `variant`. The body is rendered inside the shared shell.
 */
export interface MenuTemplate {
  /** Stable id, also emitted as `data-template` so the palette scope in globals.css can target it. */
  id: MenuTemplateId;
  /** The content layer (categories → sections). Server component; receives a resolved translator. */
  Body: ComponentType<MenuTemplateProps>;
}
