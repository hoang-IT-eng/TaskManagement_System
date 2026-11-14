import { expect, test } from '@playwright/test';
import { drag, openProject, signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await openProject(page, 'Atelier storefront');
});

test('drag a card to another column and the move persists', async ({ page }) => {
  const card = page.getByTestId('card-ATL-5');
  const review = page.getByTestId('column-InReview');
  await expect(page.getByTestId('column-Todo').getByTestId('card-ATL-5')).toBeVisible();
  const saved = page.waitForResponse((r) => r.url().includes('/tasks/5/move'));
  await drag(page, card, review);
  await expect(review.getByTestId('card-ATL-5')).toBeVisible(); // optimistic
  expect((await saved).status()).toBe(200); // the board is optimistic; wait for the save before reloading

  await page.reload();
  await expect(page.getByTestId('column-InReview').getByTestId('card-ATL-5')).toBeVisible();
  await page.getByTestId('card-ATL-5').click();
  await page.getByRole('tab', { name: 'Activity' }).click();
  await expect(page.getByTestId('task-detail')).toContainText(/moved ATL-5/i);
});

test('reorder within a column persists', async ({ page }) => {
  const todo = page.getByTestId('column-Todo');
  const keysBefore = await todo.locator('[data-testid^="card-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  const last = keysBefore.at(-1)!;
  const saved = page.waitForResponse((r) => r.url().includes('/move'));
  await drag(page, todo.getByTestId(last), todo.getByTestId(keysBefore[0]!));
  await expect(todo.locator('[data-testid^="card-"]').first()).toHaveAttribute('data-testid', last);
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId('column-Todo').locator('[data-testid^="card-"]').first()).toHaveAttribute('data-testid', last);
});

test('edit a task in the drawer and comment on it', async ({ page }) => {
  await page.getByTestId('card-ATL-3').click();
  const detail = page.getByTestId('task-detail');
  await detail.getByLabel('Priority', { exact: true }).selectOption('Urgent');
  await expect(detail).toContainText('v2');
  await detail.getByLabel('Write a comment').fill('Pairing on this after standup.');
  await detail.getByRole('button', { name: 'Comment' }).click();
  await expect(detail.getByText('Pairing on this after standup.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('card-ATL-3').getByRole('img', { name: 'Urgent priority' })).toBeVisible();
});

test('filters live in the URL', async ({ page }) => {
  await page.getByLabel('Priority', { exact: true }).selectOption('Urgent');
  await expect(page).toHaveURL(/priority=Urgent/);
  await page.reload();
  await expect(page.getByLabel('Priority', { exact: true })).toHaveValue('Urgent');
  const cards = page.locator('[data-testid^="card-"]');
  const n = await cards.count();
  for (let i = 0; i < n; i++) await expect(cards.nth(i).getByRole('img', { name: 'Urgent priority' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page).not.toHaveURL(/priority=/);
});

test('an unknown project shows a not-found state', async ({ page }) => {
  await page.goto('/projects/9999');
  await expect(page.getByText('Project not found')).toBeVisible();
});
