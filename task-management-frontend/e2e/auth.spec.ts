import { expect, test } from '@playwright/test';
import { demo, signIn } from './helpers';

test('register, create a project and its first task, and keep the session across a reload', async ({ page }) => {
  const email = `e2e-${Date.now()}@layers.dev`;
  await page.goto('/register');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Tell us your name.')).toBeVisible();

  await page.getByLabel('Full name').fill('Mai Nguyen');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct-horse-1');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: /Good .*, Nguyen/ })).toBeVisible();
  await expect(page.getByText('Your plate is clear')).toBeVisible();

  await page.locator('.sidebar').getByRole('link', { name: 'Projects' }).click();
  await expect(page.getByText('Start your first project')).toBeVisible();
  await page.getByRole('button', { name: 'New project' }).first().click();
  await page.getByLabel('Name').fill('Garden planner');
  await page.getByLabel('Key').fill('GDN');
  await page.getByRole('button', { name: 'Create project' }).click();

  await expect(page.getByRole('heading', { name: 'Garden planner' })).toBeVisible();
  await expect(page.getByText('An empty board')).toBeVisible();
  await page.getByRole('button', { name: 'Create the first task' }).click();
  await page.getByRole('dialog').getByLabel('Title').fill('Order seeds');
  await page.getByRole('dialog').getByRole('button', { name: 'Create task' }).click();
  await expect(page.getByTestId('task-detail')).toContainText('GDN-1');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('card-GDN-1')).toBeVisible();

  // Access token lives in memory only; a reload must restore the session from the httpOnly refresh cookie.
  await page.reload();
  await expect(page.getByTestId('card-GDN-1')).toBeVisible();
  const cookies = await page.context().cookies();
  const rt = cookies.find((c) => c.name === 'layers_rt');
  expect(rt?.httpOnly).toBe(true);
});

test('wrong password shows the API error; sign out ends the session', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(demo.email);
  await page.getByLabel('Password').fill('not-it');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await signIn(page);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
