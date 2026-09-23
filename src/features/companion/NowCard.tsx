import { useState } from 'react';
import type { Moment } from './moment';
import { dayLabel, describeDuration, formatClock, kstMinutes, SERVICE_DAYS, WEEKDAY_LABELS } from './moment';

const ORDINALS = ['첫째', '둘째', '셋째', '넷째', '다섯째', '마지막'] as const;
const WAKE_OPTIONS = [
  { label: '03:00', minutes: 180 },
  { label: '03:30', minutes: 210 },
  { label: '04:00', minutes: 240 },
] as const;

export function DayStrip({ moment }: { moment: Moment }) {
  const active = moment.phase === 'pre' || moment.phase === 'post' ? -1 : moment.dayIndex;
  return (
    <ol className="tc-daystrip" aria-label="특새 여섯 날">
      {SERVICE_DAYS.map((ymd, index) => (
        <li key={ymd} aria-current={index === active ? 'date' : undefined} className={index < active || moment.phase === 'post' ? 'is-past' : undefined}>
          <small>{WEEKDAY_LABELS[index]}</small>
          <b>{Number(ymd.slice(8))}</b>
        </li>
      ))}
    </ol>
  );
}

type Actions = {
  goToParking: () => void;
  goToPrayer: () => void;
  goToBreakfast: () => void;
  goToStories: () => void;
  goToPhotos: () => void;
  previewDawn: () => void;
};

function PreCard({ moment, actions }: { moment: Moment; actions: Actions }) {
  return (
    <div className="tc-now tc-now--pre">
      <span className="tc-now__eyebrow">첫 새벽까지</span>
      <div className="tc-now__countdown"><b>D-{moment.daysUntilStart}</b><span>10월 5일(월)<br />04:40 예배 시작</span></div>
      <p className="tc-now__lead">학교와 예배 공간이 몇 시에 열리는지는 교회 공지가 나오면 여기에 알려드려요.</p>
      <h3 className="tc-now__subhead">첫 새벽 전에 미리 해두면 좋아요</h3>
      <ul className="tc-prep">
        <li><b>1</b><span>예배드릴 곳 정하기<small>이매 송림본당 또는 서현 드림센터</small></span></li>
        <li><b>2</b><button type="button" onClick={actions.goToParking}>차로 오신다면 주차 방법 보기 <span aria-hidden="true">→</span></button></li>
        <li><b>3</b><button type="button" onClick={actions.goToPrayer}>기도 제목 하나 적어두기 <span aria-hidden="true">→</span></button></li>
        <li><b>4</b><span>새벽 공기에 맞는 겉옷 준비하기<small>따뜻한 물이 필요하면 개인 보온병을 챙겨주세요</small></span></li>
      </ul>
      <button className="tc-now__preview" type="button" onClick={actions.previewDawn}>행사 날 새벽 화면 미리 보기 <span aria-hidden="true">→</span></button>
    </div>
  );
}

function EveCard({ moment, now, isSongrim, goToSnack }: { moment: Moment; now: Date; isSongrim: boolean; goToSnack: () => void }) {
  const [wake, setWake] = useState<number>(210);
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const nowMinutes = kstMinutes(now);
  const sleepMinutes = 1440 - nowMinutes + wake;
  const items = ['알람 맞추기', '겉옷 챙기기', '개인 보온병 (필요하면)', '차로 온다면 주차 방법 확인'];
  const toggle = (index: number) => setChecked((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });
  return (
    <div className="tc-now tc-now--eve">
      <span className="tc-now__eyebrow">내일 새벽 · {dayLabel(moment.dayIndex)} · 여섯 날 중 {ORDINALS[moment.dayIndex]} 날</span>
      <h2 className="tc-now__title">예배까지 {describeDuration(moment.minutesToService)}</h2>
      <fieldset className="tc-wake">
        <legend>몇 시에 일어나세요?</legend>
        <div>{WAKE_OPTIONS.map((option) => <button key={option.label} type="button" aria-pressed={wake === option.minutes} onClick={() => setWake(option.minutes)}>{option.label}</button>)}</div>
        <p aria-live="polite">지금 잠들면 <b>{describeDuration(sleepMinutes)}</b> 잘 수 있어요.</p>
      </fieldset>
      <ul className="tc-check" aria-label="자기 전에 챙길 것">
        {items.map((item, index) => (
          <li key={item}><label><input type="checkbox" checked={checked.has(index)} onChange={() => toggle(index)} /><span>{item}</span></label></li>
        ))}
      </ul>
      <p className="tc-now__note">밤부터 줄을 서실 계획이라면 막차 시간을 꼭 먼저 확인해주세요.</p>
      {isSongrim && moment.dayIndex === 0 && <button className="tc-snack-teaser" type="button" onClick={goToSnack}><span><small>송림본당 · 학교 밖 대기 장소</small><strong>첫날 새벽엔 1청년부 3팀이 간식을 준비해요</strong></span><span aria-hidden="true">→</span></button>}
    </div>
  );
}

export function Freshness({ now, stale, team }: { now: Date; stale: boolean; team: string }) {
  const minutes = kstMinutes(now);
  if (stale) {
    return <p className="tc-fresh tc-fresh--stale"><b>{formatClock(minutes - 27)} 마지막 확인</b> · 20분 넘게 새 확인이 없어 이전 상태를 숨겼어요.</p>;
  }
  return <p className="tc-fresh"><b>{formatClock(minutes - 6)} 현장 확인</b> · 6분 전 · {team}(예시) <span>20분 동안 새 확인이 없으면 ‘확인 중’으로 바뀌어요.</span></p>;
}

function ServiceCard({ moment }: { moment: Moment }) {
  return (
    <div className="tc-now tc-now--service">
      <span className="tc-now__eyebrow">{dayLabel(moment.dayIndex)} · 04:40부터</span>
      <h2 className="tc-now__title">지금은 예배 중이에요</h2>
      <p className="tc-now__lead">휴대폰은 무음으로 두고, 화면을 끄고 함께 예배해요.</p>
      <div className="tc-now__quiet">
        <strong>오지 못한 가족이 있다면</strong>
        <p>온라인 예배 주소는 교회 공지가 나온 뒤 이곳에 연결할 예정이에요.</p>
      </div>
    </div>
  );
}

function AfterCard({ moment, actions }: { moment: Moment; actions: Actions }) {
  const last = moment.dayIndex === SERVICE_DAYS.length - 1;
  return (
    <div className="tc-now tc-now--after">
      <span className="tc-now__eyebrow">{dayLabel(moment.dayIndex)} · 예배를 마치고</span>
      <h2 className="tc-now__title">{last ? '여섯 날의 새벽을 함께 지나왔어요' : '좋은 아침이에요'}</h2>
      <p className="tc-now__lead">차를 빼실 때는 걸어 나오는 분들을 먼저 살펴주세요.</p>
      <div className="tc-now__actions">
        <button type="button" onClick={actions.goToBreakfast}><b>같이 아침 먹고 갈까요?</b><small>문 연 식당 후보 보기</small></button>
        <button type="button" onClick={actions.goToStories}><b>오늘 고마웠던 마음</b><small>나눔에 한마디 남기기</small></button>
      </div>
      {!last && <p className="tc-now__note">다음 새벽은 {dayLabel(moment.dayIndex + 1)} 04:40이에요.</p>}
    </div>
  );
}

function PostCard({ actions }: { actions: Actions }) {
  return (
    <div className="tc-now tc-now--post">
      <span className="tc-now__eyebrow">특새 이후</span>
      <h2 className="tc-now__title">특새는 끝났지만,<br />새벽은 이어져요</h2>
      <p className="tc-now__lead">내일 아침 5분만 일찍 일어나, 이번 주 받은 말씀 한 구절을 다시 읽어보세요.</p>
      <div className="tc-now__actions">
        <button type="button" onClick={actions.goToPhotos}><b>함께한 사진</b><small>이번 주를 돌아보기</small></button>
        <button type="button" onClick={actions.goToPrayer}><b>기도 제목 다시 보기</b><small>계속 기도할 한 가지</small></button>
      </div>
    </div>
  );
}

export function NowCard({ moment, now, isSongrim, goToSnack, actions }: { moment: Moment; now: Date; isSongrim: boolean; goToSnack: () => void; actions: Actions }) {
  switch (moment.phase) {
    case 'pre': return <PreCard moment={moment} actions={actions} />;
    case 'eve': return <EveCard moment={moment} now={now} isSongrim={isSongrim} goToSnack={goToSnack} />;
    case 'service': return <ServiceCard moment={moment} />;
    case 'after': return <AfterCard moment={moment} actions={actions} />;
    case 'post': return <PostCard actions={actions} />;
    default: return null;
  }
}
