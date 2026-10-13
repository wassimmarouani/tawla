import { describe, expect, it } from 'vitest';
import { onboardingChecklist } from './checklist';

describe('onboardingChecklist', () => {
  it('starts with only the venue done and points at the menu', () => {
    const list = onboardingChecklist({ products: 0, branded: false, tables: 0, members: 1 });
    expect(list).toMatchObject({ done: 1, total: 5, complete: false, next: 'menu' });
    expect(list.steps.map((step) => [step.key, step.done])).toEqual([
      ['venue', true],
      ['menu', false],
      ['branding', false],
      ['tables', false],
      ['team', false],
    ]);
  });

  it('skips done steps when choosing the next one', () => {
    expect(
      onboardingChecklist({ products: 12, branded: true, tables: 0, members: 3 }),
    ).toMatchObject({
      done: 4,
      next: 'tables',
    });
  });

  it('is complete when everything is set up', () => {
    expect(
      onboardingChecklist({ products: 1, branded: true, tables: 8, members: 2 }),
    ).toMatchObject({
      done: 5,
      complete: true,
      next: null,
    });
  });
});
