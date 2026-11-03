/** Editor list modes: browse (edit, toggle), select (bulk actions), reorder (drag handles). */
export type EditorMode = 'browse' | 'select' | 'reorder';

/** Product actions shared by rows and the bulk bar; each confirms with an undo toast. */
export interface ProductActions {
  duplicate: (ids: string[]) => void;
  setVisibility: (ids: string[], visible: boolean) => void;
  remove: (ids: string[]) => void;
}
