-- Media storage (P1-03, ADR-0018): buckets and restaurant images.
-- Tables covered: public.media, public.restaurants
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select is((select public from storage.buckets where id = 'uploads'), false, 'uploads bucket is private');
select is((select public from storage.buckets where id = 'media'), true, 'media bucket is public (immutable renditions)');
select is((select file_size_limit from storage.buckets where id = 'uploads'), 5242880::bigint, 'uploads are capped at 5 MB');
select ok(
  not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
              and (qual like '%uploads%' or qual like '%''media''%' or with_check like '%media%')),
  'no client storage policy touches the menu buckets');

insert into public.organizations (id, name) values
  ('16000000-0000-4000-8000-00000000000a', 'Org A'), ('16000000-0000-4000-8000-00000000000b', 'Org B');
insert into public.restaurants (id, organization_id, slug, name) values
  ('26000000-0000-4000-8000-00000000000a', '16000000-0000-4000-8000-00000000000a', 'media-a', 'A'),
  ('26000000-0000-4000-8000-00000000000b', '16000000-0000-4000-8000-00000000000b', 'media-b', 'B');
insert into public.media (id, restaurant_id, kind, base_path, width, height) values
  ('96000000-0000-4000-8000-0000000000a1', '26000000-0000-4000-8000-00000000000a', 'cover', 'r/a/0123456789abcdef', 1280, 720),
  ('96000000-0000-4000-8000-0000000000b1', '26000000-0000-4000-8000-00000000000b', 'cover', 'r/b/0123456789abcdef', 1280, 720);

select throws_ok(
  $$ update public.restaurants set cover_media_id = '96000000-0000-4000-8000-0000000000b1'
     where id = '26000000-0000-4000-8000-00000000000a' $$,
  '23503', null, 'a restaurant cannot use another tenant''s image');
select lives_ok(
  $$ update public.restaurants set cover_media_id = '96000000-0000-4000-8000-0000000000a1'
     where id = '26000000-0000-4000-8000-00000000000a' $$,
  'a restaurant uses its own image as cover');
delete from public.media where id = '96000000-0000-4000-8000-0000000000a1';
select is(
  (select cover_media_id from public.restaurants where id = '26000000-0000-4000-8000-00000000000a'),
  null, 'deleting the image clears the cover, nothing else');

select * from finish();
rollback;
