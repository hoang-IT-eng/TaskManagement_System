import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { session } from '../api/client';
import { authBody, mockFetch, renderApp } from '../test/utils';
import { AuthPage } from './AuthPage';

afterEach(() => { vi.unstubAllGlobals(); session.set(null); });

describe('AuthPage', () => {
  it('validates before calling the API', async () => {
    const { calls } = mockFetch({ 'POST /auth/refresh': () => ({ status: 401 }) });
    renderApp(<AuthPage mode="register" />, { route: '/register' });
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Tell us your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument();
    expect(calls.filter((c) => c.url.includes('register'))).toHaveLength(0);
  });

  it('signs in and navigates home', async () => {
    const { calls } = mockFetch({ 'POST /auth/refresh': () => ({ status: 401 }), 'POST /auth/login': () => ({ body: authBody }) });
    renderApp(<AuthPage mode="login" />, { route: '/login', path: '/login' });
    await userEvent.type(screen.getByLabelText('Email'), 'hoang@layers.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'Layers2026');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(calls.find((c) => c.url.endsWith('/auth/login'))?.body).toEqual({ email: 'hoang@layers.dev', password: 'Layers2026' });
    expect(session.token).toBe('token-1');
  });

  it('shows the server message on bad credentials', async () => {
    mockFetch({ 'POST /auth/refresh': () => ({ status: 401 }), 'POST /auth/login': () => ({ status: 401, body: { detail: 'Email or password is incorrect.', code: 'auth.invalid_credentials' } }) });
    renderApp(<AuthPage mode="login" />, { route: '/login', path: '/login' });
    await userEvent.type(screen.getByLabelText('Email'), 'hoang@layers.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'nope');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('maps server field errors onto fields when registering', async () => {
    mockFetch({ 'POST /auth/refresh': () => ({ status: 401 }), 'POST /auth/register': () => ({ status: 409, body: { detail: 'That email is already registered.', errors: { Email: ['Already taken'] } } }) });
    renderApp(<AuthPage mode="register" />, { route: '/register', path: '/register' });
    await userEvent.type(screen.getByLabelText('Full name'), 'An Pham');
    await userEvent.type(screen.getByLabelText('Email'), 'an@layers.dev');
    await userEvent.type(screen.getByLabelText('Password'), 'longenough');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Already taken')).toBeInTheDocument();
  });

  it('the demo button signs in with the seeded account', async () => {
    const { calls } = mockFetch({ 'POST /auth/refresh': () => ({ status: 401 }), 'POST /auth/login': () => ({ body: authBody }) });
    renderApp(<AuthPage mode="login" />, { route: '/login', path: '/login' });
    await userEvent.click(screen.getByRole('button', { name: /explore the demo/i }));
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/auth/login'))?.body).toEqual({ email: 'hoang@layers.dev', password: 'Layers2026' }));
  });
});
