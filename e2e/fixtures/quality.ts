import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

/** Interactive elements whose effective target size is checked on touch widths. */
const INTERACTIVE =
  'button:not([disabled]), a[href], input:not([type=hidden]):not([disabled]), textarea, select, [role=tab], [role=switch], [role=checkbox], [role=radio], [role=combobox]';

/**
 * Effective target size: hit-test around each control's centre (21 px for the 44 px rule,
 * 23 px for 48 px staff targets). A hit on the wrapping <label> counts, because it activates
 * the control too.
 */
export async function undersizedTargets(page: Page, minSize = 44): Promise<string[]> {
  return page.evaluate(
    ({ selector, radius }) => {
      const RADIUS = radius;
      const failures: string[] = [];
      // With a modal open, the page behind it is covered and inert: only the modal counts.
      const scope =
        document.querySelector('[aria-modal="true"], [role="dialog"], dialog:modal') ?? document;
      for (const element of scope.querySelectorAll<HTMLElement>(selector)) {
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
    },
    { selector: INTERACTIVE, radius: Math.floor(minSize / 2) - 1 },
  );
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

/**
 * Elements that stick out of the viewport horizontally without an ancestor clipping them
 * (the cause of sideways scrolling or cut-off content).
 */
export async function overflowingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    // No named helpers in here: tsx/esbuild would wrap them with a `__name` the page lacks.
    const width = document.documentElement.clientWidth;
    const failures: string[] = [];
    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.left >= -1 && rect.right <= width + 1) continue;
      let clipped = false;
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (/hidden|clip|auto|scroll/.test(getComputedStyle(parent).overflowX)) {
          const box = parent.getBoundingClientRect();
          clipped = box.left >= -1 && box.right <= width + 1;
          if (clipped) break;
        }
      }
      if (!clipped) {
        const name = `${element.tagName.toLowerCase()}.${[...element.classList].slice(0, 3).join('.')}`;
        failures.push(
          `${name} ${Math.round(rect.left)}→${Math.round(rect.right)} (viewport ${width})`,
        );
      }
    }
    return failures;
  });
}

/** Text cut by an ellipsis or a line clamp (allowed by design, but reviewed). */
export async function truncatedTexts(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
      const style = getComputedStyle(element);
      const clamps = style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none';
      if (!clamps || element.childElementCount > 0) continue;
      const cut =
        element.scrollWidth > element.clientWidth + 1 ||
        element.scrollHeight > element.clientHeight + 1;
      if (cut) found.push(`"${element.textContent.trim().slice(0, 40)}"`);
    }
    return found;
  });
}
