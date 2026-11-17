import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** Runs axe on the page as it is now: labels, roles, contrast, landmarks. */
export async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
}
