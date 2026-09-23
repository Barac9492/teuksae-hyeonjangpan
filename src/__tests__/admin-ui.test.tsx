import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminApp } from '../features/admin';

const json = (body: unknown, status = 200, headers?: HeadersInit) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
const authenticated = { authenticated: true, username: 'operator', expiresAt: '2026-10-05T04:40:00.000Z' };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockFetch(...responses: Array<Response | Error>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (!next) throw new Error('unexpected request');
    return next;
  });
}

describe('AdminApp', () => {
  it('shows login only after an unauthenticated session response', async () => {
    const fetchMock = mockFetch(json({}, 401));
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' });
    expect(screen.getByLabelText('아이디')).toHaveAttribute('autocomplete', 'username');
    expect(screen.getByLabelText('아이디')).toHaveAttribute('maxlength', '80');
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('autocomplete', 'current-password');
  });

  it('keeps login input intact when focus re-enters the page', async () => {
    mockFetch(json({}, 401));
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByRole('heading', { name: '로그인' });
    const username = screen.getByLabelText('아이디');
    const password = screen.getByLabelText('비밀번호');
    await user.type(username, 'operator');
    await user.type(password, 'typing-now');
    fireEvent.focus(window);
    expect(username).toHaveValue('operator');
    expect(password).toHaveValue('typing-now');
  });

  it('requires a verified dashboard response before showing private UI after login', async () => {
    const fetchMock = mockFetch(json({}, 401), json(authenticated), json({ ...authenticated, capabilities: {} }));
    const user = userEvent.setup();
    render(<AdminApp />);
    await screen.findByRole('heading', { name: '로그인' });
    await user.type(screen.getByLabelText('아이디'), 'operator');
    await user.type(screen.getByLabelText('비밀번호'), 'not-a-real-password');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('heading', { name: '관리자 화면' })).toBeVisible();
    expect(screen.getByText('operator').closest('p')).toHaveTextContent('operator 계정으로 로그인했습니다.');
    expect(screen.getAllByText('연결 안 됨')).toHaveLength(4);
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/admin/login', expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: JSON.stringify({ username: 'operator', password: 'not-a-real-password' }) }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/admin/dashboard', { credentials: 'same-origin', cache: 'no-store' });
  });

  it('handles invalid credentials, rate limits, network failures, and unavailable service without opening private UI', async () => {
    const user = userEvent.setup();
    mockFetch(json({}, 401), json({}, 401));
    render(<AdminApp />);
    await screen.findByRole('heading', { name: '로그인' });
    await user.type(screen.getByLabelText('아이디'), 'operator');
    await user.type(screen.getByLabelText('비밀번호'), 'wrong');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('아이디 또는 비밀번호를 확인해주세요.');
    expect(screen.queryByRole('heading', { name: '관리자 화면' })).not.toBeInTheDocument();

    cleanup();
    mockFetch(json({}, 401), json({ retryAfter: 7 }, 429, { 'Retry-After': '8' }));
    render(<AdminApp />);
    await screen.findByRole('heading', { name: '로그인' });
    await user.type(screen.getByLabelText('아이디'), 'operator');
    await user.type(screen.getByLabelText('비밀번호'), 'wrong');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('7초 후');

    cleanup();
    mockFetch(new Error('offline'));
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: '지금은 열 수 없어요' })).toBeVisible();
    expect(screen.getByRole('link', { name: '관리자 페이지 다시 열기' })).toHaveAttribute('href', '/admin');

    cleanup();
    mockFetch(json({}, 503));
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: '지금은 열 수 없어요' })).toBeVisible();
  });

  it('only resets private state after a verified logout and reports logout failure honestly', async () => {
    const fetchMock = mockFetch(json(authenticated), json(authenticated), json({}));
    const user = userEvent.setup();
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: '관리자 화면' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('로그아웃하지 못했습니다');
    expect(screen.getByRole('heading', { name: '관리자 화면' })).toBeVisible();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/admin/logout', expect.objectContaining({ method: 'POST', body: '{}' }));

    cleanup();
    mockFetch(json(authenticated), json(authenticated), json({ authenticated: false }));
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: '관리자 화면' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeVisible();
  });

  it('does not let a stale dashboard response restore private UI after logout', async () => {
    let resolveStaleDashboard: ((response: Response) => void) | undefined;
    const staleDashboard = new Promise<Response>((resolve) => { resolveStaleDashboard = resolve; });
    let calls = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls += 1;
      if (calls === 1 || calls === 2 || calls === 3) return json(authenticated);
      if (calls === 4) return staleDashboard;
      if (calls === 5) return json({ authenticated: false });
      throw new Error('unexpected request');
    });
    const user = userEvent.setup();
    render(<AdminApp />);
    expect(await screen.findByRole('heading', { name: '관리자 화면' })).toBeVisible();
    fireEvent.focus(window);
    await waitFor(() => expect(calls).toBe(4));
    await user.click(screen.getByRole('button', { name: '로그아웃' }));
    expect(await screen.findByRole('heading', { name: '로그인' })).toBeVisible();
    resolveStaleDashboard?.(json(authenticated));
    await waitFor(() => expect(screen.queryByRole('heading', { name: '관리자 화면' })).not.toBeInTheDocument());
  });

  it('does not use browser storage as authorization', async () => {
    const setItem = vi.spyOn(window.localStorage, 'setItem');
    const getItem = vi.spyOn(window.localStorage, 'getItem');
    mockFetch(json({}, 401));
    render(<AdminApp />);
    await screen.findByRole('heading', { name: '로그인' });
    await waitFor(() => expect(setItem).not.toHaveBeenCalled());
    expect(getItem).not.toHaveBeenCalled();
  });
});
