export const CHECKLIST_STEPS = ['venue', 'menu', 'branding', 'tables', 'team'] as const;
export type ChecklistStep = (typeof CHECKLIST_STEPS)[number];

export interface ChecklistFacts {
  products: number;
  /** Logo uploaded or brand colour chosen. */
  branded: boolean;
  tables: number;
  members: number;
}

export interface Checklist {
  steps: { key: ChecklistStep; done: boolean; href: `/dashboard${string}` }[];
  done: number;
  total: number;
  complete: boolean;
  /** First step still to do, highlighted in the widget. */
  next: ChecklistStep | null;
}

const HREF: Readonly<Record<ChecklistStep, `/dashboard${string}`>> = {
  venue: '/dashboard/settings',
  menu: '/dashboard/menu',
  branding: '/dashboard/settings',
  tables: '/dashboard/tables',
  team: '/dashboard/team',
};

/** Onboarding checklist (spec 04): shown on the overview until every step is done. */
export function onboardingChecklist(facts: ChecklistFacts): Checklist {
  const doneByStep: Readonly<Record<ChecklistStep, boolean>> = {
    venue: true,
    menu: facts.products > 0,
    branding: facts.branded,
    tables: facts.tables > 0,
    team: facts.members > 1,
  };
  const steps = CHECKLIST_STEPS.map((key) => ({ key, done: doneByStep[key], href: HREF[key] }));
  const done = steps.filter((step) => step.done).length;
  return {
    steps,
    done,
    total: steps.length,
    complete: done === steps.length,
    next: steps.find((step) => !step.done)?.key ?? null,
  };
}
