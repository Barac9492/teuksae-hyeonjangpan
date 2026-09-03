import { useEffect, useMemo, useRef, useState } from "react";
import type { AppConfig } from "../../domain/config";
import type { AppSnapshot, MomentDraft } from "../../domain/types";
import { MomentsPanel } from "../moments/MomentsPanel";
import { COM_WORDS, type ComTarget } from "./comWords";
import {
  SHARE_KIND_LABELS,
  type CommunityJournal,
  type ShareKind,
} from "./communityJournal";
import {
  DAWN_PHASES,
  describeDawn,
  formatMinute,
  minuteOfDay,
} from "./dawnSky";
import { MergeHero } from "./MergeHero";
import {
  ALLERGEN_OPTIONS,
  buildCarpoolMessage,
  buildSnackMessage,
  buildThanksMessage,
  copyText,
  type CarpoolRole,
} from "./shareMessages";
import { SideBySide } from "./SideBySide";
import { formatDuration, planDriverNight } from "./sleepGuard";
import { drawWeCard, shareWeCard } from "./weCard";
import { WeGlyph } from "./WeGlyph";
import { composePoem } from "./wePoem";

interface CommunityViewProps {
  config: AppConfig;
  snapshot: AppSnapshot;
  journal: CommunityJournal;
  onToggleTodayAttendance: () => void;
  onCreateMomentDraft: (draft: MomentDraft) => void;
  onUploadMoment?: (file: File, draft: MomentDraft) => Promise<void>;
  repositoryMode: "local" | "remote";
  connected: boolean;
  onToast: (message: string) => void;
}

const SECTION_IDS: Record<ComTarget, string> = {
  circle: "we-glyph",
  snack: "we-snack",
  carpool: "we-carpool",
  photo: "we-photo",
};

function scrollToSection(id: string): void {
  const element = document.getElementById(id);
  if (element && typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function formatEntryTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function CommunityView({
  config,
  snapshot,
  journal,
  onToggleTodayAttendance,
  onCreateMomentDraft,
  onUploadMoment,
  repositoryMode,
  connected,
  onToast,
}: CommunityViewProps) {
  const today = snapshot.weekDays.find((day) => day.index === config.todayIndex);
  const todayLabel = today?.dayLabel ?? "오늘";
  const onsiteVenues = useMemo(
    () => snapshot.venues.filter((venue) => venue.id !== "online"),
    [snapshot.venues],
  );
  const defaultVenue =
    onsiteVenues.find((venue) => venue.state === "recommended")?.name ??
    onsiteVenues[0]?.name ??
    "예배 장소";

  // 새벽 하늘: 실제 시계를 따르고, 리허설에서는 손으로 돌려볼 수 있다.
  const [nowMinute, setNowMinute] = useState(() => minuteOfDay(new Date()));
  const [scrubMinute, setScrubMinute] = useState<number | null>(null);
  useEffect(() => {
    const id = window.setInterval(
      () => setNowMinute(minuteOfDay(new Date())),
      30_000,
    );
    return () => window.clearInterval(id);
  }, []);
  const skyMinute = scrubMinute ?? nowMinute;
  const sky = describeDawn(skyMinute);

  const [merged, setMerged] = useState(false);
  const [sideBySide, setSideBySide] = useState(false);
  const [openWord, setOpenWord] = useState<string | null>(null);

  const poem = composePoem(snapshot.publicCounts, config.todayIndex);
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cardReady, setCardReady] = useState(false);

  const [carpoolRole, setCarpoolRole] = useState<CarpoolRole>("offer");
  const [carpoolFrom, setCarpoolFrom] = useState("");
  const [carpoolTime, setCarpoolTime] = useState("04:00");
  const [carpoolSeats, setCarpoolSeats] = useState(2);
  const [carpoolVenue, setCarpoolVenue] = useState(defaultVenue);

  const [arriveAt, setArriveAt] = useState("04:20");
  const [driveMinutes, setDriveMinutes] = useState(25);
  const [prepMinutes, setPrepMinutes] = useState(30);
  const [bedtime, setBedtime] = useState("22:30");
  const sleepPlan = planDriverNight({ arriveAt, driveMinutes, prepMinutes, bedtime });

  const [snackItem, setSnackItem] = useState("");
  const [snackPieces, setSnackPieces] = useState(1);
  const [snackAllergens, setSnackAllergens] = useState<string[]>([]);
  const [snackVenue, setSnackVenue] = useState(defaultVenue);

  const [thanksNote, setThanksNote] = useState("");

  const carpoolMessage = buildCarpoolMessage({
    role: carpoolRole,
    dayLabel: todayLabel,
    time: carpoolTime,
    from: carpoolFrom,
    venueName: carpoolVenue,
    seats: carpoolSeats,
  });
  const snackMessage = buildSnackMessage({
    dayLabel: todayLabel,
    item: snackItem,
    servings: snackPieces,
    allergens: snackAllergens,
    venueName: snackVenue,
  });
  const thanksMessage = buildThanksMessage(thanksNote);

  const handleMerge = (): void => {
    setMerged(true);
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(30);
    }
  };

  const handleCopy = async (text: string): Promise<void> => {
    const ok = await copyText(text);
    onToast(
      ok
        ? "카톡에 붙여넣을 문장을 복사했어요. 다락방 방에 붙여넣어 주세요."
        : "자동 복사가 안 되는 기기예요. 문장을 길게 눌러 복사해 주세요.",
    );
  };

  const handleRecord = (kind: ShareKind, note: string): void => {
    journal.add(kind, note, config.todayIndex);
    onToast("이 기기에만 나눔 기록을 남겼어요. 서버로는 보내지 않아요.");
  };

  const handleMakeCard = (): void => {
    const canvas = cardCanvasRef.current;
    if (!canvas) return;
    const ok = drawWeCard(canvas, {
      sky,
      counts: snapshot.publicCounts,
      poem,
      dayLabel: todayLabel,
      dayNumber: config.todayIndex + 1,
      attendingToday: snapshot.attendance.today,
      churchName: config.churchName,
    });
    setCardReady(ok);
    onToast(
      ok
        ? "오늘 새벽 카드를 만들었어요. 얼굴도 이름도 없이 점과 시만 담겼어요."
        : "이 기기에서는 카드 그림을 만들 수 없어요.",
    );
  };

  const handleShareCard = async (): Promise<void> => {
    const canvas = cardCanvasRef.current;
    if (!canvas || !cardReady) return;
    const outcome = await shareWeCard(
      canvas,
      `우리카드-${config.todayIndex + 1}일차.png`,
    );
    if (outcome === "failed") {
      onToast("카드를 내보내지 못했어요. 화면을 캡처해도 괜찮아요.");
      return;
    }
    journal.add("photo", "오늘 새벽 카드를 나눴어요", config.todayIndex);
    onToast(
      outcome === "shared"
        ? "카드를 나눴어요. 이 기기에만 기록을 남겼어요."
        : "카드를 저장했어요. 다락방 방에 올려 보세요.",
    );
  };

  const toggleAllergen = (name: string): void => {
    setSnackAllergens((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  };

  const handleMomentDraft = (draft: MomentDraft): void => {
    onCreateMomentDraft(draft);
    journal.add("photo", "사진·영상 1건을 검수 대기로 올렸어요", config.todayIndex);
  };

  return (
    <>
      <MergeHero sky={sky} merged={merged} onMerge={handleMerge} />

      <section className="we-section dawn-strip" aria-label="하루의 우리">
        <div className="dawn-head">
          <div>
            <p className="eyebrow">하루의 우리</p>
            <h2>
              {scrubMinute === null ? "지금은" : "이 시각에는"}{" "}
              <b>{sky.phase.label}</b>
            </h2>
          </div>
          {config.demoMode && (
            <div className="dawn-scrub">
              <label>
                시계 돌려보기 <span>{formatMinute(skyMinute)}</span>
                <input
                  type="range"
                  min={0}
                  max={1439}
                  step={5}
                  value={skyMinute}
                  onChange={(event) => setScrubMinute(Number(event.target.value))}
                />
              </label>
              {scrubMinute !== null && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setScrubMinute(null)}
                >
                  지금으로
                </button>
              )}
            </div>
          )}
        </div>
        <ol className="dawn-phases">
          {DAWN_PHASES.map((phase) => (
            <li
              key={phase.id}
              className={phase.id === sky.phase.id ? "now" : ""}
              aria-current={phase.id === sky.phase.id ? "time" : undefined}
            >
              <span className="dawn-time">{formatMinute(phase.startMinute)}</span>
              <span className="dawn-label">{phase.label}</span>
              <span className="dawn-line">{phase.line}</span>
            </li>
          ))}
        </ol>
      </section>

      <section id="we-glyph" className="we-section">
        <WeGlyph
          counts={snapshot.publicCounts}
          attendingToday={snapshot.attendance.today}
          selectedVenue={snapshot.attendance.selectedVenue}
          onLightUp={onToggleTodayAttendance}
        />
        <p className="we-fineprint">{config.exampleNotice}</p>
      </section>

      <section className="we-section poem-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">오늘의 우리를 세는 법</p>
            <h2>숫자를 시로 읽으면</h2>
          </div>
          <p>참석 집계는 순위가 아니라 장면입니다. 매일 다른 시가 됩니다.</p>
        </div>
        <div className="poem-grid">
          <blockquote className="poem" aria-label="오늘의 시">
            {poem.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </blockquote>
          <div className="card-maker">
            <p className="eyebrow">우리 카드</p>
            <h3>얼굴 사진 대신, 오늘 새벽을 담은 카드</h3>
            <p>
              지금 하늘빛, 사람으로 쓴 &lsquo;우리&rsquo;, 오늘의 시가 한 장에
              담깁니다. 이 기기에서만 만들어지고 어디로도 자동 전송되지
              않습니다.
            </p>
            <canvas
              ref={cardCanvasRef}
              className={`card-canvas ${cardReady ? "ready" : ""}`}
              aria-label="우리 카드 미리보기"
            />
            <div className="share-actions">
              <button type="button" className="solid" onClick={handleMakeCard}>
                오늘 카드 만들기
              </button>
              <button
                type="button"
                className="ghost"
                disabled={!cardReady}
                onClick={() => void handleShareCard()}
              >
                카톡으로 나누기
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="we-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">com·</p>
            <h2>&lsquo;우리&rsquo;를 영어로 쓰면 네 단어가 됩니다</h2>
          </div>
          <p>
            community, communion, compassion, communication. 네 단어 모두
            라틴어 com-, &lsquo;함께&rsquo;에서 시작합니다.
          </p>
        </div>
        <div className="com-grid">
          {COM_WORDS.map((word) => {
            const open = openWord === word.id;
            return (
              <article key={word.id} className={`com-card ${open ? "open" : ""}`}>
                <button
                  type="button"
                  className="com-toggle"
                  aria-expanded={open}
                  aria-controls={`com-${word.id}`}
                  onClick={() => setOpenWord(open ? null : word.id)}
                >
                  <span className="com-word">
                    <em>{word.prefix}</em>
                    <span aria-hidden="true">·</span>
                    {word.rest}
                  </span>
                  <span className="com-korean">{word.korean}</span>
                  <span className="com-tagline">{word.tagline}</span>
                </button>
                <div id={`com-${word.id}`} className="com-body" hidden={!open}>
                  <p className="com-origin">{word.origin}</p>
                  <p>{word.body}</p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => scrollToSection(SECTION_IDS[word.target])}
                  >
                    {word.actionLabel} →
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="we-carpool" className="we-section share-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">com·passion · 카풀</p>
            <h2>빈자리 하나, 그리고 운전자의 잠</h2>
          </div>
          <p>
            앱은 사람을 짝지어 주지 않습니다. 대신 태워 주는 사람의 잠을 먼저
            지키고, 다락방 방에 붙여넣을 문장을 만들어 드립니다.
          </p>
        </div>

        <div className="sleep-guard">
          <form
            className="share-form"
            onSubmit={(event) => event.preventDefault()}
            aria-label="잠 지키기 계산"
          >
            <div className="share-row">
              <label>
                도착 목표
                <input type="time" value={arriveAt} onChange={(e) => setArriveAt(e.target.value)} />
              </label>
              <label>
                운전 시간(분)
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={driveMinutes}
                  onChange={(e) => setDriveMinutes(Number(e.target.value) || 0)}
                />
              </label>
            </div>
            <div className="share-row">
              <label>
                준비 시간(분)
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={prepMinutes}
                  onChange={(e) => setPrepMinutes(Number(e.target.value) || 0)}
                />
              </label>
              <label>
                오늘 밤 취침
                <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} />
              </label>
            </div>
          </form>
          {sleepPlan && (
            <div className={`sleep-result ${sleepPlan.verdict}`} role="status">
              <div className="sleep-nums">
                <span>
                  <small>기상</small>
                  <b>{sleepPlan.wakeAt}</b>
                </span>
                <span>
                  <small>출발</small>
                  <b>{sleepPlan.departAt}</b>
                </span>
                <span>
                  <small>잠</small>
                  <b>{formatDuration(sleepPlan.sleepMinutes)}</b>
                </span>
              </div>
              <p>{sleepPlan.message}</p>
            </div>
          )}
        </div>

        <details className="share-details">
          <summary>다락방에 보낼 카풀 문장 만들기</summary>
          <div className="share-grid">
            <form
              className="share-form"
              onSubmit={(event) => event.preventDefault()}
              aria-label="카풀 문장 만들기"
            >
              <div className="role-switch" role="group" aria-label="카풀 역할">
                <button
                  type="button"
                  className={carpoolRole === "offer" ? "active" : ""}
                  onClick={() => setCarpoolRole("offer")}
                >
                  태워드릴게요
                </button>
                <button
                  type="button"
                  className={carpoolRole === "request" ? "active" : ""}
                  onClick={() => setCarpoolRole("request")}
                >
                  태워주세요
                </button>
              </div>
              <label>
                출발 동네
                <input
                  type="text"
                  value={carpoolFrom}
                  maxLength={30}
                  placeholder="예: 정자동 카페거리 앞"
                  onChange={(event) => setCarpoolFrom(event.target.value)}
                />
              </label>
              <div className="share-row">
                <label>
                  출발 시각
                  <input
                    type="time"
                    value={carpoolTime}
                    onChange={(event) => setCarpoolTime(event.target.value)}
                  />
                </label>
                {carpoolRole === "offer" && (
                  <label>
                    빈자리
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={carpoolSeats}
                      onChange={(event) => setCarpoolSeats(Number(event.target.value) || 1)}
                    />
                  </label>
                )}
              </div>
              <label>
                가는 곳
                <select value={carpoolVenue} onChange={(event) => setCarpoolVenue(event.target.value)}>
                  {onsiteVenues.map((venue) => (
                    <option key={venue.id} value={venue.name}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </label>
            </form>
            <div className="share-preview">
              <p className="label">카톡에 붙여넣을 문장</p>
              <pre>{carpoolMessage}</pre>
              <div className="share-actions">
                <button type="button" className="solid" onClick={() => void handleCopy(carpoolMessage)}>
                  문장 복사
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    handleRecord(
                      "carpool",
                      carpoolRole === "offer"
                        ? `빈자리 ${carpoolSeats}자리를 다락방에 열었어요`
                        : "다락방에 같이 타고 싶다고 말했어요",
                    )
                  }
                >
                  나눔 기록에 남기기
                </button>
              </div>
            </div>
          </div>
        </details>

        <ul className="share-tips">
          <li>
            <b>만나는 곳</b>
            <span>집 앞보다 큰길가 밝은 곳에서 타고 내리면 서로 안전합니다.</span>
          </li>
          <li>
            <b>아이 동반</b>
            <span>카시트가 없으면 아이는 태우지 않는 것이 사랑입니다.</span>
          </li>
          <li>
            <b>예배 후</b>
            <span>운전자는 출차 전 10분만 앉아 계세요. 그 10분이 우리를 지킵니다.</span>
          </li>
          <li>
            <b>못 오는 날</b>
            <span>온라인은 열등한 자리가 아닙니다. 병실의 이어폰도 같은 예배입니다.</span>
          </li>
        </ul>
      </section>

      <section id="we-snack" className="we-section share-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">com·munion · 간식</p>
            <h2>떡을 떼며</h2>
          </div>
          <p>
            떡을 눌러 떼어 보세요. 뗀 조각 수가 그대로 나눔 문장이 됩니다.
            새벽에 건네받은 간식은 20년 뒤에도 기억에 남습니다.
          </p>
        </div>

        <div className="bread">
          <button
            type="button"
            className="bread-btn"
            onClick={() => setSnackPieces((n) => (n >= 64 ? 1 : n * 2))}
            aria-label={`떡 떼기. 지금 ${snackPieces}조각`}
          >
            <span className="bread-grid" style={{ "--n": Math.min(8, Math.ceil(Math.sqrt(snackPieces))) } as React.CSSProperties}>
              {Array.from({ length: snackPieces }, (_, i) => (
                <i key={i} style={{ animationDelay: `${(i % 8) * 25}ms` }} />
              ))}
            </span>
            <span className="bread-count">
              {snackPieces === 1 ? "떡 한 덩이" : `${snackPieces}조각`}
            </span>
          </button>
          <p className="bread-hint">
            {snackPieces === 1
              ? "누르면 반으로 떼어집니다."
              : `한 덩이가 ${snackPieces}명의 손으로 갑니다. 다시 누르면 더 잘게.`}
          </p>
        </div>

        <details className="share-details">
          <summary>다락방에 보낼 간식 문장 만들기</summary>
          <div className="share-grid">
            <form
              className="share-form"
              onSubmit={(event) => event.preventDefault()}
              aria-label="간식 문장 만들기"
            >
              <label>
                무엇을 나누나요
                <input
                  type="text"
                  value={snackItem}
                  maxLength={40}
                  placeholder="예: 백설기, 따뜻한 두유"
                  onChange={(event) => setSnackItem(event.target.value)}
                />
              </label>
              <div className="share-row">
                <label>
                  조각 수
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={snackPieces}
                    onChange={(event) => setSnackPieces(Number(event.target.value) || 1)}
                  />
                </label>
                <label>
                  나누는 곳
                  <select value={snackVenue} onChange={(event) => setSnackVenue(event.target.value)}>
                    {onsiteVenues.map((venue) => (
                      <option key={venue.id} value={venue.name}>
                        {venue.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <fieldset className="allergen-set">
                <legend>들어 있는 재료</legend>
                {ALLERGEN_OPTIONS.map((name) => (
                  <label key={name} className="chip-check">
                    <input
                      type="checkbox"
                      checked={snackAllergens.includes(name)}
                      onChange={() => toggleAllergen(name)}
                    />
                    <span>{name}</span>
                  </label>
                ))}
              </fieldset>
            </form>
            <div className="share-preview">
              <p className="label">카톡에 붙여넣을 문장</p>
              <pre>{snackMessage}</pre>
              <div className="share-actions">
                <button type="button" className="solid" onClick={() => void handleCopy(snackMessage)}>
                  문장 복사
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() =>
                    handleRecord("snack", `${snackItem.trim() || "간식"} ${snackPieces}조각을 맡았어요`)
                  }
                >
                  나눔 기록에 남기기
                </button>
              </div>
            </div>
          </div>
        </details>

        <ul className="share-tips">
          <li>
            <b>개별 포장</b>
            <span>손으로 집지 않게, 하나씩 싸서 준비해 주세요.</span>
          </li>
          <li>
            <b>알레르기</b>
            <span>견과류, 우유, 밀, 계란은 꼭 표시합니다. 무가당 하나쯤은 좋아요.</span>
          </li>
          <li>
            <b>조용히</b>
            <span>예배 중에는 꺼내지 않고, 마친 뒤 입구 밖에서 나눕니다.</span>
          </li>
          <li>
            <b>남으면</b>
            <span>안내팀에게 건네면 늦게 오신 분들께 돌아갑니다.</span>
          </li>
        </ul>
      </section>

      <section className="we-section side-launch">
        <div>
          <p className="eyebrow">나란히</p>
          <h2>혼자서는 완성할 수 없는 화면</h2>
          <p>
            여섯 명이 글자를 하나씩 고르고 폰을 나란히 놓으면
            &lsquo;분당우리교회&rsquo;가 됩니다. 서버도 연결도 없이, 옆 사람만
            있으면 됩니다.
          </p>
        </div>
        <button type="button" className="solid" onClick={() => setSideBySide(true)}>
          나란히 모드 열기
        </button>
      </section>

      <section id="we-photo" className="we-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">com·munication · 사진</p>
            <h2>같은 새벽을 남기기</h2>
          </div>
          <p>
            오지 못한 사람에게도 새벽을 건넵니다. 얼굴과 이름은 지우고, 문이
            열리는 순간과 불 켜진 창문만 남겨 주세요.
          </p>
        </div>
        <MomentsPanel
          heading="사진·영상 나누기"
          intro="올린 파일은 자동으로 공개되지 않습니다. 운영팀 검수 후 교회 내부에서만 나눕니다."
          repositoryMode={repositoryMode}
          connected={connected}
          onDraftCreated={handleMomentDraft}
          onUpload={onUploadMoment}
          onToast={onToast}
        />
      </section>

      <section id="we-thanks" className="we-section share-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">고마운 한 사람</p>
            <h2>오늘 나를 &lsquo;우리&rsquo;로 만들어 준 사람</h2>
          </div>
          <p>
            이름은 적지 않아도 됩니다. &lsquo;정자동에서 태워주신 분&rsquo;처럼
            적어도 충분합니다.
          </p>
        </div>
        <div className="share-grid">
          <form className="share-form" onSubmit={(event) => event.preventDefault()} aria-label="감사 한 줄">
            <label>
              오늘 받은 것
              <textarea
                rows={3}
                maxLength={120}
                value={thanksNote}
                placeholder="예: 새벽 3시 반에 전화로 깨워 주신 다락방장님"
                onChange={(event) => setThanksNote(event.target.value)}
              />
            </label>
          </form>
          <div className="share-preview">
            <p className="label">전하고 싶다면</p>
            <pre>{thanksMessage}</pre>
            <div className="share-actions">
              <button type="button" className="solid" onClick={() => void handleCopy(thanksMessage)}>
                문장 복사
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => handleRecord("thanks", thanksNote.trim() || "함께여서 고마웠어요")}
              >
                나눔 기록에 남기기
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="we-section">
        <div className="section-head">
          <div>
            <p className="eyebrow">이번 주 우리 나눔</p>
            <h2>주고받은 것들</h2>
          </div>
          <p>이 기기에만 저장되고, 누구와도 비교하지 않습니다.</p>
        </div>
        {journal.entries.length === 0 ? (
          <p className="empty-copy">
            아직 기록이 없습니다. 카풀, 간식, 카드, 감사 중 하나를 남겨 보세요.
          </p>
        ) : (
          <ul className="journal-list" aria-label="나눔 기록">
            {journal.entries.map((entry) => {
              const dayLabel =
                snapshot.weekDays.find((day) => day.index === entry.dayIndex)?.dayLabel ?? "";
              return (
                <li key={entry.id} className={`journal-item ${entry.kind}`}>
                  <span className="journal-kind">{SHARE_KIND_LABELS[entry.kind]}</span>
                  <span className="journal-note">{entry.note}</span>
                  <span className="journal-meta">
                    {dayLabel} {formatEntryTime(entry.createdAt)}
                  </span>
                  <button
                    type="button"
                    className="journal-remove"
                    aria-label={`${SHARE_KIND_LABELS[entry.kind]} 기록 지우기`}
                    onClick={() => journal.remove(entry.id)}
                  >
                    지우기
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <ul className="we-boundary">
          <li>카풀과 간식은 다락방 안에서만. 앱은 매칭하지 않습니다.</li>
          <li>카드에는 얼굴도 이름도 없고, 사진은 검수 전 공개되지 않습니다.</li>
          <li>나눔 기록은 기기 밖으로 나가지 않고, 순위도 연속 기록도 없습니다.</li>
        </ul>
      </section>

      {sideBySide && <SideBySide sky={sky} onClose={() => setSideBySide(false)} />}
    </>
  );
}
