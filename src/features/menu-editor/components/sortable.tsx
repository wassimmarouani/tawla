'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SortableListProps {
  ids: readonly string[];
  /** Name read to screen readers while moving. */
  labelOf: (id: string) => string;
  onReorder: (ids: string[]) => void;
  children: ReactNode;
}

/**
 * Vertical drag-and-drop list (dnd-kit): pointer and keyboard (Space, arrows, Space or Escape),
 * with announcements in the interface language.
 */
export function SortableList({ ids, labelOf, onReorder, children }: SortableListProps) {
  const t = useTranslations('menuEditor.dnd');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const name = (id: UniqueIdentifier) => labelOf(String(id));
  const position = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t('picked', { name: name(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('over', { name: name(active.id), position: position(over.id), total: ids.length })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('dropped', { name: name(active.id), position: position(over.id), total: ids.length })
        : undefined,
    onDragCancel: ({ active }) => t('cancelled', { name: name(active.id) }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements, screenReaderInstructions: { draggable: t('instructions') } }}
      onDragEnd={({ active, over }) => {
        if (!over || active.id === over.id) return;
        const from = ids.indexOf(String(active.id));
        const to = ids.indexOf(String(over.id));
        if (from === -1 || to === -1) return;
        onReorder(arrayMove([...ids], from, to));
      }}
    >
      <SortableContext items={[...ids]} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

/** Sortable item wiring: node ref and style for the row, props for its drag handle. */
export function useSortableItem(id: string, enabled: boolean) {
  const t = useTranslations('menuEditor.dnd');
  const sortable = useSortable({
    id,
    disabled: !enabled,
    attributes: { roleDescription: t('roleDescription') },
  });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };
  // Flat fields under non-ref names: the React Compiler treats `*Ref` identifiers, and objects
  // used as refs, as refs, and refuses reading them during render.
  return {
    attachNode: sortable.setNodeRef,
    style,
    isDragging: sortable.isDragging,
    attachHandle: sortable.setActivatorNodeRef,
    handleProps: { ...sortable.attributes, ...sortable.listeners },
  };
}

type SortableItem = ReturnType<typeof useSortableItem>;

/** Grip button that starts a drag (pointer) or a keyboard move (Space). */
export function DragHandle({
  label,
  attach,
  handleProps,
}: {
  label: string;
  attach: SortableItem['attachHandle'];
  handleProps: SortableItem['handleProps'];
}) {
  return (
    <button
      type="button"
      aria-label={label}
      ref={attach}
      {...handleProps}
      className={cn(
        'grid size-target shrink-0 cursor-grab touch-none place-items-center rounded-xs text-muted-foreground',
        'outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
      )}
    >
      <GripVertical aria-hidden="true" className="size-5" />
    </button>
  );
}
