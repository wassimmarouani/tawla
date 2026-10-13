-- P1-03 — Media storage (ADR-0018): buckets, restaurant logo and cover, public menu images.
-- Uploads land in the private `uploads` bucket through signed URLs; the processing module
-- (src/server/admin/media) writes renditions to the public, immutable `media` bucket. Clients
-- have no storage policies: every write goes through the secret-key server module.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('uploads', 'uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('media', 'media', true, 5242880, array['image/avif', 'image/webp', 'image/png'])
on conflict (id) do nothing;

alter table public.restaurants
  add column logo_media_id uuid,
  add column cover_media_id uuid,
  add constraint restaurants_logo_media_fkey foreign key (id, logo_media_id)
    references public.media (restaurant_id, id) on delete set null (logo_media_id),
  add constraint restaurants_cover_media_fkey foreign key (id, cover_media_id)
    references public.media (restaurant_id, id) on delete set null (cover_media_id);

grant update (logo_media_id, cover_media_id) on public.restaurants to authenticated;

-- Same contract as P1-01, plus the restaurant's logo and cover.
create or replace function public.get_public_menu(p_slug text, p_locale text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r public.restaurants;
  locale text;
  menu jsonb;
begin
  select * into r
  from public.restaurants
  where slug = p_slug and deleted_at is null and status in ('active', 'read_only');
  if not found then
    return null;
  end if;

  locale := case when p_locale = any (r.locales) then p_locale else r.default_locale end;

  select coalesce(jsonb_agg(category.payload order by category.sort_order, category.id), '[]'::jsonb)
  into menu
  from (
    select c.sort_order, c.id, jsonb_build_object(
      'id', c.id,
      'name', public.i18n_pick(c.name, locale, r.default_locale),
      'icon', c.icon,
      'media', public.media_json(r.id, c.media_id),
      'availability', c.availability,
      'products', products.list
    ) as payload
    from public.categories c
    cross join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'slug', p.slug,
        'name', public.i18n_pick(p.name, locale, r.default_locale),
        'description', public.i18n_pick(p.description, locale, r.default_locale),
        'price', p.price,
        'media', public.media_json(r.id, p.media_id),
        'badges', to_jsonb(p.badges),
        'allergens', to_jsonb(p.allergens),
        'dietary', to_jsonb(p.dietary),
        'is_available', p.is_available,
        'version', p.version,
        -- Every language of the product and category names: search matches "capucin" in the
        -- Arabic UI and "قهوة" in the French one (ADR-0026 §5).
        'search', concat_ws(' ',
          p.name ->> 'fr', p.name ->> 'ar', p.name ->> 'en',
          c.name ->> 'fr', c.name ->> 'ar', c.name ->> 'en'),
        'option_groups', (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', g.id,
            'name', public.i18n_pick(g.name, locale, r.default_locale),
            'min_select', g.min_select,
            'max_select', g.max_select,
            'override_min_select', link.min_select,
            'override_max_select', link.max_select,
            'price_overrides', link.price_overrides,
            'options', (
              select coalesce(jsonb_agg(jsonb_build_object(
                'id', o.id,
                'name', public.i18n_pick(o.name, locale, r.default_locale),
                'price_delta', o.price_delta,
                'is_available', o.is_available,
                'version', o.version
              ) order by o.sort_order, o.id), '[]'::jsonb)
              from public.options o
              where o.restaurant_id = r.id and o.option_group_id = g.id and o.deleted_at is null
            )
          ) order by link.sort_order, g.id), '[]'::jsonb)
          from public.product_option_groups link
          join public.option_groups g
            on g.restaurant_id = link.restaurant_id and g.id = link.option_group_id
          where link.restaurant_id = r.id and link.product_id = p.id and g.deleted_at is null
        )
      ) order by p.sort_order, p.id) as list
      from public.products p
      where p.restaurant_id = r.id and p.category_id = c.id
        and p.is_visible and p.deleted_at is null
    ) as products
    where c.restaurant_id = r.id and c.is_visible and c.deleted_at is null
      and products.list is not null
  ) as category;

  return jsonb_build_object(
    'restaurant', jsonb_build_object(
      'public_id', r.public_id,
      'slug', r.slug,
      'name', r.name,
      'type', r.type,
      'status', r.status,
      'locale', locale,
      'default_locale', r.default_locale,
      'locales', to_jsonb(r.locales),
      'timezone', r.timezone,
      'currency', r.currency,
      'opening_schedule', r.opening_schedule,
      'manual_status', r.manual_status,
      'manual_status_until', r.manual_status_until,
      'theme', r.theme,
      'logo', public.media_json(r.id, r.logo_media_id),
      'cover', public.media_json(r.id, r.cover_media_id)
    ),
    'categories', menu
  );
end;
$$;
