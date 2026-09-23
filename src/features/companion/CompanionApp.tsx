import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent, ReactNode } from 'react';
import crownImage from './assets/crown.jpg';
import posterImage from './assets/poster.jpg';

const tabs = [
  { id: 'worship', label: '예배' },
  { id: 'parking', label: '주차' },
  { id: 'prayer', label: '기도' },
  { id: 'sharing', label: '나눔' },
  { id: 'photos', label: '사진' },
] as const;

type TabId = (typeof tabs)[number]['id'];
type Venue = 'songrim' | 'dream';
type SnackView = 'snacks' | 'breakfast';
type PrayerView = 'write' | 'read';
type Stage = 0 | 1 | 2 | 3 | 4;

type Story = {
  id: number;
  name: string;
  text: string;
};

const stageNames = ['학교 개방 전', '학교만 개방', '체육관 먼저 개방', '본당 입장 중', '본당 입장 마감'] as const;
const eventDates = [
  ['10월 5일(월)', '첫날 / 1청년부 3팀'],
  ['10월 6일(화)', '자율 나눔'],
  ['10월 7일(수)', '자율 나눔'],
  ['10월 8일(목)', '자율 나눔'],
  ['10월 9일(금)', '자율 나눔'],
  ['10월 10일(토)', '자율 나눔'],
] as const;

const restaurants = {
  songrim: {
    name: '유치회관 야탑직영점',
    hours: '24시간으로 안내',
    type: '해장국',
    area: '야탑 · 이동 필요',
    address: '성남시 분당구 장미로48번길 14',
    map: 'https://www.google.com/maps/?cid=15601197394275138759',
    source: 'https://www.saeob.com/%EC%9C%A0%EC%B9%98%ED%9A%8C%EA%B4%80-%EC%95%BC%ED%83%91%EC%A7%81%EC%98%81%EC%A0%90-031-715-6275',
  },
  dream: {
    name: '서울감자탕 서현지점',
    hours: '24시간으로 안내',
    type: '감자탕 · 뼈해장국',
    area: '서현',
    address: '성남시 분당구 황새울로 315, 대현빌딩 1층',
    map: 'https://www.google.com/maps/search/서울감자탕+서현지점',
    source: 'https://www.diningcode.com/list.dc?query=%EC%84%9C%ED%98%84%EC%97%AD%2024%EC%8B%9C%EA%B0%84%EC%98%81%EC%97%85',
  },
} as const;

function TabIcon({ tab }: { tab: TabId }) {
  const paths = { worship: <path d="M4 21V10l8-6 8 6v11M2 21h20M9 21v-7h6v7M12 1v6M9.5 3.5h5" />, parking: <><rect x="4" y="3" width="16" height="18" rx="4" /><path d="M10 17V7h3a3 3 0 010 6h-3" /></>, prayer: <path d="M12 21S3 15 3 9a5 5 0 019-3 5 5 0 019 3c0 6-9 12-9 12z" />, sharing: <><path d="M4 10h13v4a6 6 0 01-6 6h-1a6 6 0 01-6-6zM17 11h2a3 3 0 010 6h-3M3 22h16M7 3v3M12 2v4" /></>, photos: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="M3 18l6-6 4 4 3-3 5 5" /></> };
  return <svg className="tc-tab-icon" viewBox="0 0 24 24" aria-hidden="true">{paths[tab]}</svg>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    closeRef.current?.focus();
    return () => {
      if (dialog.open && typeof dialog.close === 'function') dialog.close();
      previousFocus.current?.focus();
    };
  }, []);

  return (
    <dialog
      className="tc-dialog"
      ref={dialogRef}
      aria-labelledby="tc-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="tc-dialog__header">
        <h2 id="tc-dialog-title">{title}</h2>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="닫기">×</button>
      </div>
      <div className="tc-dialog__body">{children}</div>
    </dialog>
  );
}

function VenueSwitch({ venue, onChange, label }: { venue: Venue; onChange: (venue: Venue) => void; label: string }) {
  return (
    <div className="tc-venue-switch" role="group" aria-label={label}>
      <button type="button" aria-pressed={venue === 'songrim'} onClick={() => onChange('songrim')}>이매 · 송림본당</button>
      <button type="button" aria-pressed={venue === 'dream'} onClick={() => onChange('dream')}>서현 · 드림센터</button>
    </div>
  );
}

function StatusLead({ label, title, children, tone = 'good' }: { label: string; title: string; children: ReactNode; tone?: 'good' | 'neutral' | 'amber' | 'red' }) {
  return <div className={`tc-status-lead tc-status-lead--${tone}`}><span className="tc-tiny">{label}</span><h3>{title}</h3><p>{children}</p></div>;
}

function StatusRow({ name, extra, value, tone = 'neutral' }: { name: string; extra?: string; value: string; tone?: 'neutral' | 'good' | 'warn' | 'stop' }) {
  return <div className="tc-status-row"><span>{name}{extra && <small>{extra}</small>}</span><span className={`tc-status-value tc-status-value--${tone}`}>{value}</span></div>;
}

function SongrimWorship({ stage, stale }: { stage: Stage; stale: boolean }) {
  if (stale) {
    return <><StatusLead tone="neutral" label="정보 갱신이 필요한 상황 · 디자인 예시" title="현장 확인을 기다리고 있어요">이전 상태는 표시하지 않습니다. 입장과 주차는 현장 안내요원에게 확인해주세요.</StatusLead><StatusRow name="학교 출입" value="확인 중" /><StatusRow name="본당·체육관" value="확인 중" /></>;
  }
  const leads = [
    ['학교 밖에서 기다려주세요', '학교와 주차장 모두 아직 들어갈 수 없어요.', 'neutral'],
    ['학교 안에서 대기해요', '본당과 체육관은 아직 열리지 않았어요. 보행 동선으로 이동해주세요.', 'neutral'],
    ['체육관에 먼저 들어갈 수 있어요', '본당을 기다리지 않고 체육관에서 예배를 준비할 수 있어요.', 'good'],
    ['본당 입장이 시작됐어요', '본당 1·2층으로 함께 안내하고 있어요. 입장 가능 여부는 현장에서 확인해주세요.', 'good'],
    ['본당 입장이 마감됐어요', '체육관 혼잡도를 확인하고 안내요원의 안내를 따라주세요.', 'amber'],
  ] as const;
  const lead = leads[stage];
  return <>
    <StatusLead tone={lead[2]} label="현재 상황 · 디자인 예시" title={lead[0]}>{lead[1]}</StatusLead>
    <StatusRow name="학교 출입" value={stage === 0 ? '개방 전' : '개방'} tone={stage === 0 ? 'neutral' : 'good'} />
    <StatusRow name="본당" extra="1·2층 통합 안내" value={stage < 3 ? '입장 전' : stage === 3 ? '입장 중' : '입장 마감'} tone={stage === 4 ? 'stop' : stage === 3 ? 'good' : 'neutral'} />
    <StatusRow name="체육관" value={stage < 2 ? '개방 전' : stage === 4 ? '혼잡' : '개방 · 여유'} tone={stage < 2 ? 'neutral' : stage === 4 ? 'warn' : 'good'} />
  </>;
}

function WorshipPanel({ venue, setVenue, stage, stale, eventDay, goToParking, goToSnack, showRoute }: { venue: Venue; setVenue: (venue: Venue) => void; stage: Stage; stale: boolean; eventDay: number; goToParking: () => void; goToSnack: () => void; showRoute: () => void }) {
  return <section id="tc-panel-worship" className="tc-panel" role="tabpanel" aria-labelledby="tc-tab-worship">
    <div className="tc-hero"><div className="tc-hero__copy"><span className="tc-eyebrow">2026 가을특별새벽부흥회</span><h1>하나님<br />마음에<br />합한 사람</h1><span className="tc-hero__reference">사도행전 13:22</span></div><img src={crownImage} alt="왕관을 조심스럽게 받쳐 든 두 손" /></div>
    <div className="tc-event-strip"><div><strong>10.05 <small>월</small> ~ 10.10 <small>토</small></strong><span>학교·예배 공간 개방 시각은 아직 정해지지 않았어요.</span></div><div className="tc-event-time"><span>예배 시작</span><strong>04:40</strong></div></div>
    <div className="tc-section"><VenueSwitch venue={venue} onChange={setVenue} label="예배 장소" />
      {venue === 'songrim' ? <SongrimWorship stage={stage} stale={stale} /> : stale ? <><StatusLead tone="neutral" label="정보 갱신이 필요한 상황 · 디자인 예시" title="현장 확인을 기다리고 있어요">이전 층별 상태는 표시하지 않습니다. 현장 안내를 확인해주세요.</StatusLead><StatusRow name="3·7·11층" value="확인 중" /></> : <><StatusLead label="드림센터 예배 공간 · 디자인 예시" title="층별 안내를 확인해주세요">3층, 7층, 11층 예배 공간이 있습니다. 실제 개방과 혼잡은 현장 안내에 따라주세요.</StatusLead><StatusRow name="3층" value="만석" tone="stop" /><StatusRow name="7층" value="혼잡" tone="warn" /><StatusRow name="11층" value="개방 확인 중" /></>}
      <div className="tc-mini-actions"><button type="button" onClick={goToParking}>주차 안내 <span aria-hidden="true">↗</span></button><button type="button" onClick={showRoute}>{venue === 'songrim' ? '대기·입장 흐름' : '장소 안내'} <span aria-hidden="true">↗</span></button></div>
      <p className="tc-panel-note">현황은 모두 디자인 검토용 예시입니다. 운영 시스템과 연결되지 않았고 실제 현장 상태를 뜻하지 않습니다.</p>
      {venue === 'songrim' && stage === 0 && !stale && <button className="tc-snack-teaser" type="button" onClick={goToSnack}><span><small>학교 밖 대기 장소 · 간식 나눔 안내</small><strong>{eventDay === 0 ? '10월 5일, 1청년부 3팀이 준비합니다' : '10월 6일부터, 원하는 분들이 자율적으로 나눠요'}</strong></span><span aria-hidden="true">→</span></button>}
    </div>
  </section>;
}

function ParkingPanel({ venue, setVenue, stage, stale, allFull, goToWorship }: { venue: Venue; setVenue: (venue: Venue) => void; stage: Stage; stale: boolean; allFull: boolean; goToWorship: () => void }) {
  const closed = venue === 'songrim' && stage === 0;
  return <section id="tc-panel-parking" className="tc-panel" role="tabpanel" aria-labelledby="tc-tab-parking"><PageHeading eyebrow="도착하기 전에" title="주차 안내">진입 가능 여부와 주차 공간을 확인해요.</PageHeading><div className="tc-section tc-section--topless"><VenueSwitch venue={venue} onChange={setVenue} label="주차 장소" />
    {stale ? <StatusLead tone="neutral" label="갱신 필요 · 디자인 예시" title="주차 현황을 확인 중이에요">오래된 정보로 진입을 안내하지 않습니다. 현장 주차요원의 안내를 따라주세요.</StatusLead> : closed ? <><StatusLead tone="neutral" label="송림본당 주차 · 디자인 예시" title="아직 차량이 들어갈 수 없어요">학교 출입문 개방 전입니다. 주차 공간이 있어도 진입할 수 없어요.</StatusLead><StatusRow name="학교 차량 출입" value="진입 전" /><StatusRow name="주차 공간" value="개방 후 안내" /></> : allFull ? <><StatusLead tone="red" label={`${venue === 'songrim' ? '송림본당' : '드림센터'} 주차 · 디자인 예시`} title="모든 주차 공간이 만차예요">추가 진입은 현장 주차요원의 안내를 따라주세요.</StatusLead><div className="tc-quiet"><strong>대체 주차 장소는 확인 중입니다.</strong><p>교회가 확인한 장소·이용 시간·진입 방법이 정해지면 안내합니다. 임의 주차는 피해주세요.</p></div></> : venue === 'songrim' ? <><StatusLead tone="amber" label="송림본당 주차 · 디자인 예시" title="교내 주차장이 혼잡해요">학교 안에서는 대기줄과 보행자 동선을 주의해주세요.</StatusLead><StatusRow name="학교 차량 출입" value="진입 가능" tone="good" /><StatusRow name="주차 공간" value="혼잡" tone="warn" /></> : <><StatusLead label="드림센터 주차 · 디자인 예시" title="지하층별 주차 현황을 확인해요">실제 이동할 층은 주차요원의 안내를 따라주세요.</StatusLead><div className="tc-floor-table">{[1, 2, 3, 4, 5].map((floor) => <div className="tc-floor-row" key={floor}><span><b>B{floor}</b><small>지하 {floor}층</small></span><span className={`tc-status-value tc-status-value--${floor <= 2 ? 'stop' : floor === 3 ? 'warn' : 'good'}`}>{floor <= 2 ? '만차' : floor === 3 ? '혼잡' : '주차 가능'}</span></div>)}</div></>}
    {venue === 'songrim' && <div className="tc-quiet"><strong>학교 출입과 예배당 입장은 달라요.</strong><p>학교 문이 열려 차량이 들어가도 본당·체육관은 아직 닫혀 있을 수 있습니다.</p></div>}
    <button className="tc-line-action" type="button" onClick={goToWorship}>예배 공간 개방 상태 보기 <span aria-hidden="true">→</span></button><p className="tc-panel-note">현황은 시안입니다. 오래된 상태는 안전하게 ‘확인 중’으로 전환합니다.</p><p className="tc-safety">운전 중 화면을 조작하지 마세요. 동승자가 확인하거나 안전하게 정차한 뒤 이용해주세요.</p>
  </div></section>;
}

function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return <header className="tc-page-heading"><span className="tc-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{children}</p></header>;
}

function PrayerPanel({ onPreview }: { onPreview: (text: string, sharing: boolean) => void }) {
  const [view, setView] = useState<PrayerView>('write');
  const [text, setText] = useState('');
  const [sharing, setSharing] = useState(false);
  return <section id="tc-panel-prayer" className="tc-panel" role="tabpanel" aria-labelledby="tc-tab-prayer"><PageHeading eyebrow="하나님 앞에 내려놓는 마음" title="함께 기도해요">잘 정리된 말이 아니어도 괜찮아요.</PageHeading><div className="tc-section tc-section--topless"><div className="tc-subtabs" role="group" aria-label="기도 메뉴"><button type="button" aria-pressed={view === 'write'} onClick={() => setView('write')}>기도 제목 쓰기</button><button type="button" aria-pressed={view === 'read'} onClick={() => setView('read')}>함께 읽기</button></div>
    {view === 'write' ? <form onSubmit={(event) => { event.preventDefault(); if (text.trim()) onPreview(text.trim(), sharing); }}><label className="tc-field-label" htmlFor="tc-prayer">어떤 마음으로 기도하고 있나요?</label><textarea id="tc-prayer" maxLength={600} value={text} onChange={(event) => setText(event.target.value)} placeholder="지금 마음에 있는 기도 제목을 적어주세요." required /><div className="tc-form-meta"><span>이름·연락처는 쓰지 않아도 돼요.</span><span>{text.length} / 600</span></div><label className="tc-checkbox"><input type="checkbox" checked={sharing} onChange={(event) => setSharing(event.target.checked)} /><span>함께 읽는 기도로 나누는 의향이 있어요.<small>선택하지 않으면 비공개입니다. 이 시안에서는 선택해도 공개되지 않아요.</small></span></label><div className="tc-quiet"><strong>내 화면에서만 확인하는 미리보기예요.</strong><p>서버로 보내거나 저장하지 않으며, 브라우저 저장소에도 남기지 않습니다.</p></div><button className="tc-primary" type="submit">입력 내용 미리보기 <span aria-hidden="true">→</span></button><p className="tc-footnote">다른 사람의 실명·연락처·민감한 사정은 적지 말아주세요.</p></form> : <div className="tc-empty"><span aria-hidden="true">“</span><h2>동의한 마음만,<br />조심스럽게 나눕니다.</h2><p>아직 공개된 기도 제목이 없습니다.<br />이 화면은 서버와 연결되지 않았습니다.</p></div>}
  </div></section>;
}

function SnackArt() {
  return <div className="tc-snack-art" aria-hidden="true"><svg viewBox="0 0 350 118"><path d="M25 106H325" stroke="currentColor" fill="none" /><g transform="translate(54,7) rotate(-7 40 50)"><rect width="72" height="91" rx="3" fill="#f4efe6" stroke="#967f64" /><path d="M0 10H72M0 80H72" stroke="#b4a089" /><path d="M32 59c-15-5-13-23 5-28 13 9 15 26-5 28zm3-24v34" stroke="#727c67" fill="none" /></g><g transform="translate(161,29) rotate(7 37 36)"><path d="M0 0h80v68H0z" fill="#e9dbc6" stroke="#987a52" /><circle cx="40" cy="34" r="21" fill="#cfad78" stroke="#aa8350" /></g><g transform="translate(275,79) rotate(-15)"><path d="M-7-8L-24-16v31l17-10m37-13l20-8v31L30 5" fill="#ddd1c2" stroke="#a48b6e" /><rect x="-8" y="-12" width="39" height="24" rx="10" fill="#f3e9d9" stroke="#a48b6e" /></g></svg><span>티백 · 낱개 포장 간식</span></div>;
}

function StorySection({ stories, onAdd, onDelete, onHide, onMore }: { stories: Story[]; onAdd: (name: string, text: string) => string | null; onDelete: (id: number) => void; onHide: (id: number) => void; onMore: () => void }) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [writing, setWriting] = useState(false);
  const visible = stories.slice(0, 3);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const error = onAdd(name, text);
    if (error) { setMessage(error); return; }
    setName(''); setText(''); setWriting(false); setMessage('내 화면에만 추가했어요. 다른 사람에게 공개되지 않습니다.');
  };
  return <section className="tc-stories" aria-labelledby="tc-stories-title"><span className="tc-eyebrow">간식 나눔 안에서</span><h2 id="tc-stories-title">오늘 나눈 이야기</h2><p className="tc-story-intro">나눈 이야기나 고마웠던 마음을 남겨주세요. 함께 기다린 이야기도 좋아요.</p><button className="tc-line-action" type="button" aria-expanded={writing} aria-controls="tc-story-form" onClick={() => setWriting((current) => !current)}>{writing ? '작성창 접기' : '한마디 남기기'} <span aria-hidden="true">{writing ? '−' : '＋'}</span></button><form id="tc-story-form" hidden={!writing} onSubmit={submit}><label className="tc-field-label" htmlFor="tc-story">이야기</label><textarea id="tc-story" className="tc-story-text" maxLength={300} value={text} onChange={(event) => setText(event.target.value)} placeholder="오늘 나눈 작은 마음을 적어주세요." required /><div className="tc-form-meta"><span>개인정보를 적지 말아주세요.</span><span>{text.length} / 300</span></div><label className="tc-field-label" htmlFor="tc-story-name">이름 또는 별명 <small>선택 · 비우면 익명</small></label><input id="tc-story-name" className="tc-text-input" maxLength={20} value={name} onChange={(event) => setName(event.target.value)} placeholder="익명" /><div className="tc-privacy-caution"><strong>공개될 글이라고 생각하고 적어주세요.</strong><p>전화번호·이메일 같은 기본 개인정보 표시는 제한하지만, 모든 개인정보를 자동으로 찾아내지는 못합니다.</p></div><button className="tc-primary" type="submit">내 화면에 이야기 추가 <span aria-hidden="true">＋</span></button><p className="tc-local-only">내 화면에만 추가 · 다른 사람에게 공개되지 않음</p></form>{message && <p className="tc-form-status" role="status">{message}</p>}
    {visible.length === 0 ? <div className="tc-story-empty"><strong>아직 추가한 이야기가 없어요.</strong><p>이야기를 남겨보세요. 지금은 내 화면에서만 확인할 수 있어요.</p></div> : <div className="tc-story-list">{visible.map((story) => <article key={story.id} className="tc-story-card"><header><strong>{story.name}</strong><span>내 화면의 미리보기</span></header><p>{story.text}</p><footer><button type="button" onClick={() => onDelete(story.id)}>삭제</button><button type="button" onClick={() => { onHide(story.id); setMessage('이 카드만 내 화면에서 숨겼어요. 서버 신고는 접수되지 않았습니다.'); }}>숨기기·신고 체험</button></footer></article>)}</div>}
    {stories.length > 3 && <button className="tc-line-action" type="button" onClick={onMore}>더 보기 <span aria-hidden="true">→</span></button>}
  </section>;
}

function SharingPanel({ eventDay, stories, onAddStory, onDeleteStory, onHideStory, onMoreStories, view, setView, venue, setVenue }: { eventDay: number; stories: Story[]; onAddStory: (name: string, text: string) => string | null; onDeleteStory: (id: number) => void; onHideStory: (id: number) => void; onMoreStories: () => void; view: SnackView; setView: (view: SnackView) => void; venue: Venue; setVenue: (venue: Venue) => void }) {
  const restaurant = restaurants[venue];
  return <section id="tc-panel-sharing" className="tc-panel" role="tabpanel" aria-labelledby="tc-tab-sharing"><PageHeading eyebrow="기다리는 시간도, 예배 후에도" title="함께 나눠요">작은 간식 하나, 따뜻한 아침 한 끼.</PageHeading><div className="tc-section tc-section--topless"><div className="tc-subtabs" role="group" aria-label="나눔 메뉴"><button type="button" aria-pressed={view === 'snacks'} onClick={() => setView('snacks')}>간식 나눔</button><button type="button" aria-pressed={view === 'breakfast'} onClick={() => setView('breakfast')}>아침 식사</button></div>
    {view === 'snacks' ? <><SnackArt /><div className="tc-snack-place"><strong>송림본당만</strong><span>학교 개방 전 · 학교 밖 대기 장소</span></div><h2 className="tc-serif-title">기다리는 동안, 함께 나눠요.</h2>{eventDay === 0 ? <div className="tc-day-copy"><span className="tc-tiny">10월 5일(월) · 첫날</span><p><strong>1청년부 3팀이 간식을 준비합니다.</strong><br />간식을 준비하지 않으셔도 편하게 함께해 주세요.</p></div> : <div className="tc-day-copy"><span className="tc-tiny">{eventDates[eventDay][0]} · 자율 나눔</span><p>나눔을 원하시는 분은 <strong>포장된 티백·사탕·캔디·과자·비스킷</strong>을 가져오셔도 좋아요.<br />준비하지 않으셔도 편하게 함께해 주세요.</p></div>}<div className="tc-water"><strong>따뜻한 물은 이렇게 이용해요.</strong><p>개인 보온병에 따뜻한 물을 준비해 오시거나,<br /><b>체육관이 열린 뒤 내부 온수 정수기</b>를 이용하실 수 있어요.</p><small>학교 출입문만 열렸을 때는 이용할 수 없습니다. 학교 밖에서는 뜨거운 물을 나눠드리지 않습니다.</small></div><details className="tc-guidelines"><summary>미개봉 티백·소포장 간식만 나눠요 <span aria-hidden="true">＋</span></summary><div><p><b>가능</b> 미개봉 티백, 개별 포장 사탕·캔디·과자·비스킷</p><p><b>제외</b> 직접 만든 음식, 뜯은 포장, 컵에 따른 음료</p><p>소비기한과 알레르기 표시를 확인하고 줄과 보행로를 막지 말아주세요.</p></div></details><p className="tc-footnote">학교 밖의 정확한 지점과 시작·종료 시각은 아직 정해지지 않았습니다.</p><StorySection stories={stories} onAdd={onAddStory} onDelete={onDeleteStory} onHide={onHideStory} onMore={onMoreStories} /><button className="tc-line-action" type="button" onClick={() => setView('breakfast')}>예배 후 아침 식당도 살펴보기 <span aria-hidden="true">→</span></button></> : <><div className="tc-breakfast-intro"><span className="tc-tiny">예배를 마친 뒤</span><h2>같이 아침 먹고 갈까요?</h2><p>예배 종료 시각은 아직 정해지지 않았어요. 아래는 식당의 공개 영업정보를 바탕으로 둔 장소별 후보 1곳입니다.</p></div><VenueSwitch venue={venue} onChange={setVenue} label="아침 식사 지역" />{venue === 'songrim' && <div className="tc-district-note">송림고 가까운 후보는 추가 확인 중이에요. 아래 식당은 <strong>야탑으로 이동이 필요</strong>하며 도보권 추천이 아닙니다.</div>}<article className="tc-restaurant"><div><h2>{restaurant.name}</h2><span>{restaurant.hours}</span></div><p>{restaurant.type} · {restaurant.area}</p><p>{restaurant.address}</p><small>후보 1 · 공개 영업정보 기준 · 특새 기간 영업·휴무는 매장 확인 필요</small><footer><a href={restaurant.map} target="_blank" rel="noopener noreferrer">지도·영업정보 ↗</a><a href={restaurant.source} target="_blank" rel="noopener noreferrer">참고 자료 ↗</a></footer></article><p className="tc-footnote">‘지금 영업 중’을 뜻하지 않으며 교회 제휴 식당이 아닙니다.</p></>}
  </div></section>;
}

function PhotosPanel() {
  const [photo, setPhoto] = useState<{ url: string; name: string } | null>(null);
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);
  const clear = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPhoto(null);
    if (inputRef.current) inputRef.current.value = '';
  };
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setMessage('JPG·PNG·WebP 형식의 8MB 이하 사진을 선택해주세요.');
      event.target.value = '';
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setPhoto({ url, name: file.name });
    setMessage('내 화면에서만 사진 미리보기를 만들었어요. 업로드되지 않았습니다.');
  };
  return <section id="tc-panel-photos" className="tc-panel" role="tabpanel" aria-labelledby="tc-tab-photos"><PageHeading eyebrow="이 새벽을 오래 기억하도록" title="우리의 사진">함께한 순간을 한 장씩 남겨요.</PageHeading><div className="tc-section tc-section--topless">{photo ? <div className="tc-photo-preview"><img src={photo.url} alt={`내 기기에서만 보이는 선택한 사진: ${photo.name}`} /><p>내 화면의 미리보기 · 서버 전송 없음</p><button className="tc-line-action" type="button" onClick={clear}>사진 지우기 <span aria-hidden="true">×</span></button></div> : <div className="tc-photo-empty"><div className="tc-photo-frame" aria-hidden="true"><span /><i /></div><h2>첫 새벽을 기다리는 자리</h2><p>아직 공개된 사진이 없습니다.</p></div>}<label className="tc-primary tc-upload" htmlFor="tc-photo-input">내 사진으로 미리보기 <span aria-hidden="true">＋</span></label><input ref={inputRef} id="tc-photo-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} hidden /><p className="tc-footnote">내 화면에서만 보이며 업로드·공개되지 않아요.<br />JPG·PNG·WebP, 최대 8MB</p>{message && <p className="tc-form-status" role="status">{message}</p>}<div className="tc-quiet"><strong>함께 나온 분의 동의를 먼저 받아주세요.</strong><p>특히 어린이의 얼굴과 이름이 드러나는 사진은 보호자 동의와 공개 범위를 확인해야 합니다.</p></div></div></section>;
}

type ModalState = { type: 'poster' } | { type: 'settings' } | { type: 'route'; venue: Venue } | { type: 'prayer'; text: string; sharing: boolean } | { type: 'stories' } | null;

export function CompanionApp() {
  const [tab, setTab] = useState<TabId>('worship');
  const [venue, setVenue] = useState<Venue>('songrim');
  const [stage, setStage] = useState<Stage>(2);
  const [stale, setStale] = useState(false);
  const [parkingFull, setParkingFull] = useState<Record<Venue, boolean>>({ songrim: false, dream: false });
  const [eventDay, setEventDay] = useState(0);
  const [sharingView, setSharingView] = useState<SnackView>('snacks');
  const [stories, setStories] = useState<Story[]>([]);
  const [hiddenStories, setHiddenStories] = useState<Set<number>>(() => new Set());
  const [modal, setModal] = useState<ModalState>(null);
  const nextStoryId = useRef(1);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({ worship: null, parking: null, prayer: null, sharing: null, photos: null });
  const mainId = useId();
  const mainRef = useRef<HTMLElement>(null);
  const visibleStories = stories.filter((story) => !hiddenStories.has(story.id));
  const selectTab = (next: TabId, focus = false) => {
    setTab(next);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    if (focus) requestAnimationFrame(() => tabRefs.current[next]?.focus());
  };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let index = tabs.findIndex((item) => item.id === tab);
    if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'ArrowRight') index = (index + 1) % tabs.length;
    if (event.key === 'Home') index = 0;
    if (event.key === 'End') index = tabs.length - 1;
    selectTab(tabs[index].id, true);
  };
  const addStory = (name: string, text: string) => {
    const cleanName = name.trim() || '익명';
    const cleanText = text.trim();
    const privacyCue = /(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b)|(?:\b(?:01[016789]|0\d{1,2})[-\s]?\d{3,4}[-\s]?\d{4}\b)/i;
    if (!cleanText) return '이야기를 입력해주세요.';
    if (privacyCue.test(cleanText) || privacyCue.test(cleanName)) return '전화번호나 이메일로 보이는 내용은 지우고 다시 시도해주세요.';
    const story = { id: nextStoryId.current++, name: cleanName, text: cleanText };
    setStories((current) => [story, ...current]);
    return null;
  };
  return <div className="tc-companion" lang="ko"><aside className="tc-desktop-note" aria-label="시안 설명"><span>WOORI CHURCH · AUTUMN 2026</span><h1>새벽의 마음을,<br />그대로.</h1><p>예배에 오기 전부터<br />함께 아침을 먹는 시간까지.</p><img src={crownImage} alt="공식 포스터에서 가져온 왕관과 두 손" /><small>실시간 현황·기도 접수·사진 게시가 연결되지 않은 디자인 검토용입니다.</small></aside><div className="tc-app"><header className="tc-app-header"><button className="tc-brand" type="button" onClick={() => selectTab('worship')} aria-label="예배 첫 화면"><strong>우리</strong><span>분당우리교회</span></button><button className="tc-text-button" type="button" onClick={() => setModal({ type: 'poster' })}>행사 포스터 <span aria-hidden="true">↗</span></button></header><div className="tc-demo-banner"><span>디자인 시안 · 모든 현황은 예시</span><button type="button" onClick={() => setModal({ type: 'settings' })}>상황 바꿔보기</button></div><main id={mainId} ref={mainRef} tabIndex={-1}>
    <div hidden={tab !== 'worship'}><WorshipPanel venue={venue} setVenue={setVenue} stage={stage} stale={stale} eventDay={eventDay} goToParking={() => selectTab('parking')} goToSnack={() => { setSharingView('snacks'); selectTab('sharing'); }} showRoute={() => setModal({ type: 'route', venue })} /></div>
    <div hidden={tab !== 'parking'}><ParkingPanel venue={venue} setVenue={setVenue} stage={stage} stale={stale} allFull={parkingFull[venue]} goToWorship={() => selectTab('worship')} /></div>
    <div hidden={tab !== 'prayer'}><PrayerPanel onPreview={(text, sharing) => setModal({ type: 'prayer', text, sharing })} /></div>
    <div hidden={tab !== 'sharing'}><SharingPanel eventDay={eventDay} venue={venue} setVenue={setVenue} view={sharingView} setView={(next) => { setSharingView(next); if (mainRef.current) mainRef.current.scrollTop = 0; }} stories={visibleStories} onAddStory={addStory} onDeleteStory={(id) => setStories((current) => current.filter((story) => story.id !== id))} onHideStory={(id) => setHiddenStories((current) => new Set(current).add(id))} onMoreStories={() => setModal({ type: 'stories' })} /></div>
    <div hidden={tab !== 'photos'}><PhotosPanel /></div>
  </main><nav className="tc-bottom-nav" role="tablist" aria-label="주요 메뉴">{tabs.map((item) => <button key={item.id} id={`tc-tab-${item.id}`} ref={(element) => { tabRefs.current[item.id] = element; }} type="button" role="tab" aria-controls={`tc-panel-${item.id}`} aria-selected={tab === item.id} tabIndex={tab === item.id ? 0 : -1} onClick={() => selectTab(item.id)} onKeyDown={onTabKeyDown}><TabIcon tab={item.id} /><b>{item.label}</b></button>)}</nav></div>
    {modal?.type === 'poster' && <Modal title="2026 가을특별새벽부흥회" onClose={() => setModal(null)}><img className="tc-poster" src={posterImage} alt="공식 행사 포스터. 하나님 마음에 합한 사람. 2026년 10월 5일부터 10일, 새벽 4시 40분 예배 시작." /><p className="tc-footnote">04:40은 예배 시작 시각입니다. 학교와 예배 공간 개방 시각은 아직 정해지지 않았습니다.</p></Modal>}
    {modal?.type === 'settings' && <Modal title="상황 바꿔보기" onClose={() => setModal(null)}><p className="tc-modal-intro">디자인 검토용입니다. 실제 날짜나 현장 상태와 무관하게 미리 볼 행사일과 상황을 선택합니다.</p><label className="tc-modal-label" htmlFor="tc-event-day">미리 볼 예배일</label><select id="tc-event-day" value={eventDay} onChange={(event) => setEventDay(Number(event.target.value))}>{eventDates.map((date, index) => <option value={index} key={date[0]}>{date[0]} · {date[1]}</option>)}</select><label className="tc-modal-label" htmlFor="tc-stage">송림본당 개방 단계</label><select id="tc-stage" value={stage} onChange={(event) => setStage(Number(event.target.value) as Stage)}>{stageNames.map((name, index) => <option value={index} key={name}>{index + 1}. {name}</option>)}</select><label className="tc-checkbox"><input type="checkbox" checked={stale} onChange={(event) => setStale(event.target.checked)} /><span>현황 정보가 오래된 상황</span></label><label className="tc-checkbox"><input type="checkbox" checked={parkingFull[venue]} onChange={(event) => setParkingFull((current) => ({ ...current, [venue]: event.target.checked }))} /><span>선택 장소의 모든 주차 공간 만차</span><small>현재 선택: {venue === 'songrim' ? '송림본당' : '드림센터'}</small></label><div className="tc-quiet"><strong>운영자용 시안 메모</strong><p>송림본당만 · 학교 개방 전 학교 밖 · 최종 정리 역할: 교육자<br />학교 밖 온수 배부 없음 · 보온병은 선택 · 체육관 자체 개방 후 내부 온수 정수기 이용<br />정확한 나눔 지점과 시작·종료 시각은 미정</p></div><button className="tc-primary" type="button" onClick={() => setModal(null)}>선택한 상황 보기</button></Modal>}
    {modal?.type === 'route' && <Modal title={modal.venue === 'songrim' ? '학교 밖에서 예배 공간까지' : '서현 드림센터 장소 안내'} onClose={() => setModal(null)}>{modal.venue === 'songrim' ? <><p className="tc-modal-intro">운영 흐름을 설명하는 디자인 예시입니다. 실제 줄 합류 지점·보행로·출입구는 현장 확인 후 안내합니다.</p>{stageNames.map((name, index) => <div className="tc-route-step" key={name}><b>{index + 1}</b><span><strong>{name}</strong><small>{index === 0 ? '학교 밖에서 대기하며 차량도 진입할 수 없습니다.' : index === 1 ? '학교 안 보행 동선으로 이동하지만 건물은 아직 닫혀 있습니다.' : index === 2 ? '체육관이 먼저 열리고 본당은 아직 입장 전입니다.' : index === 3 ? '본당 1·2층 입장을 함께 안내합니다.' : '본당 입장은 마감되고 체육관 혼잡을 확인합니다.'}</small></span></div>)}</> : <><p><strong>예배 공간:</strong> 지상 3층·7층·11층</p><p><strong>주차장:</strong> 지하 B1~B5</p><p className="tc-safety">개방 여부와 층별 이용은 현장 안내를 따라주세요. 이 내용은 실시간 상태가 아닙니다.</p></>}</Modal>}
    {modal?.type === 'prayer' && <Modal title="내 기도 제목 미리보기" onClose={() => setModal(null)}><span className="tc-tiny">전송·저장되지 않은 미리보기</span><div className="tc-preview-text">{modal.text}</div><p>{modal.sharing ? '공개 의향을 선택했지만 이 시안에서는 공개되지 않습니다.' : '비공개 선택입니다. 다른 사람에게 보이지 않습니다.'}</p><p className="tc-safety">서버 접수 기능이 없으며 창을 닫으면 계속 수정할 수 있습니다.</p></Modal>}
    {modal?.type === 'stories' && <Modal title="내 화면의 이야기 더 보기" onClose={() => setModal(null)}>{visibleStories.map((story) => <article key={story.id} className="tc-story-card"><header><strong>{story.name}</strong><span>내 화면의 미리보기</span></header><p>{story.text}</p></article>)}</Modal>}
  </div>;
}
