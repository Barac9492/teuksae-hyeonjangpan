import { useEffect, useMemo, useState } from 'react';

export type LiveResourceState = 'checking' | 'closed' | 'available' | 'busy' | 'full' | 'school_open' | 'gym_open' | 'hall_open' | 'hall_closed';
type Category = 'parking' | 'space';
type LiveResource = { id: string; label: string; category: Category; state: LiveResourceState; version: number; updatedAt: string | null };
type StatusResponse = { enabled: boolean; resources: LiveResource[] };
type Freshness = 'fresh' | 'unconfirmed' | 'stale' | 'invalid' | 'future' | 'offline';

const REFRESH_MS = 20_000;
const REQUEST_TIMEOUT_MS = 8_000;
const FRESH_MS = 10 * 60_000;
const defaults: LiveResource[] = [
  { id: 'space.songrim.access', label: '학교 출입', category: 'space', state: 'checking', version: 0, updatedAt: null },
  { id: 'space.songrim.hall', label: '본당 1·2층', category: 'space', state: 'checking', version: 0, updatedAt: null },
  { id: 'space.songrim.gym', label: '체육관', category: 'space', state: 'checking', version: 0, updatedAt: null },
  { id: 'space.dream.f3', label: '3층', category: 'space', state: 'checking', version: 0, updatedAt: null },
  { id: 'space.dream.f7', label: '7층', category: 'space', state: 'checking', version: 0, updatedAt: null },
  { id: 'space.dream.f11', label: '11층', category: 'space', state: 'checking', version: 0, updatedAt: null },
  { id: 'parking.songrim', label: '송림본당 주차', category: 'parking', state: 'checking', version: 0, updatedAt: null },
  ...[1, 2, 3, 4, 5].map((floor) => ({ id: `parking.dream.b${floor}`, label: `B${floor}`, category: 'parking' as const, state: 'checking' as const, version: 0, updatedAt: null })),
];
const byId = new Map(defaults.map((resource) => [resource.id, resource]));
const normalStates = new Set<LiveResourceState>(['checking', 'closed', 'available', 'busy', 'full']);
const accessStates = new Set<LiveResourceState>(['checking', 'closed', 'school_open', 'gym_open', 'hall_open', 'hall_closed']);

function validResource(value: unknown): LiveResource | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const fallback = typeof raw.id === 'string' ? byId.get(raw.id) : undefined;
  if (!fallback || raw.category !== fallback.category || !Number.isInteger(raw.version) || (raw.version as number) < 0 || typeof raw.state !== 'string') return null;
  const states = fallback.id === 'space.songrim.access' ? accessStates : normalStates;
  if (!states.has(raw.state as LiveResourceState)) return null;
  if (raw.updatedAt !== null && (typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt)))) return null;
  return { ...fallback, state: raw.state as LiveResourceState, version: raw.version as number, updatedAt: raw.updatedAt as string | null };
}

function freshness(updatedAt: string | null, now: number, offline: boolean, enabled: boolean): Freshness {
  if (offline) return 'offline';
  if (!enabled || !updatedAt) return 'unconfirmed';
  const time = Date.parse(updatedAt);
  if (!Number.isFinite(time)) return 'invalid';
  if (time > now) return 'future';
  return now - time <= FRESH_MS ? 'fresh' : 'stale';
}
function stateText(resource: LiveResource): string {
  if (resource.state === 'full') return resource.category === 'parking' ? '만차' : '입장 마감';
  return ({ checking: '확인 중', closed: '닫힘', available: '이용 가능', busy: '혼잡', school_open: '학교 개방', gym_open: '체육관 개방', hall_open: '본당 입장 가능', hall_closed: '본당 입장 마감' })[resource.state] ?? '확인 중';
}
function stateTone(state: LiveResourceState): string {
  if (state === 'available' || state === 'school_open' || state === 'gym_open' || state === 'hall_open') return 'good';
  if (state === 'busy') return 'warn';
  if (state === 'full' || state === 'closed' || state === 'hall_closed') return 'stop';
  return 'neutral';
}
function clockText(updatedAt: string): string { return new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' }).format(new Date(updatedAt)); }

// eslint-disable-next-line react-refresh/only-export-components
export function useLiveOperations(active = true) {
  const [response, setResponse] = useState<StatusResponse | null>(null);
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    let mounted = true;
    let sequence = 0;
    let controller: AbortController | null = null;
    const load = async () => {
      if (!navigator.onLine) { if (mounted) setOffline(true); return; }
      controller?.abort(); controller = new AbortController();
      const request = ++sequence;
      const timeout = window.setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
      try {
        const result = await fetch('/api/status', { headers: { accept: 'application/json' }, signal: controller.signal });
        const body = await result.json().catch(() => null) as unknown;
        if (!mounted || request !== sequence) return;
        setNow(Date.now());
        if (!result.ok || !body || typeof body !== 'object' || (body as { enabled?: unknown }).enabled !== true || !Array.isArray((body as { resources?: unknown }).resources)) {
          setResponse((current) => ({ enabled: false, resources: current?.resources ?? [] }));
          return;
        }
        const resources = (body as { resources: unknown[] }).resources.map(validResource).filter((item): item is LiveResource => item !== null);
        setResponse({ enabled: true, resources }); setOffline(false);
      } catch {
        if (mounted && request === sequence) setOffline(true);
      } finally { window.clearTimeout(timeout); }
    };
    void load();
    const refresh = window.setInterval(() => { void load(); }, REFRESH_MS);
    const clock = window.setInterval(() => setNow(Date.now()), 30_000);
    const goOffline = () => setOffline(true);
    const goOnline = () => { setOffline(false); void load(); };
    window.addEventListener('offline', goOffline); window.addEventListener('online', goOnline);
    return () => { mounted = false; controller?.abort(); window.clearInterval(refresh); window.clearInterval(clock); window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, [active]);
  const resources = useMemo(() => { const remote = new Map((response?.resources ?? []).map((resource) => [resource.id, resource])); return defaults.map((fallback) => remote.get(fallback.id) ?? fallback); }, [response]);
  const confirmed = resources.some((resource) => resource.updatedAt !== null && Number.isFinite(Date.parse(resource.updatedAt)));
  return { resources, enabled: response?.enabled === true, offline, now, confirmed };
}

function LiveRow({ resource, now, offline, enabled }: { resource: LiveResource; now: number; offline: boolean; enabled: boolean }) {
  const status = freshness(resource.updatedAt, now, offline, enabled);
  const label = status === 'fresh' ? stateText(resource) : '확인 필요';
  const note = status === 'fresh' && resource.updatedAt ? `${clockText(resource.updatedAt)} 확인` : status === 'offline' ? '연결 확인 전' : status === 'stale' ? '10분 경과 · 확인 필요' : status === 'future' ? '확인 시각 오류' : status === 'invalid' ? '확인 시각 오류' : '현장팀 확인 전';
  return <div className="tc-status-row tc-live-row"><span>{resource.label}<small>{note}</small></span><span className={`tc-status-value tc-status-value--${status === 'fresh' ? stateTone(resource.state) : 'neutral'}`}>{label}</span></div>;
}
function LiveNotice({ enabled, offline, confirmed }: { enabled: boolean; offline: boolean; confirmed: boolean }) {
  if (offline) return <div className="tc-live-notice" role="status"><strong>연결 확인 중</strong><span>마지막 안내를 실제 현황으로 표시하지 않습니다.</span></div>;
  if (!enabled || !confirmed) return <div className="tc-live-notice" role="status"><strong>현장팀 확인 전</strong><span>아직 공개된 현장 현황이 없습니다.</span></div>;
  return <div className="tc-live-notice tc-live-notice--active" role="status"><strong>현장팀 확인 현황</strong><span>각 항목은 마지막 확인 시각 기준입니다.</span></div>;
}
type Operations = ReturnType<typeof useLiveOperations>;
function VenueSwitch({ venue, setVenue, label }: { venue: 'songrim' | 'dream'; setVenue: (venue: 'songrim' | 'dream') => void; label: string }) { return <div className="tc-venue-switch" role="group" aria-label={label}><button type="button" aria-pressed={venue === 'songrim'} onClick={() => setVenue('songrim')}>이매 · 송림본당</button><button type="button" aria-pressed={venue === 'dream'} onClick={() => setVenue('dream')}>서현 · 드림센터</button></div>; }
function Rows({ ids, operations }: { ids: string[]; operations: Operations }) { return <>{ids.map((id) => <LiveRow key={id} resource={operations.resources.find((item) => item.id === id)!} now={operations.now} offline={operations.offline} enabled={operations.enabled} />)}</>; }

export function LiveWorshipPanel({ venue, setVenue, operations, crownImage, eventDay, goToParking, goToSnack }: { venue: 'songrim' | 'dream'; setVenue: (venue: 'songrim' | 'dream') => void; operations: Operations; crownImage: string; eventDay: number | null; goToParking: () => void; goToSnack: () => void }) {
  const ids = venue === 'songrim' ? ['space.songrim.access', 'space.songrim.hall', 'space.songrim.gym'] : ['space.dream.f3', 'space.dream.f7', 'space.dream.f11'];
  return <section id="tc-panel-worship" className="tc-panel" role="tabpanel" aria-labelledby="tc-tab-worship"><div className="tc-hero"><div className="tc-hero__copy"><span className="tc-eyebrow">2026 가을특별새벽부흥회</span><h1>하나님<br />마음에<br />합한 사람</h1><span className="tc-hero__reference">사도행전 13:22</span></div><img src={crownImage} alt="왕관을 조심스럽게 받쳐 든 두 손" /></div><div className="tc-event-strip"><div><strong>10.05 <small>월</small> ~ 10.10 <small>토</small></strong><span>학교·예배 공간 개방 시각은 현장팀 확인 후 안내합니다.</span></div><div className="tc-event-time"><span>예배 시작</span><strong>04:40</strong></div></div><div className="tc-section"><VenueSwitch venue={venue} setVenue={setVenue} label="예배 장소" /><LiveNotice enabled={operations.enabled} offline={operations.offline} confirmed={operations.confirmed} /><Rows ids={ids} operations={operations} /><div className="tc-mini-actions"><button type="button" onClick={goToParking}>주차 안내 <span aria-hidden="true">↗</span></button>{eventDay !== null && venue === 'songrim' && <button type="button" onClick={goToSnack}>간식 나눔 <span aria-hidden="true">↗</span></button>}</div><p className="tc-panel-note">현장팀이 확인한 공개 안내만 표시합니다. 교회 공식 앱 승인이나 운영 주체를 뜻하지 않습니다.</p></div></section>;
}
export function LiveParkingPanel({ venue, setVenue, operations }: { venue: 'songrim' | 'dream'; setVenue: (venue: 'songrim' | 'dream') => void; operations: Operations }) { const ids = venue === 'songrim' ? ['parking.songrim'] : ['parking.dream.b1', 'parking.dream.b2', 'parking.dream.b3', 'parking.dream.b4', 'parking.dream.b5']; return <section id="tc-panel-parking" className="tc-panel" role="tabpanel" aria-labelledby="tc-tab-parking"><header className="tc-page-heading"><span className="tc-eyebrow">도착하기 전에</span><h1>주차 안내</h1><p>각 주차 구역의 현황을 따로 확인해요.</p></header><div className="tc-section tc-section--topless"><VenueSwitch venue={venue} setVenue={setVenue} label="주차 장소" /><LiveNotice enabled={operations.enabled} offline={operations.offline} confirmed={operations.confirmed} /><Rows ids={ids} operations={operations} /><p className="tc-safety">운전 중 화면을 조작하지 마세요. 동승자가 확인하거나 안전하게 정차한 뒤 이용해주세요.</p></div></section>; }
