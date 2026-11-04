'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { EditorMedia } from '../queries/editor-menu';
import { saveVenueMedia } from '../server/actions';
import { ImageField } from './image-field';

export interface VenueMediaLabels {
  logo: string;
  logoHint: string;
  cover: string;
  coverHint: string;
  saved: string;
  failed: string;
}

/** Venue logo and cover (Settings, P1-14): each upload is linked and saved at once. */
export function VenueMediaForm({
  logo: initialLogo,
  cover: initialCover,
  storageUrl,
  labels,
}: {
  logo: EditorMedia | null;
  cover: EditorMedia | null;
  storageUrl: string;
  labels: VenueMediaLabels;
}) {
  const [logo, setLogo] = useState(initialLogo);
  const [cover, setCover] = useState(initialCover);

  const save = (next: { logo: EditorMedia | null; cover: EditorMedia | null }) => {
    void saveVenueMedia({
      logoMediaId: next.logo?.id ?? null,
      coverMediaId: next.cover?.id ?? null,
    }).then((result) => {
      if (result.ok) toast.success(labels.saved);
      else toast.error(labels.failed);
    });
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <ImageField
        kind="logo"
        label={labels.logo}
        hint={labels.logoHint}
        storageUrl={storageUrl}
        media={logo}
        onChange={(media) => {
          setLogo(media);
          save({ logo: media, cover });
        }}
      />
      <ImageField
        kind="cover"
        label={labels.cover}
        hint={labels.coverHint}
        storageUrl={storageUrl}
        media={cover}
        onChange={(media) => {
          setCover(media);
          save({ logo, cover: media });
        }}
      />
    </div>
  );
}
