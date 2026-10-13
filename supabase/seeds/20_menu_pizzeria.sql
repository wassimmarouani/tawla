-- Pizzeria Test menu (P1-01): a small second-tenant menu for isolation checks. Some slugs and
-- names deliberately match Café El Bahja ("eau", "soda") so leaks would be visible.

insert into public.categories (id, restaurant_id, name, icon, sort_order) values
  ('c2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000002',
   '{"fr": "Pizzas", "ar": "بيتزا", "en": "Pizzas"}'::jsonb, 'pizza', 10),
  ('c2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002',
   '{"fr": "Boissons", "ar": "مشروبات", "en": "Drinks"}'::jsonb, 'cup-soda', 20);

insert into public.products (
  restaurant_id, category_id, slug, name, price, allergens, dietary, sort_order
) values
  ('b0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000001', 'margherita',
   '{"fr": "Margherita", "ar": "مارغريتا", "en": "Margherita"}'::jsonb, 14000,
   '{gluten,milk}', '{vegetarian}', 10),
  ('b0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000001', 'neptune',
   '{"fr": "Neptune", "ar": "نبتون", "en": "Neptune"}'::jsonb, 17000,
   '{gluten,milk,fish}', '{}', 20),
  ('b0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'eau',
   '{"fr": "Eau minérale", "ar": "مياه معدنية", "en": "Still water"}'::jsonb, 2000, '{}', '{vegan}', 10),
  ('b0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'soda',
   '{"fr": "Soda", "ar": "مشروب غازي", "en": "Soft drink"}'::jsonb, 3500, '{}', '{vegan}', 20);
