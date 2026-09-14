import { type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { photos } from './content';

interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function AccessibleDialog({ open, title, onClose, children }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const first = dialog.querySelector<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
    window.setTimeout(() => first?.focus(), 0);
    return () => {
      if (dialog.open) dialog.close();
      returnFocusRef.current?.focus();
    };
  }, [open]);

  function trapFocus(event: ReactKeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  if (!open) return null;
  return (
    <dialog ref={dialogRef} className="wa-dialog" aria-modal="true" aria-labelledby="wa-dialog-title" onKeyDown={trapFocus} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="wa-dialog-bar"><p className="wa-kicker">예시 보기</p><button type="button" className="wa-icon-button" onClick={onClose} aria-label="닫기">닫기</button></div>
      <h2 id="wa-dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}

function TableIllustration() {
  return (
    <svg className="wa-table-art" viewBox="0 0 760 460" role="img" aria-labelledby="wa-table-art-title wa-table-art-desc">
      <title id="wa-table-art-title">예배 뒤 나눔 테이블</title>
      <desc id="wa-table-art-desc">따뜻한 차가 담긴 컵과 보온병, 접힌 안내지가 놓인 테이블 일러스트</desc>
      <defs>
        <linearGradient id="table-light" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e8f2ff"/><stop offset="1" stopColor="#b8d8ff"/></linearGradient>
        <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#292b30"/><stop offset=".5" stopColor="#62666c"/><stop offset="1" stopColor="#202226"/></linearGradient>
      </defs>
      <rect width="760" height="460" rx="38" fill="url(#table-light)"/>
      <circle cx="635" cy="72" r="128" fill="#fff" opacity=".45"/>
      <path d="M0 314 C188 275 451 301 760 245 V460 H0Z" fill="#f7f7f8"/>
      <path d="M398 105h120c19 0 34 15 34 34v175H364V139c0-19 15-34 34-34Z" fill="url(#steel)"/>
      <rect x="392" y="78" width="132" height="41" rx="16" fill="#18191c"/>
      <path d="M552 159h24c39 0 61 24 61 58 0 36-25 59-70 59h-15" fill="none" stroke="#44484e" strokeWidth="18"/>
      <ellipse cx="458" cy="316" rx="116" ry="22" fill="#99a4af" opacity=".25"/>
      <g transform="translate(150 213)">
        <ellipse cx="92" cy="143" rx="105" ry="19" fill="#a2a9b0" opacity=".2"/>
        <path d="M16 23h135l-12 109c-2 15-14 25-29 25H55c-15 0-28-11-30-26Z" fill="#fff"/>
        <path d="M152 45h19c43 0 44 70 2 71h-27" fill="none" stroke="#fff" strokeWidth="15"/>
        <ellipse cx="84" cy="25" rx="68" ry="18" fill="#d9e1e9"/>
        <ellipse cx="84" cy="25" rx="54" ry="11" fill="#9f6236"/>
        <path d="M63 1c-14-23 17-28 4-52M100 1c-14-23 17-28 4-52" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".75"/>
      </g>
      <g transform="rotate(-7 620 350)"><rect x="541" y="293" width="145" height="112" rx="5" fill="#fff"/><path d="M565 328h85M565 346h68M565 364h76" stroke="#8ca0b5" strokeWidth="6" strokeLinecap="round"/><circle cx="657" cy="315" r="8" fill="#0071e3"/></g>
    </svg>
  );
}

const initialNotices = [
  { id: 1, title: '예배 뒤, 따뜻한 차를 나눠요', meta: '송림본당 로비 · 예시', body: '예배 후 로비 테이블에 따뜻한 차가 준비되어 있다고 가정한 안내 예시입니다. 실제 운영 안내가 아닙니다.' },
  { id: 2, title: '처음 오신 분과 함께 앉아요', meta: '드림센터 · 예시', body: '처음 참여하는 분이 혼자 머물지 않도록 옆자리를 내어드리는 상황을 담은 예시입니다.' },
];

export function SharingScene() {
  const [notices, setNotices] = useState(initialNotices);
  const [opened, setOpened] = useState<(typeof initialNotices)[number] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);

  function addNotice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const title = String(data.get('notice-title') ?? '').trim();
    const body = String(data.get('notice-body') ?? '').trim();
    if (!title || !body) return;
    setNotices((items) => [...items, { id: Date.now(), title, meta: '이번 세션에만 보이는 예시', body }]);
    event.currentTarget.reset();
    setSaved(true);
    setShowForm(false);
  }

  function reset() {
    setNotices(initialNotices);
    setSaved(false);
    setShowForm(false);
  }

  return (
    <section className="wa-section wa-sharing" id="wa-sharing" aria-labelledby="wa-sharing-title">
      <div className="wa-section-copy"><p className="wa-kicker">우리 나눔</p><h2 id="wa-sharing-title">예배 후에도, 함께 나눠요.</h2><span className="wa-example-label">예시 화면</span><p>따뜻한 차 한 잔과 반가운 인사처럼, 예배 뒤의 작은 나눔을 전합니다.</p></div>
      <div className="wa-sharing-layout">
        <TableIllustration />
        <div className="wa-notice-column">
          <div className="wa-list-heading"><span>나눔 안내</span><span>모두 예시</span></div>
          {notices.map((notice) => <button type="button" className="wa-notice" key={notice.id} onClick={() => setOpened(notice)}><span>{notice.meta}</span><strong>{notice.title}</strong><i aria-hidden="true">보기</i></button>)}
          <div className="wa-inline-actions"><button type="button" className="wa-primary" onClick={() => { setShowForm(true); setSaved(false); }}>나눔 예시 만들기</button>{notices.length > initialNotices.length && <button type="button" className="wa-link-button" onClick={reset}>예시 초기화</button>}</div>
          {saved && <p className="wa-success" role="status">이 브라우저 화면에만 추가했습니다. 전송되지 않았습니다.</p>}
          {showForm && <form className="wa-local-form" aria-label="나눔 예시 체험" onSubmit={addNotice}>
            <div className="wa-form-intro"><strong>예시 체험</strong><button type="button" onClick={() => setShowForm(false)}>취소</button></div>
            <p>실제 이름, 연락처, 개인 사연을 입력하지 마세요. 저장하거나 전송하지 않습니다.</p>
            <label>안내 제목<input name="notice-title" maxLength={36} required /></label>
            <label>짧은 안내<textarea name="notice-body" maxLength={120} required /></label>
            <button className="wa-primary" type="submit">화면에만 추가</button>
          </form>}
        </div>
      </div>
      <AccessibleDialog open={opened !== null} title={opened?.title ?? ''} onClose={() => setOpened(null)}><p className="wa-dialog-meta">{opened?.meta}</p><p>{opened?.body}</p><p className="wa-dialog-note">예시 콘텐츠이며 실제 교회 공지가 아닙니다.</p></AccessibleDialog>
    </section>
  );
}

const postcards = [
  { question: '진로를 아직 정하지 못했어요. 뒤처지는 것 같을 때 어른들은 어떻게 견뎠나요?', answer: '저도 오래 헤맸습니다. 빨리 정하는 것보다 오늘 할 수 있는 작은 경험을 쌓는 일이 더 도움이 됐어요.' },
  { question: '친구에게 먼저 미안하다고 말하는 게 왜 이렇게 어려울까요?', answer: '용기는 두렵지 않은 마음보다, 두려워도 관계를 소중히 여겨 한 걸음 내딛는 쪽에 가까웠어요.' },
  { question: '기도해도 마음이 복잡한 날에는 어떻게 하세요?', answer: '잘 정리된 말 대신 “오늘은 복잡해요”라고 그대로 말씀드려요. 그리고 믿을 만한 어른에게도 도움을 청합니다.' },
];

export function PostcardScene() {
  const [index, setIndex] = useState(0);
  const [turned, setTurned] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localCard, setLocalCard] = useState<{ question: string; answer: string } | null>(null);
  const activeCards = localCard ? [...postcards, localCard] : postcards;
  const card = activeCards[index] ?? activeCards[0];
  const isLocalCard = localCard !== null && index === postcards.length;

  function saveCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const question = String(data.get('sample-question') ?? '').trim();
    const answer = String(data.get('sample-answer') ?? '').trim();
    if (!question || !answer) return;
    setLocalCard({ question, answer });
    setIndex(postcards.length);
    setTurned(false);
    setSaved(true);
    setShowForm(false);
    event.currentTarget.reset();
  }

  function resetCard() {
    setLocalCard(null);
    setIndex(0);
    setTurned(false);
    setSaved(false);
  }

  return (
    <section className="wa-section wa-postcards" id="wa-postcards" aria-labelledby="wa-postcards-title">
      <div className="wa-postcard-copy"><p className="wa-kicker">우리 엽서</p><h2 id="wa-postcards-title">묻고 싶었던 이야기.<br />함께 읽는 답장.</h2><span className="wa-example-label">가상 엽서 예시</span><p>서로의 질문과 살아온 경험을 엽서 한 장에 담아 함께 읽습니다.</p><div className="wa-card-controls"><button type="button" onClick={() => { setIndex((index + activeCards.length - 1) % activeCards.length); setTurned(false); }} aria-label="이전 엽서">이전</button><span>{index + 1} / {activeCards.length}</span><button type="button" onClick={() => { setIndex((index + 1) % activeCards.length); setTurned(false); }} aria-label="다음 엽서">다음</button>{localCard && <button type="button" onClick={resetCard}>내 예시 지우기</button>}</div></div>
      <div className="wa-postcard-stage">
        <button type="button" className={`wa-postcard${turned ? ' is-turned' : ''}`} onClick={() => setTurned((value) => !value)} aria-pressed={turned} aria-label={turned ? '질문 면 보기' : '답장 면 보기'}>
          <span className="wa-stamp" aria-hidden="true">우리<br />엽서</span><span className="wa-example-tag">{isLocalCard ? '내가 쓴 가상 예시' : '가상 예시'}</span><small>{turned ? '어른의 답장' : '청소년의 질문'}</small><strong>{turned ? card.answer : card.question}</strong><span className="wa-turn-hint">{turned ? '질문으로 돌아가기' : '답장 펼쳐보기'}</span>
        </button>
        <button type="button" className="wa-primary" onClick={() => { setShowForm(true); setSaved(false); }}>엽서 예시 써보기</button>
        {saved && <p className="wa-success" role="status">예시를 화면에서 확인했습니다. 저장되거나 전송되지 않았습니다.</p>}
        {showForm && <form className="wa-local-form wa-card-form" aria-label="엽서 예시 체험" onSubmit={saveCard}>
          <div className="wa-form-intro"><strong>예시 체험</strong><button type="button" onClick={() => setShowForm(false)}>취소</button></div>
          <p>실제 개인 고민, 이름, 학교, 연락처를 입력하지 마세요. 이 체험은 내용을 저장하지 않습니다.</p>
          <label>가상의 질문<textarea name="sample-question" maxLength={100} required /></label>
          <label>가상의 답장<textarea name="sample-answer" maxLength={140} required /></label>
          <button className="wa-primary" type="submit">전송 없이 확인</button>
        </form>}
      </div>
    </section>
  );
}

function DawnArtwork() {
  return <svg viewBox="0 0 700 520" role="img" aria-label="새벽빛이 들어오는 예배 공간을 그린 일러스트"><defs><linearGradient id="dawn" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#c9e1ff"/><stop offset=".65" stopColor="#f4f7fb"/><stop offset="1" stopColor="#fff"/></linearGradient></defs><rect width="700" height="520" fill="url(#dawn)"/><circle cx="542" cy="135" r="62" fill="#fff" opacity=".92"/><path d="M0 360 136 284l112 55 135-109 95 75 95-39 127 80v174H0Z" fill="#1d1d1f" opacity=".12"/><path d="M100 520V335h500v185" fill="#f8f8fa"/><path d="M225 520V385h250v135" fill="#fff"/><path d="M350 350v-82M314 298h72" stroke="#3779ba" strokeWidth="12" strokeLinecap="round"/><path d="M155 462h390" stroke="#a7bfd6" strokeWidth="8" strokeLinecap="round"/></svg>;
}

interface GalleryItem { kind: 'image' | 'art'; src?: string; alt: string; caption: string; }
const galleryItems: GalleryItem[] = [
  { kind: 'image', src: photos.worship.image, alt: photos.worship.alt, caption: photos.worship.caption },
  { kind: 'image', src: photos.family.image, alt: photos.family.alt, caption: photos.family.caption },
  { kind: 'art', alt: '새벽빛이 들어오는 예배 공간 일러스트', caption: '새벽 예배의 빛 · 자체 제작 일러스트' },
];

export function PhotoScene() {
  const [opened, setOpened] = useState<GalleryItem | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  useEffect(() => () => { if (localPreview) URL.revokeObjectURL?.(localPreview); }, [localPreview]);

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPG, PNG, WebP 이미지만 선택할 수 있습니다.'); event.currentTarget.value = ''; return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('8MB 이하 이미지만 선택할 수 있습니다.'); event.currentTarget.value = ''; return;
    }
    const url = URL.createObjectURL?.(file);
    if (!url) { setError('이 브라우저에서는 미리보기를 만들 수 없습니다.'); return; }
    setLocalPreview(url); setFileName(file.name);
  }

  function resetPreview() {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLocalPreview(null); setFileName(''); setError('');
  }

  return (
    <section className="wa-section wa-photos" id="wa-photos" aria-labelledby="wa-photos-title">
      <div className="wa-photo-head"><div><p className="wa-kicker">우리 사진</p><h2 id="wa-photos-title">오늘의 새벽을<br />함께 남겨요.</h2></div><div className="wa-photo-intro"><span className="wa-example-label">사진 구성 예시</span><p>함께 예배한 순간을 한 장씩 모아 오래 기억합니다.</p></div></div>
      <div className="wa-gallery">
        {galleryItems.map((item, itemIndex) => <figure className={`wa-gallery-item wa-gallery-item-${itemIndex + 1}`} key={item.caption}><button type="button" onClick={() => setOpened(item)} aria-label={`${item.caption} 크게 보기`}>{item.kind === 'image' ? <img src={item.src} alt={item.alt} loading="lazy" /> : <DawnArtwork />}</button><figcaption>{item.caption}</figcaption></figure>)}
      </div>
      <div className="wa-upload">
        <div><p className="wa-kicker">예시 체험 · 로컬 미리보기</p><h3>내 사진이 이 자리에 놓인다면</h3><p>실제 게시 기능이 아닙니다. JPG, PNG, WebP · 최대 8MB</p></div>
        <label className="wa-primary wa-file-label">사진 선택<input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} /></label>
        {error && <p className="wa-error" role="alert">{error}</p>}
        {localPreview && <figure className="wa-local-preview"><img src={localPreview} alt="선택한 사진의 로컬 미리보기"/><figcaption>{fileName} · 이 화면에만 표시됨, 전송되지 않음</figcaption><button type="button" className="wa-link-button" onClick={resetPreview}>미리보기 지우기</button></figure>}
      </div>
      <AccessibleDialog open={opened !== null} title="사진 크게 보기" onClose={() => setOpened(null)}>{opened?.kind === 'image' ? <img className="wa-dialog-image" src={opened.src} alt={opened.alt} /> : <DawnArtwork />}<p className="wa-dialog-meta">{opened?.caption}</p></AccessibleDialog>
    </section>
  );
}
