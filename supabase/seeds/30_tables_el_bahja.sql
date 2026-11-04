-- Café El Bahja tables (P1-10): fixed QR tokens so `pnpm demo:info` can print table URLs.
-- Only this local seed bypasses the token trigger; the app never chooses tokens (P1-08).

alter table public.tables disable trigger tables_assign_token;

insert into public.tables (restaurant_id, number, token) values
  ('b0000000-0000-4000-8000-000000000001', 1, 'demoElBahjaTable-01xxx'),
  ('b0000000-0000-4000-8000-000000000001', 2, 'demoElBahjaTable-02xxx'),
  ('b0000000-0000-4000-8000-000000000001', 3, 'demoElBahjaTable-03xxx'),
  ('b0000000-0000-4000-8000-000000000001', 4, 'demoElBahjaTable-04xxx'),
  ('b0000000-0000-4000-8000-000000000001', 5, 'demoElBahjaTable-05xxx'),
  ('b0000000-0000-4000-8000-000000000001', 6, 'demoElBahjaTable-06xxx'),
  ('b0000000-0000-4000-8000-000000000001', 7, 'demoElBahjaTable-07xxx'),
  ('b0000000-0000-4000-8000-000000000001', 8, 'demoElBahjaTable-08xxx'),
  ('b0000000-0000-4000-8000-000000000001', 9, 'demoElBahjaTable-09xxx'),
  ('b0000000-0000-4000-8000-000000000001', 10, 'demoElBahjaTable-10xxx'),
  ('b0000000-0000-4000-8000-000000000001', 11, 'demoElBahjaTable-11xxx'),
  ('b0000000-0000-4000-8000-000000000001', 12, 'demoElBahjaTable-12xxx');

alter table public.tables enable trigger tables_assign_token;

-- Google review link offered after a 4–5 star rating (spec 02 "After service").
update public.restaurants
set settings = settings || '{"google_review_url": "https://g.page/r/demo-el-bahja/review"}'::jsonb
where id = 'b0000000-0000-4000-8000-000000000001';
