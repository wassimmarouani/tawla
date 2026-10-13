'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FieldControlProps } from '@/components/forms/form-field';
import { VENUE_TYPES, type VenueType } from '../schemas/venue';

interface VenueTypeSelectProps extends FieldControlProps {
  value: VenueType;
  onChange: (value: VenueType) => void;
  onBlur: () => void;
}

export function VenueTypeSelect({ value, onChange, onBlur, ...control }: VenueTypeSelectProps) {
  const t = useTranslations('onboarding.venueTypes');
  const items = VENUE_TYPES.map((type) => ({ value: type, label: t(type) }));
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        const type = VENUE_TYPES.find((candidate) => candidate === next);
        if (type) onChange(type);
      }}
      onOpenChange={(open) => {
        if (!open) onBlur();
      }}
    >
      <SelectTrigger className="w-full" {...control}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
