import { DefaultMenuBody } from './default/default-menu';
import { ElBahjaMenuBody } from './el-bahja/el-bahja-menu';
import type { MenuTemplateId } from './ids';
import { MediterraneaMenuBody } from './mediterranea/mediterranea-menu';
import type { MenuTemplate } from './types';
import { VesuvioMenuBody } from './vesuvio/vesuvio-menu';

/**
 * Template engine (brief §6.1). A venue's `theme.template` (or a demo slug fallback) selects one
 * genuinely distinct template; anything unset falls back to the default layout. The shell
 * (`PublicMenuView`) stays the same for every template — only the body differs.
 */
const TEMPLATES: Readonly<Record<MenuTemplateId, MenuTemplate>> = {
  default: { id: 'default', Body: DefaultMenuBody },
  vesuvio: { id: 'vesuvio', Body: VesuvioMenuBody },
  'el-bahja': { id: 'el-bahja', Body: ElBahjaMenuBody },
  mediterranea: { id: 'mediterranea', Body: MediterraneaMenuBody },
};

export function templateById(id: MenuTemplateId): MenuTemplate {
  return TEMPLATES[id];
}
