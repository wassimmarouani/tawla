-- ADR-0031 amendment (2026-11-04): Menu QR is a one-time purchase (menu online + printed,
-- laminated QR codes), with menu changes made by Taply on request. No subscription.
alter table public.plans
  add column price_once integer check (price_once >= 0);

comment on column public.plans.price_once is
  'One-time price in millimes (no subscription when set; price_monthly/yearly are then 0).';

update public.plans
set price_once = 200000, price_monthly = 0, price_yearly = 0
where code = 'menu_qr';
