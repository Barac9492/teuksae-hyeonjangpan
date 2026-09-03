import { useMemo, useState } from "react";
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
  ALLERGEN_OPTIONS,
  buildCarpoolMessage,
  buildSnackMessage,
  buildThanksMessage,
  copyText,
  type CarpoolRole,
} from "./shareMessages";
import { WeCircle } from "./WeCircle";

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
  circle: "we-circle",
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
  if (Number.isNaN(date.getTime())) {
    return "";
  }
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
  const todayLabel =
    snapshot.weekDays.find((day) => day.index === config.todayIndex)
      ?.dayLabel ?? "오늘";
  const onsiteVenues = useMemo(
    () => snapshot.venues.filter((venue) => venue.id !== "online"),
    [snapshot.venues],
  );
  const defaultVenue =
    onsiteVenues.find((venue) => venue.state === "recommended")?.name ??
    onsiteVenues[0]?.name ??
    "예배 장소";

  const [openWord, setOpenWord] = useState<string | null>(null);

  const [carpoolRole, setCarpoolRole] = useState<CarpoolRole>("offer");
  const [carpoolFrom, setCarpoolFrom] = useState("");
  const [carpoolTime, setCarpoolTime] = useState("04:00");
  const [carpoolSeats, setCarpoolSeats] = useState(2);
  const [carpoolVenue, setCarpoolVenue] = useState(defaultVenue);

  const [snackItem, setSnackItem] = useState("");
  const [snackServings, setSnackServings] = useState(12);
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
    servings: snackServings,
    allergens: snackAllergens,
    venueName: snackVenue,
  });
  const thanksMessage = buildThanksMessage(thanksNote);

  const handleCopy = async (text: string): Promise<void> => {
    const ok = await copyText(text);
    onToast(
      ok
        ? "카톡에 붙여넣을 문장을 복사했어요. 다락방 방에 붙여넣어 주세요."
        : "자동 복사가 안 되는 기기예요. 아래 문장을 길게 눌러 복사해 주세요.",
    );
  };

  const handleRecord = (kind: ShareKind, note: string): void => {
    journal.add(kind, note, config.todayIndex);
    onToast("이 기기에만 나눔 기록을 남겼어요. 서버로는 보내지 않아요.");
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
      <section className="we-hero">
        <p className="eyebrow">함께 걷는 공동체</p>
        <h2 className="we-title" aria-label="분당우리교회">
          분당<mark>우리</mark>교회
        </h2>
        <p className="lead">
          특새의 &lsquo;우리&rsquo;는 이름에 붙은 두 글자가 아니라, 새벽마다
          다시 만들어지는 말입니다. 누군가를 깨우고, 태우고, 떡을 떼고, 오지
          못한 사람에게 새벽을 건네는 동안 &lsquo;나&rsquo;와
          &lsquo;너&rsquo;는 &lsquo;우리&rsquo;가 됩니다.
        </p>
        <blockquote className="we-verse">
          <p>
            날마다 마음을 같이하여 성전에 모이기를 힘쓰고 집에서 떡을 떼며
            기쁨과 순전한 마음으로 음식을 먹고
          </p>
          <cite>사도행전 2:46</cite>
        </blockquote>
      </section>

      <section id="we-circle" className="we-section">
        <WeCircle
          counts={snapshot.publicCounts}
          attendingToday={snapshot.attendance.today}
          selectedVenue={snapshot.attendance.selectedVenue}
          onLightUp={onToggleTodayAttendance}
        />
        <p className="we-fineprint">{config.exampleNotice}</p>
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
              <article
                key={word.id}
                className={`com-card ${open ? "open" : ""}`}
              >
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
                <div
                  id={`com-${word.id}`}
                  className="com-body"
                  hidden={!open}
                >
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
            <h2>같이 타요</h2>
          </div>
          <p>
            앱은 사람을 짝지어 주지 않습니다. 다락방 방에 붙여넣을 문장만
            만들어 드려요. 연결은 이미 서로 아는 사람들 사이에서 일어납니다.
          </p>
        </div>
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
                    onChange={(event) =>
                      setCarpoolSeats(Number(event.target.value) || 1)
                    }
                  />
                </label>
              )}
            </div>
            <label>
              가는 곳
              <select
                value={carpoolVenue}
                onChange={(event) => setCarpoolVenue(event.target.value)}
              >
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
              <button
                type="button"
                className="solid"
                onClick={() => void handleCopy(carpoolMessage)}
              >
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
        <ul className="share-tips">
          <li>
            <b>새벽 운전</b>
            <span>
              1시 출발, 2시 줄서기 같은 일정은 은혜가 아니라 위험입니다. 잠을
              먼저 지켜 주세요.
            </span>
          </li>
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
        </ul>
      </section>

      <section id="we-snack" className="we-section share-block">
        <div className="section-head">
          <div>
            <p className="eyebrow">com·munion · 간식</p>
            <h2>떡을 떼며</h2>
          </div>
          <p>
            새벽에 건네받은 간식은 20년 뒤에도 기억에 남습니다. 오늘 우리
            다락방 간식을 맡겠다고 말해 보세요.
          </p>
        </div>
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
                개수
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={snackServings}
                  onChange={(event) =>
                    setSnackServings(Number(event.target.value) || 1)
                  }
                />
              </label>
              <label>
                나누는 곳
                <select
                  value={snackVenue}
                  onChange={(event) => setSnackVenue(event.target.value)}
                >
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
              <button
                type="button"
                className="solid"
                onClick={() => void handleCopy(snackMessage)}
              >
                문장 복사
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  handleRecord(
                    "snack",
                    `${snackItem.trim() || "간식"} ${snackServings}개를 맡았어요`,
                  )
                }
              >
                나눔 기록에 남기기
              </button>
            </div>
          </div>
        </div>
        <ul className="share-tips">
          <li>
            <b>개별 포장</b>
            <span>손으로 집지 않게, 하나씩 싸서 준비해 주세요.</span>
          </li>
          <li>
            <b>알레르기</b>
            <span>견과류, 우유, 밀, 계란은 꼭 표시합니다. 당뇨가 있는 분을 위해 무가당 하나쯤은 좋아요.</span>
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
          <form
            className="share-form"
            onSubmit={(event) => event.preventDefault()}
            aria-label="감사 한 줄"
          >
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
              <button
                type="button"
                className="solid"
                onClick={() => void handleCopy(thanksMessage)}
              >
                문장 복사
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  handleRecord(
                    "thanks",
                    thanksNote.trim() || "함께여서 고마웠어요",
                  )
                }
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
            아직 기록이 없습니다. 카풀, 간식, 사진, 감사 중 하나를 남겨 보세요.
          </p>
        ) : (
          <ul className="journal-list" aria-label="나눔 기록">
            {journal.entries.map((entry) => {
              const dayLabel =
                snapshot.weekDays.find((day) => day.index === entry.dayIndex)
                  ?.dayLabel ?? "";
              return (
                <li key={entry.id} className={`journal-item ${entry.kind}`}>
                  <span className="journal-kind">
                    {SHARE_KIND_LABELS[entry.kind]}
                  </span>
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
          <li>사진은 검수 전 공개되지 않습니다.</li>
          <li>나눔 기록은 기기 밖으로 나가지 않고, 순위도 연속 기록도 없습니다.</li>
        </ul>
      </section>
    </>
  );
}
