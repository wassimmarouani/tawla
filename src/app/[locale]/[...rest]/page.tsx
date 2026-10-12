import { notFound } from 'next/navigation';

/** Unmatched paths inside a locale render the localized not-found page. */
export default function CatchAllPage(): never {
  notFound();
}
