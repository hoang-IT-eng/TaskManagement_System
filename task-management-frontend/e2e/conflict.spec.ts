import { expect, test } from '@playwright/test';
import { linh, signIn } from './helpers';

test('two people edit the same task: the second save gets a 409 and can re-apply on top', async ({ browser }) => {
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await signIn(a);
  await signIn(b, linh);

  // Both open ATL-7 at the same version.
  const url = async (p: typeof a) => {
    await p.locator('.sidebar').getByRole('link', { name: 'Atelier storefront' }).click();
    await p.getByTestId('card-ATL-7').click();
    await expect(p.getByTestId('task-detail')).toBeVisible();
  };
  await url(a);
  await url(b);

  const titleA = a.getByTestId('task-detail').getByLabel('Title');
  await titleA.fill('Cart badge flickers on route change (Safari)');
  await titleA.press('Enter');
  await expect(a.getByTestId('task-detail')).toContainText('v2');

  // B still holds v1.
  const detailB = b.getByTestId('task-detail');
  const conflict = b.waitForResponse((r) => r.url().includes('/tasks/') && r.request().method() === 'PATCH');
  await detailB.getByLabel('Priority', { exact: true }).selectOption('High');
  expect((await conflict).status()).toBe(409);
  await expect(detailB.getByText('Someone changed this task while you were editing.')).toBeVisible();
  await expect(detailB.getByLabel('Title')).toHaveValue('Cart badge flickers on route change (Safari)');

  await detailB.getByRole('button', { name: 'Apply my change on top' }).click();
  await expect(detailB.getByText('Someone changed this task while you were editing.')).toBeHidden();
  await expect(detailB).toContainText('v3');
  await expect(detailB.getByLabel('Priority', { exact: true })).toHaveValue('High');
});
