import { useCallback, useEffect, useRef, useState } from 'react';

type Capabilities = {
  liveOperations: boolean;
  photoReview: boolean;
  prayerInbox: boolean;
  sharingModeration: boolean;
};

type Session = {
  username: string;
  expiresAt: string;
  capabilities: Capabilities;
};

type Screen = 'checking' | 'login' | 'dashboard' | 'unavailable';

type ApiSession = {
  authenticated?: boolean;
  username?: string;
  expiresAt?: string;
  capabilities?: Partial<Capabilities>;
};

const emptyCapabilities: Capabilities = {
  liveOperations: false,
  photoReview: false,
  prayerInbox: false,
  sharingModeration: false,
};

const features: Array<{ key: keyof Capabilities; title: string; description: string }> = [
  { key: 'liveOperations', title: '현장 운영', description: '실시간 현장 안내 연결' },
  { key: 'photoReview', title: '사진 검토', description: '사진 접수 및 검토함' },
  { key: 'prayerInbox', title: '기도함', description: '기도 제목 수신함' },
  { key: 'sharingModeration', title: '나눔 관리', description: '공유 글 검토 및 관리' },
];

function isAuthenticatedPayload(value: ApiSession): value is ApiSession & { authenticated: true; username: string; expiresAt: string } {
  return value.authenticated === true && typeof value.username === 'string' && value.username.length > 0 && typeof value.expiresAt === 'string' && !Number.isNaN(Date.parse(value.expiresAt));
}

function retryAfterSeconds(response: Response, body: unknown): number | null {
  const fromBody = typeof body === 'object' && body !== null && 'retryAfter' in body ? Number(body.retryAfter) : NaN;
  const fromHeader = Number(response.headers.get('Retry-After'));
  const value = Number.isFinite(fromBody) && fromBody > 0 ? fromBody : fromHeader;
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

async function readJson(response: Response): Promise<ApiSession | Record<string, unknown>> {
  try {
    return await response.json() as ApiSession | Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function AdminApp() {
  const [screen, setScreen] = useState<Screen>('checking');
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const activeRequest = useRef(0);

  const showLogin = useCallback((notice = '') => {
    setSession(null);
    setMessage(notice);
    setScreen('login');
  }, []);

  const showUnavailable = useCallback((notice = '관리자 서비스를 지금 확인할 수 없습니다.') => {
    setSession(null);
    setMessage(notice);
    setScreen('unavailable');
  }, []);

  const loadDashboard = useCallback(async (): Promise<void> => {
    const requestId = ++activeRequest.current;
    try {
      const response = await fetch('/api/admin/dashboard', { credentials: 'same-origin', cache: 'no-store' });
      const body = await readJson(response) as ApiSession;
      if (requestId !== activeRequest.current) return;
      if (response.status === 401 || (response.ok && !isAuthenticatedPayload(body))) {
        showLogin(response.status === 401 ? '세션이 만료되었습니다. 다시 로그인해주세요.' : '로그인이 필요합니다.');
        return;
      }
      if (!response.ok || !isAuthenticatedPayload(body)) {
        showUnavailable();
        return;
      }
      setSession({ username: body.username, expiresAt: body.expiresAt, capabilities: { ...emptyCapabilities, ...body.capabilities } });
      setMessage('');
      setScreen('dashboard');
    } catch {
      if (requestId === activeRequest.current) showUnavailable();
    }
  }, [showLogin, showUnavailable]);

  const checkSession = useCallback(async (showChecking = true): Promise<void> => {
    const requestId = ++activeRequest.current;
    if (showChecking) {
      setScreen('checking');
      setMessage('');
    }
    try {
      const response = await fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' });
      const body = await readJson(response) as ApiSession;
      if (requestId !== activeRequest.current) return;
      if (response.status === 401 || (response.ok && !isAuthenticatedPayload(body))) {
        showLogin();
        return;
      }
      if (!response.ok || !isAuthenticatedPayload(body)) {
        showUnavailable();
        return;
      }
      await loadDashboard();
    } catch {
      if (requestId === activeRequest.current) showUnavailable();
    }
  }, [loadDashboard, showLogin, showUnavailable]);

  useEffect(() => {
    void checkSession();
    return () => { activeRequest.current += 1; };
  }, [checkSession]);

  useEffect(() => {
    if (screen !== 'dashboard' || submitting) return;
    const refresh = () => { if (document.visibilityState === 'visible') void checkSession(false); };
    const onFocus = () => void checkSession(false);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => void checkSession(false), 60_000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [checkSession, screen, submitting]);

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const formElement = event.currentTarget;
    activeRequest.current += 1;
    const form = new FormData(formElement);
    const username = String(form.get('username') ?? '').trim();
    const password = String(form.get('password') ?? '');
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const body = await readJson(response) as ApiSession | Record<string, unknown>;
      if (response.ok && isAuthenticatedPayload(body as ApiSession)) {
        await loadDashboard();
      } else if (response.status === 401) {
        setMessage('아이디 또는 비밀번호를 확인해주세요.');
      } else if (response.status === 429) {
        const seconds = retryAfterSeconds(response, body);
        setMessage(seconds ? `로그인 시도가 제한되었습니다. ${seconds}초 후 다시 시도해주세요.` : '로그인 시도가 제한되었습니다. 잠시 후 다시 시도해주세요.');
      } else if (response.status === 503) {
        showUnavailable('관리자 서비스가 일시적으로 사용할 수 없습니다.');
      } else {
        showUnavailable();
      }
    } catch {
      showUnavailable();
    } finally {
      formElement.reset();
      setSubmitting(false);
    }
  };

  const logout = async (): Promise<void> => {
    activeRequest.current += 1;
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await readJson(response) as ApiSession;
      if (response.ok && body.authenticated === false) showLogin('로그아웃했습니다.');
      else setMessage('로그아웃하지 못했습니다. 현재 로그인 상태를 유지합니다.');
    } catch {
      setMessage('로그아웃하지 못했습니다. 현재 로그인 상태를 유지합니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="ta-admin" lang="ko">
    <header className="ta-admin__header">
      <a className="ta-admin__brand" href="/" aria-label="우리 특새 앱으로 돌아가기"><strong>우리</strong><span>특새 관리자</span></a>
      <a className="ta-admin__back" href="/">앱으로 돌아가기</a>
    </header>
    <section className="ta-admin__content" aria-live="polite">
      {screen === 'checking' && <div className="ta-admin__card"><p className="ta-admin__eyebrow">관리자 전용</p><h1>세션을 확인하고 있어요</h1><p>안전하게 관리자 접근 권한을 확인합니다.</p></div>}
      {screen === 'unavailable' && <div className="ta-admin__card"><p className="ta-admin__eyebrow">관리자 전용</p><h1>지금은 열 수 없어요</h1><p role="alert">{message || '관리자 서비스를 지금 확인할 수 없습니다.'}</p><button className="ta-admin__primary" type="button" onClick={() => void checkSession()}>다시 시도</button><a className="ta-admin__checkpoint" href="/admin">관리자 페이지 다시 열기</a></div>}
      {screen === 'login' && <div className="ta-admin__card"><p className="ta-admin__eyebrow">관리자 전용</p><h1>로그인</h1><p>승인된 관리자만 접근할 수 있습니다.</p>{message && <p className="ta-admin__alert" role="alert">{message}</p>}<form onSubmit={(event) => void submitLogin(event)}><label htmlFor="ta-admin-username">아이디</label><input id="ta-admin-username" name="username" autoComplete="username" maxLength={80} required disabled={submitting} /><label htmlFor="ta-admin-password">비밀번호</label><input id="ta-admin-password" name="password" type="password" autoComplete="current-password" maxLength={200} required disabled={submitting} /><button className="ta-admin__primary" type="submit" disabled={submitting}>{submitting ? '확인 중…' : '로그인'}</button></form></div>}
      {screen === 'dashboard' && session && <div className="ta-admin__dashboard"><div className="ta-admin__dashboard-head"><div><p className="ta-admin__eyebrow">관리자 전용</p><h1>관리자 화면</h1><p><strong>{session.username}</strong> 계정으로 로그인했습니다.</p><p className="ta-admin__expiry">세션 만료: {formatExpiry(session.expiresAt)}</p></div><button className="ta-admin__secondary" type="button" disabled={submitting} onClick={() => void logout()}>{submitting ? '처리 중…' : '로그아웃'}</button></div>{message && <p className="ta-admin__alert" role="alert">{message}</p>}<p className="ta-admin__notice">관리 기능은 아직 백엔드와 연결되지 않았습니다. 이 화면에서는 현장 정보나 콘텐츠를 수정할 수 없습니다.</p><div className="ta-admin__features">{features.map((feature) => <article key={feature.key} className="ta-admin__feature"><span>연결 안 됨</span><h2>{feature.title}</h2><p>{feature.description}</p><small>{session.capabilities[feature.key] ? '권한 확인됨 · 기능 연결 대기' : '운영 기능 미연결'}</small></article>)}</div></div>}
    </section>
  </main>;
}
