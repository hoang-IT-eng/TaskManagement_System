import { expect, type Locator, type Page } from '@playwright/test';

export const demo = { email: 'hoang@layers.dev', password: 'Layers2026' };
export const linh = { email: 'linh@layers.dev', password: 'Layers2026' };

export async function signIn(page: Page, who = demo) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(who.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Good');
}

export async function openProject(page: Page, name: string) {
  await page.getByRole('navigation', { name: 'Main' }).first();
  await page.locator('.sidebar').getByRole('link', { name }).click();
  await expect(page.getByTestId('board')).toBeVisible();
}

/** dnd-kit listens to pointer events and needs a few intermediate moves past its activation distance. */
export async function drag(page: Page, from: Locator, to: Locator) {
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + 10, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 80), { steps: 16 });
  await page.waitForTimeout(120);
  await page.mouse.up();
}
