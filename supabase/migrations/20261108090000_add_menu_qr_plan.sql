-- ADR-0031: entry plan "Menu QR" — the digital menu and table QR codes only, no service
-- requests. Hypothesis price (spec 00 §4), to validate with pilot managers.
insert into public.plans (code, name, price_monthly, price_yearly, features, limits, ai_monthly_cap_millimes, ai_limits, sort_order) values
  (
    'menu_qr',
    '{"fr": "Menu QR", "ar": "قائمة QR", "en": "QR Menu"}',
    19000, 190000,
    array['menu', 'branding', 'multilingual', 'availability_toggle', 'ai_import', 'ai_translate', 'powered_by_badge'],
    '{"staff": 1, "tables": 40, "products": 300}',
    1000,
    '{"photo_imports": 1, "translated_items": 150}',
    0
  );
