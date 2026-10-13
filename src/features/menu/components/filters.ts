/** Dish filters (spec 02), shared by the server view and the client filter bar. */
export const MENU_FILTERS = ['vegetarian', 'gluten_free', 'spicy', 'new'] as const;
export type MenuFilter = (typeof MENU_FILTERS)[number];
