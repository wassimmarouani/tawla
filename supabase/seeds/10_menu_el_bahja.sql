-- Café El Bahja demo menu (P1-01): 9 categories, 43 products in FR/AR/EN; reusable option
-- groups with per-product overrides (size price, flavour counts), allergens, dietary flags,
-- badges, 3 unavailable products and 1 hidden one. Photos arrive with the media pipeline (P1-03).
-- "Nos incontournables" groups the photographed dishes: a photo grid first, printed lists after.
-- Generated content with fixed ids: categories c1…, option groups e1…, options f1….

insert into public.categories (id, restaurant_id, name, icon, sort_order) values
  ('c1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Nos incontournables", "ar": "أطباقنا المميزة", "en": "Our signatures"}'::jsonb, 'star', 10),
  ('c1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Cafés", "ar": "القهوة", "en": "Coffee"}'::jsonb, 'coffee', 20),
  ('c1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Thés & infusions", "ar": "الشاي والمشروبات العشبية", "en": "Teas & infusions"}'::jsonb, 'leaf', 30),
  ('c1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Boissons fraîches", "ar": "مشروبات باردة", "en": "Cold drinks"}'::jsonb, 'glass-water', 40),
  ('c1000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Petit-déjeuner", "ar": "فطور الصباح", "en": "Breakfast"}'::jsonb, 'croissant', 50),
  ('c1000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Douceurs tunisiennes", "ar": "حلويات تونسية", "en": "Tunisian sweets"}'::jsonb, 'cake-slice', 60),
  ('c1000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Crêpes & gaufres", "ar": "كريب ووافل", "en": "Crêpes & waffles"}'::jsonb, 'cookie', 70),
  ('c1000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Salé", "ar": "مأكولات مالحة", "en": "Savoury"}'::jsonb, 'utensils', 80),
  ('c1000000-0000-4000-8000-000000000009', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Glaces", "ar": "مثلجات", "en": "Ice cream"}'::jsonb, 'ice-cream-cone', 90);

insert into public.products (
  restaurant_id, category_id, slug, name, description, price, badges, allergens, dietary,
  is_available, is_visible, sort_order
) values
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'express', '{"fr": "Express", "ar": "إكسبريس", "en": "Espresso"}'::jsonb, '{}'::jsonb, 1800, '{}'::text[], '{}'::text[], '{}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'direct', '{"fr": "Direct", "ar": "قهوة ديراكت", "en": "Direct (milky coffee)"}'::jsonb, '{"fr": "Café au lait servi dans un grand verre, à la tunisienne.", "ar": "قهوة بالحليب تقدّم في كأس كبيرة على الطريقة التونسية.", "en": "Coffee with steamed milk in a tall glass, Tunisian style."}'::jsonb, 2800, '{}'::text[], '{milk}'::text[], '{}'::text[], true, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'capucin', '{"fr": "Capucin", "ar": "كابوسان", "en": "Capucin"}'::jsonb, '{"fr": "Express allongé d’un nuage de lait mousseux.", "ar": "إكسبريس مع لمسة من رغوة الحليب.", "en": "Espresso topped with a cloud of milk foam."}'::jsonb, 2200, '{popular}'::text[], '{milk}'::text[], '{}'::text[], true, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'cafe-turc', '{"fr": "Café turc", "ar": "قهوة تركية", "en": "Turkish coffee"}'::jsonb, '{}'::jsonb, 2500, '{}'::text[], '{}'::text[], '{}'::text[], true, true, 40),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'americano', '{"fr": "Américain", "ar": "أمريكانو", "en": "Americano"}'::jsonb, '{}'::jsonb, 3000, '{}'::text[], '{}'::text[], '{}'::text[], true, true, 50),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'cappuccino', '{"fr": "Cappuccino", "ar": "كابتشينو", "en": "Cappuccino"}'::jsonb, '{}'::jsonb, 4000, '{}'::text[], '{milk}'::text[], '{}'::text[], true, true, 60),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000002', 'latte', '{"fr": "Café latte", "ar": "لاتيه", "en": "Caffè latte"}'::jsonb, '{}'::jsonb, 4500, '{}'::text[], '{milk}'::text[], '{}'::text[], true, true, 70),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'the-menthe', '{"fr": "Thé à la menthe", "ar": "شاي بالنعناع", "en": "Mint tea"}'::jsonb, '{}'::jsonb, 2000, '{house}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'the-pignons', '{"fr": "Thé aux pignons", "ar": "شاي بالصنوبر", "en": "Pine nut tea"}'::jsonb, '{"fr": "Thé à la menthe, pignons de pin grillés.", "ar": "شاي بالنعناع مع حبوب الصنوبر المحمّصة.", "en": "Mint tea with toasted pine nuts."}'::jsonb, 6500, '{house}'::text[], '{nuts}'::text[], '{vegan}'::text[], true, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'the-vert', '{"fr": "Thé vert", "ar": "شاي أخضر", "en": "Green tea"}'::jsonb, '{}'::jsonb, 2000, '{}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'verveine', '{"fr": "Verveine", "ar": "لويزة", "en": "Lemon verbena"}'::jsonb, '{}'::jsonb, 2500, '{}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 40),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003', 'the-saison', '{"fr": "Thé de saison", "ar": "شاي الموسم", "en": "Seasonal tea"}'::jsonb, '{}'::jsonb, 3500, '{seasonal}'::text[], '{}'::text[], '{vegan}'::text[], true, false, 50),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'citronnade', '{"fr": "Citronnade", "ar": "عصير الليمون", "en": "Tunisian lemonade"}'::jsonb, '{"fr": "Citron pressé, zeste et sucre, mixés minute.", "ar": "ليمون معصور مع القشر والسكر، يُحضّر عند الطلب.", "en": "Whole lemons blended with zest and sugar, made to order."}'::jsonb, 4500, '{popular}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'jus-orange', '{"fr": "Jus d’orange pressé", "ar": "عصير برتقال طازج", "en": "Fresh orange juice"}'::jsonb, '{}'::jsonb, 5000, '{}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'jus-fraise', '{"fr": "Jus de fraise", "ar": "عصير الفراولة", "en": "Strawberry juice"}'::jsonb, '{}'::jsonb, 6000, '{seasonal}'::text[], '{milk}'::text[], '{vegetarian}'::text[], false, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'smoothie', '{"fr": "Smoothie banane-dattes", "ar": "سموذي موز وتمر", "en": "Banana & date smoothie"}'::jsonb, '{}'::jsonb, 8500, '{new}'::text[], '{milk}'::text[], '{vegetarian}'::text[], true, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'mojito', '{"fr": "Mojito sans alcool", "ar": "موهيتو بدون كحول", "en": "Virgin mojito"}'::jsonb, '{}'::jsonb, 8000, '{new}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 40),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'eau', '{"fr": "Eau minérale 0,5 L", "ar": "مياه معدنية 0.5 ل", "en": "Still water 0.5 L"}'::jsonb, '{}'::jsonb, 1500, '{}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 50),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000004', 'soda', '{"fr": "Boisson gazeuse", "ar": "مشروب غازي", "en": "Soft drink"}'::jsonb, '{}'::jsonb, 3000, '{}'::text[], '{}'::text[], '{vegan}'::text[], true, true, 60),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005', 'formule-tunisienne', '{"fr": "Petit-déjeuner tunisien", "ar": "فطور تونسي", "en": "Tunisian breakfast"}'::jsonb, '{"fr": "Boisson chaude, jus d’orange, bsissa, œuf, tabouna, huile d’olive.", "ar": "مشروب ساخن، عصير برتقال، بسيسة، بيضة، خبز طابونة وزيت زيتون.", "en": "Hot drink, orange juice, bsissa, egg, tabouna bread, olive oil."}'::jsonb, 12000, '{popular}'::text[], '{gluten,eggs,sesame}'::text[], '{vegetarian}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'croissant', '{"fr": "Croissant", "ar": "كرواسون", "en": "Croissant"}'::jsonb, '{}'::jsonb, 2500, '{}'::text[], '{gluten,milk,eggs}'::text[], '{vegetarian}'::text[], true, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005', 'pain-chocolat', '{"fr": "Pain au chocolat", "ar": "خبز بالشوكولاتة", "en": "Pain au chocolat"}'::jsonb, '{}'::jsonb, 2800, '{}'::text[], '{gluten,milk,eggs}'::text[], '{vegetarian}'::text[], true, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005', 'tartine', '{"fr": "Tartine beurre-confiture", "ar": "خبز بالزبدة والمربى", "en": "Bread, butter & jam"}'::jsonb, '{}'::jsonb, 4000, '{}'::text[], '{gluten,milk}'::text[], '{vegetarian}'::text[], true, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005', 'omelette', '{"fr": "Omelette fromage", "ar": "عجة بالجبن", "en": "Cheese omelette"}'::jsonb, '{}'::jsonb, 7000, '{}'::text[], '{eggs,milk}'::text[], '{vegetarian,gluten_free}'::text[], true, true, 40),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000006', 'bambalouni', '{"fr": "Bambalouni", "ar": "بمبالوني", "en": "Bambalouni (Tunisian doughnut)"}'::jsonb, '{"fr": "Beignet de Sidi Bou Saïd saupoudré de sucre.", "ar": "فطيرة سيدي بوسعيد المقلية مع السكر.", "en": "Sidi Bou Said fried doughnut dusted with sugar."}'::jsonb, 2500, '{popular}'::text[], '{gluten}'::text[], '{vegetarian}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'makroudh', '{"fr": "Makroudh", "ar": "مقروض", "en": "Makroudh"}'::jsonb, '{"fr": "Semoule, pâte de dattes, miel.", "ar": "سميد، عجينة التمر، عسل.", "en": "Semolina, date paste, honey."}'::jsonb, 1500, '{}'::text[], '{gluten}'::text[], '{vegetarian}'::text[], true, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000006', 'baklawa', '{"fr": "Baklawa", "ar": "بقلاوة", "en": "Baklava"}'::jsonb, '{}'::jsonb, 3500, '{}'::text[], '{gluten,nuts,milk}'::text[], '{vegetarian}'::text[], false, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000006', 'kaak-warka', '{"fr": "Kaak warka", "ar": "كعك ورقة", "en": "Kaak warka"}'::jsonb, '{}'::jsonb, 2000, '{}'::text[], '{gluten,nuts}'::text[], '{vegetarian}'::text[], true, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000006', 'zlabia', '{"fr": "Zlabia", "ar": "زلابية", "en": "Zlabia"}'::jsonb, '{}'::jsonb, 1500, '{}'::text[], '{gluten}'::text[], '{vegetarian}'::text[], true, true, 40),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000007', 'crepe-sucre', '{"fr": "Crêpe au sucre", "ar": "كريب بالسكر", "en": "Sugar crêpe"}'::jsonb, '{}'::jsonb, 5000, '{}'::text[], '{gluten,milk,eggs}'::text[], '{vegetarian}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'crepe-chocolat', '{"fr": "Crêpe chocolat", "ar": "كريب بالشوكولاتة", "en": "Chocolate crêpe"}'::jsonb, '{}'::jsonb, 7500, '{popular}'::text[], '{gluten,milk,eggs}'::text[], '{vegetarian}'::text[], true, true, 40),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000007', 'crepe-nutella-banane', '{"fr": "Crêpe Nutella banane", "ar": "كريب نوتيلا وموز", "en": "Nutella & banana crêpe"}'::jsonb, '{}'::jsonb, 9500, '{}'::text[], '{gluten,milk,eggs,nuts}'::text[], '{vegetarian}'::text[], true, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000007', 'gaufre', '{"fr": "Gaufre chocolat", "ar": "وافل بالشوكولاتة", "en": "Chocolate waffle"}'::jsonb, '{}'::jsonb, 8000, '{}'::text[], '{gluten,milk,eggs}'::text[], '{vegetarian}'::text[], false, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'ojja', '{"fr": "Ojja merguez", "ar": "عجة بالمرقاز", "en": "Ojja with merguez"}'::jsonb, '{"fr": "Œufs pochés dans une sauce tomate-piment, merguez.", "ar": "بيض مطهو في صلصة الطماطم والفلفل الحار مع المرقاز.", "en": "Eggs poached in a spicy tomato-pepper sauce, merguez."}'::jsonb, 14000, '{popular}'::text[], '{eggs,gluten}'::text[], '{spicy}'::text[], true, true, 50),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000008', 'brik', '{"fr": "Brik à l’œuf", "ar": "بريك بالبيض", "en": "Egg brik"}'::jsonb, '{"fr": "Feuille de malsouka, œuf, thon, persil, câpres.", "ar": "ورقة ملسوقة، بيض، تن، معدنوس، كبار.", "en": "Malsouka pastry, egg, tuna, parsley, capers."}'::jsonb, 4500, '{}'::text[], '{gluten,eggs,fish}'::text[], '{}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000008', 'sandwich-tunisien', '{"fr": "Sandwich tunisien", "ar": "سندويتش تونسي", "en": "Tunisian sandwich"}'::jsonb, '{"fr": "Thon, œuf, olives, harissa, méchouia, pommes de terre.", "ar": "تن، بيض، زيتون، هريسة، مشوية، بطاطا.", "en": "Tuna, egg, olives, harissa, grilled-pepper salad, potatoes."}'::jsonb, 7500, '{}'::text[], '{gluten,eggs,fish}'::text[], '{spicy}'::text[], true, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'fricasse', '{"fr": "Fricassé", "ar": "فريكاسي", "en": "Fricassé"}'::jsonb, '{}'::jsonb, 2500, '{}'::text[], '{gluten,eggs,fish}'::text[], '{}'::text[], true, true, 60),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000008', 'chapati', '{"fr": "Chapati thon-fromage", "ar": "شباتي تن وجبن", "en": "Tuna & cheese chapati"}'::jsonb, '{}'::jsonb, 8000, '{new}'::text[], '{gluten,eggs,fish,milk}'::text[], '{}'::text[], true, true, 30),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000008', 'lablabi', '{"fr": "Lablabi", "ar": "لبلابي", "en": "Lablabi (chickpea soup)"}'::jsonb, '{}'::jsonb, 6000, '{}'::text[], '{gluten}'::text[], '{vegan,spicy}'::text[], true, true, 40),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000008', 'mechouia', '{"fr": "Salade méchouia", "ar": "سلطة مشوية", "en": "Méchouia salad"}'::jsonb, '{}'::jsonb, 9000, '{}'::text[], '{eggs,fish}'::text[], '{gluten_free,spicy}'::text[], true, true, 50),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000009', 'coupe-2', '{"fr": "Coupe 2 boules", "ar": "كأس بكرتين", "en": "Two-scoop cup"}'::jsonb, '{}'::jsonb, 6000, '{}'::text[], '{milk}'::text[], '{vegetarian,gluten_free}'::text[], true, true, 10),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000009', 'coupe-3', '{"fr": "Coupe 3 boules", "ar": "كأس بثلاث كرات", "en": "Three-scoop cup"}'::jsonb, '{}'::jsonb, 8500, '{}'::text[], '{milk}'::text[], '{vegetarian,gluten_free}'::text[], true, true, 20),
  ('b0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000009', 'milkshake', '{"fr": "Milkshake", "ar": "ميلك شيك", "en": "Milkshake"}'::jsonb, '{}'::jsonb, 9000, '{}'::text[], '{milk}'::text[], '{vegetarian}'::text[], true, true, 30);

insert into public.option_groups (id, restaurant_id, name, min_select, max_select) values
  ('e1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Sucre", "ar": "السكر", "en": "Sugar"}'::jsonb, 1, 1),
  ('e1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Taille", "ar": "الحجم", "en": "Size"}'::jsonb, 1, 1),
  ('e1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Lait végétal", "ar": "حليب نباتي", "en": "Plant milk"}'::jsonb, 0, 1),
  ('e1000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Suppléments", "ar": "إضافات", "en": "Extras"}'::jsonb, 0, 3),
  ('e1000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', '{"fr": "Parfums", "ar": "النكهات", "en": "Flavours"}'::jsonb, 1, 3);

insert into public.options (id, restaurant_id, option_group_id, name, price_delta, is_available, sort_order) values
  ('f1000000-0000-4000-8000-000000000101', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', '{"fr": "Sans sucre", "ar": "بدون سكر", "en": "No sugar"}'::jsonb, 0, true, 10),
  ('f1000000-0000-4000-8000-000000000102', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', '{"fr": "Peu sucré", "ar": "سكر قليل", "en": "Little sugar"}'::jsonb, 0, true, 20),
  ('f1000000-0000-4000-8000-000000000103', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', '{"fr": "Normal", "ar": "عادي", "en": "Regular"}'::jsonb, 0, true, 30),
  ('f1000000-0000-4000-8000-000000000104', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000001', '{"fr": "Bien sucré", "ar": "سكر كثير", "en": "Extra sweet"}'::jsonb, 0, true, 40),
  ('f1000000-0000-4000-8000-000000000201', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', '{"fr": "Normal", "ar": "عادي", "en": "Regular"}'::jsonb, 0, true, 10),
  ('f1000000-0000-4000-8000-000000000202', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000002', '{"fr": "Grand", "ar": "كبير", "en": "Large"}'::jsonb, 1000, true, 20),
  ('f1000000-0000-4000-8000-000000000301', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003', '{"fr": "Lait d’amande", "ar": "حليب اللوز", "en": "Almond milk"}'::jsonb, 1500, true, 10),
  ('f1000000-0000-4000-8000-000000000302', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000003', '{"fr": "Lait d’avoine", "ar": "حليب الشوفان", "en": "Oat milk"}'::jsonb, 1500, false, 20),
  ('f1000000-0000-4000-8000-000000000401', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', '{"fr": "Chantilly", "ar": "كريمة شانتيي", "en": "Whipped cream"}'::jsonb, 1000, true, 10),
  ('f1000000-0000-4000-8000-000000000402', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', '{"fr": "Banane", "ar": "موز", "en": "Banana"}'::jsonb, 1500, true, 20),
  ('f1000000-0000-4000-8000-000000000403', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', '{"fr": "Amandes grillées", "ar": "لوز محمّص", "en": "Toasted almonds"}'::jsonb, 1500, true, 30),
  ('f1000000-0000-4000-8000-000000000404', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', '{"fr": "Miel", "ar": "عسل", "en": "Honey"}'::jsonb, 1000, true, 40),
  ('f1000000-0000-4000-8000-000000000405', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000004', '{"fr": "Nutella", "ar": "نوتيلا", "en": "Nutella"}'::jsonb, 2000, true, 50),
  ('f1000000-0000-4000-8000-000000000501', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000005', '{"fr": "Vanille", "ar": "فانيليا", "en": "Vanilla"}'::jsonb, 0, true, 10),
  ('f1000000-0000-4000-8000-000000000502', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000005', '{"fr": "Chocolat", "ar": "شوكولاتة", "en": "Chocolate"}'::jsonb, 0, true, 20),
  ('f1000000-0000-4000-8000-000000000503', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000005', '{"fr": "Fraise", "ar": "فراولة", "en": "Strawberry"}'::jsonb, 0, true, 30),
  ('f1000000-0000-4000-8000-000000000504', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000005', '{"fr": "Pistache", "ar": "فستق", "en": "Pistachio"}'::jsonb, 500, true, 40),
  ('f1000000-0000-4000-8000-000000000505', 'b0000000-0000-4000-8000-000000000001', 'e1000000-0000-4000-8000-000000000005', '{"fr": "Citron", "ar": "ليمون", "en": "Lemon"}'::jsonb, 0, true, 50);

insert into public.product_option_groups (
  restaurant_id, product_id, option_group_id, sort_order, min_select, max_select, price_overrides
)
select p.restaurant_id, p.id, link.group_id::uuid, link.sort_order, link.min_select,
  link.max_select, link.price_overrides::jsonb
from (values
  ('express', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('direct', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('direct', 'e1000000-0000-4000-8000-000000000002', 3, null::integer, null::integer, '{}'),
  ('capucin', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('cafe-turc', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('americano', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('cappuccino', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('cappuccino', 'e1000000-0000-4000-8000-000000000003', 2, null::integer, null::integer, '{}'),
  ('cappuccino', 'e1000000-0000-4000-8000-000000000002', 3, null::integer, null::integer, '{}'),
  ('latte', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('latte', 'e1000000-0000-4000-8000-000000000003', 2, null::integer, null::integer, '{}'),
  ('latte', 'e1000000-0000-4000-8000-000000000002', 3, null::integer, null::integer, '{}'),
  ('the-menthe', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('the-pignons', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('the-vert', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('verveine', 'e1000000-0000-4000-8000-000000000001', 1, null::integer, null::integer, '{}'),
  ('citronnade', 'e1000000-0000-4000-8000-000000000002', 1, null::integer, null::integer, '{"f1000000-0000-4000-8000-000000000202": 2000}'),
  ('jus-orange', 'e1000000-0000-4000-8000-000000000002', 1, null::integer, null::integer, '{"f1000000-0000-4000-8000-000000000202": 2000}'),
  ('jus-fraise', 'e1000000-0000-4000-8000-000000000002', 1, null::integer, null::integer, '{"f1000000-0000-4000-8000-000000000202": 2000}'),
  ('smoothie', 'e1000000-0000-4000-8000-000000000002', 1, null::integer, null::integer, '{"f1000000-0000-4000-8000-000000000202": 2000}'),
  ('crepe-sucre', 'e1000000-0000-4000-8000-000000000004', 1, null::integer, null::integer, '{}'),
  ('crepe-chocolat', 'e1000000-0000-4000-8000-000000000004', 1, null::integer, null::integer, '{}'),
  ('crepe-nutella-banane', 'e1000000-0000-4000-8000-000000000004', 1, null::integer, null::integer, '{}'),
  ('gaufre', 'e1000000-0000-4000-8000-000000000004', 1, null::integer, null::integer, '{}'),
  ('coupe-2', 'e1000000-0000-4000-8000-000000000005', 1, 2, 2, '{}'),
  ('coupe-3', 'e1000000-0000-4000-8000-000000000005', 1, 3, 3, '{}'),
  ('milkshake', 'e1000000-0000-4000-8000-000000000005', 1, 1, 1, '{}'),
  ('milkshake', 'e1000000-0000-4000-8000-000000000002', 2, null::integer, null::integer, '{"f1000000-0000-4000-8000-000000000202": 2500}')
) as link (product_slug, group_id, sort_order, min_select, max_select, price_overrides)
join public.products p on p.restaurant_id = 'b0000000-0000-4000-8000-000000000001' and p.slug = link.product_slug;
