import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Interactive elements whose effective target size is checked on touch widths. */
const INTERACTIVE =
  'button:not([disabled]), a[href], input:not([type=hidden]):not([disabled]), textarea, select, [role=tab], [role=switch], [role=checkbox], [role=radio], [role=combobox]';

/**
 * Effective target size: hit-test 21 px around each control's centre (a 42–44 px zone).
 * A hit on the wrapping <label> counts, because it activates the control too.
 */
export async function undersizedTargets(page: Page): Promise<string[]> {
  return page.evaluate((selector) => {
    const RADIUS = 21;
    const failures: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      // elementFromPoint only sees the viewport: bring the control into view first.
      element.scrollIntoView({ block: 'center', inline: 'center' });
      const box = element.getBoundingClientRect();
      // Visually hidden native inputs (Base UI form bridges) are not touch targets.
      if (box.width <= 4 || box.height <= 4) continue;
      const owner = element.closest('label') ?? element;
      const cx = box.left + box.width / 2;
      const cy = box.top + box.height / 2;
      const probes: [number, number][] = [
        [cx - RADIUS, cy],
        [cx + RADIUS, cy],
        [cx, cy - RADIUS],
        [cx, cy + RADIUS],
      ];
      const ok = probes.every(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return hit !== null && (owner.contains(hit) || hit.contains(element));
      });
      if (!ok) {
        const label = (element.getAttribute('aria-label') ?? element.textContent).trim();
        failures.push(
          `${element.tagName.toLowerCase()} "${label.slice(0, 30)}" ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      }
    }
    return failures;
  }, INTERACTIVE);
}

export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** WCAG 2.2 AA axe violations of serious or critical impact. */
export async function seriousAxeViolations(page: Page): Promise<string[]> {
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag22aa']).analyze();
  return axe.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(' | ')}`,
    );
}

/** Collects console errors for the page's lifetime. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}
