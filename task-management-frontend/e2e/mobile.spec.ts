import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('mobile: tab bar navigation, swipeable board and full-screen task sheet', async ({ page }) => {
  await signIn(page);
  const tabs = page.locator('.tabbar');
  await expect(tabs).toBeVisible();
  await expect(page.locator('.sidebar')).toBeHidden();

  await tabs.getByRole('link', { name: 'Projects' }).click();
  await page.getByRole('link', { name: /Plates recognition/ }).click();
  const board = page.getByTestId('board');
  await expect(board).toBeVisible();
  const overflow = await board.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflow).toBe(true);
  const docOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(docOverflow).toBe(false);

  await page.locator('[data-testid^="card-PLT-"]').first().click();
  const sheet = page.getByRole('dialog', { name: 'Task details' });
  await expect(sheet).toBeVisible();
  const box = (await sheet.boundingBox())!;
  expect(Math.round(box.width)).toBe(390);

  await page.getByRole('button', { name: 'Close' }).click();
  await tabs.getByRole('link', { name: 'Inbox' }).click();
  await expect(page.getByRole('heading', { name: 'Inbox' })).toBeVisible();
});
