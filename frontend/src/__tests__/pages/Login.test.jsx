import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock AuthContext
const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import Login from '../../pages/Login';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders username and password inputs', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/username or email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/)).toBeInTheDocument();
  });

  it('renders Sign In button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders Forgot your password link', () => {
    renderLogin();
    expect(screen.getByRole('link', { name: /forgot your password/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitted empty', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  it('calls login with username and password on submit', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await user.type(screen.getByPlaceholderText(/username or email/i), 'myuser');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'mypassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('myuser', 'mypassword');
    });
  });

  it('navigates to /dashboard on successful login', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValueOnce(undefined);
    renderLogin();

    await user.type(screen.getByPlaceholderText(/username or email/i), 'myuser');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'mypassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('shows error toast on login failure', async () => {
    const user = userEvent.setup();
    const toast = await import('react-hot-toast');
    mockLogin.mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });
    renderLogin();

    await user.type(screen.getByPlaceholderText(/username or email/i), 'baduser');
    await user.type(screen.getByPlaceholderText(/••••••••/), 'badpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(toast.default.error).toHaveBeenCalledWith('Invalid credentials');
    });
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLogin();
    const pwInput = screen.getByPlaceholderText(/••••••••/);
    expect(pwInput.type).toBe('password');

    const toggleBtn = pwInput.parentElement.querySelector('button');
    await user.click(toggleBtn);
    expect(pwInput.type).toBe('text');

    await user.click(toggleBtn);
    expect(pwInput.type).toBe('password');
  });
});
