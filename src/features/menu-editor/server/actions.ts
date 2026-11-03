'use server';

import { z } from 'zod';
import { AppError, validationError, type ActionResult } from '@/lib/errors';
import { storageConfig } from '@/server/admin/env';
import { MediaRejectedError } from '@/server/admin/media/process-image';
import { createUploadTicket, processUpload } from '@/server/admin/media/storage';
import { loadEditorMedia, type EditorMedia } from '../queries/editor-menu';
import {
  availabilitySchema,
  bulkPriceSchema,
  categoryInputSchema,
  idsSchema,
  processUploadSchema,
  productInputSchema,
  reorderProductsSchema,
  setPricesSchema,
  uploadKindSchema,
  visibilitySchema,
  type CategoryInput,
  type ProductInput,
} from '../schemas/menu-editor';
import type { PriceChange } from '../services/bulk-price';
import {
  adjustProductPrices,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProducts,
  duplicateProducts,
  reorderCategories,
  reorderProducts,
  restoreCategory,
  restoreProducts,
  setCategoryVisibility,
  setProductAvailability,
  setProductPrices,
  setProductsVisibility,
  updateCategory,
  updateProduct,
} from './mutations';
import { runEditorAction, withEditorAccess } from './scope';

/* Menu editor Server Actions (P1-05, spec 04). Each validates its input with Zod (rule 3). */

const idSchema = z.uuid();
const optionalIdSchema = idSchema.nullable();

export async function saveCategory(
  id: string | null,
  input: CategoryInput,
): Promise<ActionResult<{ id: string }>> {
  const target = optionalIdSchema.safeParse(id);
  if (!target.success) return validationError(target.error);
  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const categoryId = target.data;
  return runEditorAction('category.save', async (scope) => {
    if (categoryId === null) return { id: await createCategory(scope, parsed.data) };
    await updateCategory(scope, categoryId, parsed.data);
    return { id: categoryId };
  });
}

export async function setCategoryVisible(input: {
  id: string;
  visible: boolean;
}): Promise<ActionResult<void>> {
  const parsed = z.object({ id: idSchema, visible: z.boolean() }).safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('category.visibility', async (scope) => {
    await setCategoryVisibility(scope, parsed.data.id, parsed.data.visible);
  });
}

export async function removeCategory(id: string): Promise<ActionResult<void>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('category.delete', (scope) => deleteCategory(scope, parsed.data));
}

export async function undoRemoveCategory(id: string): Promise<ActionResult<void>> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('category.restore', (scope) => restoreCategory(scope, parsed.data));
}

export async function orderCategories(input: { ids: string[] }): Promise<ActionResult<void>> {
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('category.reorder', (scope) => reorderCategories(scope, parsed.data.ids));
}

export async function saveProduct(
  id: string | null,
  input: ProductInput,
): Promise<ActionResult<{ id: string }>> {
  const target = optionalIdSchema.safeParse(id);
  if (!target.success) return validationError(target.error);
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  const productId = target.data;
  return runEditorAction('product.save', async (scope) => {
    if (productId === null) return { id: await createProduct(scope, parsed.data) };
    await updateProduct(scope, productId, parsed.data);
    return { id: productId };
  });
}

export async function setAvailable(input: {
  id: string;
  available: boolean;
}): Promise<ActionResult<void>> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.availability', (scope) =>
    setProductAvailability(scope, parsed.data.id, parsed.data.available),
  );
}

/** Returns the ids whose visibility changed, for undo. */
export async function setVisible(input: {
  ids: string[];
  visible: boolean;
}): Promise<ActionResult<{ changed: string[] }>> {
  const parsed = visibilitySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.visibility', async (scope) => ({
    changed: await setProductsVisibility(scope, parsed.data.ids, parsed.data.visible),
  }));
}

export async function removeProducts(input: { ids: string[] }): Promise<ActionResult<void>> {
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.delete', (scope) => deleteProducts(scope, parsed.data.ids));
}

export async function undoRemoveProducts(input: { ids: string[] }): Promise<ActionResult<void>> {
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.restore', (scope) => restoreProducts(scope, parsed.data.ids));
}

export async function orderProducts(input: {
  categoryId: string;
  ids: string[];
}): Promise<ActionResult<void>> {
  const parsed = reorderProductsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.reorder', (scope) =>
    reorderProducts(scope, parsed.data.categoryId, parsed.data.ids),
  );
}

export async function duplicate(input: {
  ids: string[];
}): Promise<ActionResult<{ ids: string[] }>> {
  const parsed = idsSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.duplicate', async (scope) => ({
    ids: await duplicateProducts(scope, parsed.data.ids),
  }));
}

/** Bulk percentage change; returns the applied changes for the undo toast. */
export async function adjustPrices(input: {
  ids: string[];
  basisPoints: number;
  step: number;
}): Promise<ActionResult<{ changes: PriceChange[] }>> {
  const parsed = bulkPriceSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.bulk_price', async (scope) => ({
    changes: await adjustProductPrices(
      scope,
      parsed.data.ids,
      parsed.data.basisPoints,
      parsed.data.step,
    ),
  }));
}

/** Restores explicit prices (undo of a bulk change). */
export async function restorePrices(input: {
  prices: { id: string; price: number }[];
}): Promise<ActionResult<void>> {
  const parsed = setPricesSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return runEditorAction('product.restore_prices', (scope) =>
    setProductPrices(scope, parsed.data.prices),
  );
}

/** A one-time signed URL where the browser uploads the original image (ADR-0018). */
export async function requestImageUpload(
  kind: string,
): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  const parsed = uploadKindSchema.safeParse(kind);
  if (!parsed.success) return validationError(parsed.error);
  return withEditorAccess('media.ticket', async ({ restaurant }) => {
    const ticket = await createUploadTicket(storageConfig(), restaurant.id);
    return { path: ticket.path, signedUrl: ticket.signedUrl };
  });
}

/** Processes an uploaded original into renditions; rejected images get a reason key. */
export async function processImage(input: {
  path: string;
  kind: string;
}): Promise<ActionResult<{ media: EditorMedia }>> {
  const parsed = processUploadSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  return withEditorAccess('media.process', async ({ scope, restaurant }) => {
    let mediaId: string;
    try {
      mediaId = await processUpload(
        storageConfig(),
        restaurant.id,
        parsed.data.path,
        parsed.data.kind,
      );
    } catch (error) {
      if (error instanceof MediaRejectedError) {
        throw new AppError('VALIDATION_FAILED', error.message, { reason: `image_${error.reason}` });
      }
      throw error;
    }
    const media = await loadEditorMedia(scope.claims, restaurant.id, mediaId);
    if (!media) throw new AppError('INTERNAL', 'Processed media not readable');
    return { media };
  });
}
