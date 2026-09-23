/**
 * Time awareness for the 2026 Woori companion.
 *
 * All wall-clock math is done in KST (UTC+9, no daylight saving) so the phase is
 * identical on every device regardless of its own timezone setting.
 *
 * Only the published facts are hard-coded: six service days (2026-10-05..10) and a
 * 04:40 service start. Door/gym/sanctuary opening times and the service end time
 * are NOT known, so no phase boundary is ever shown to the user as an official time.
 */

export type Phase = 'pre' | 'eve' | 'dawn' | 'service' | 'after' | 'post';

export const SERVICE_DAYS = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'] as const;
export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토'] as const;
const SERVICE_START_MINUTES = 4 * 60 + 40;
/** UI-only heuristic for switching to the "after" screen. Never displayed as an end time. */
const QUIET_WINDOW_END_MINUTES = 6 * 60;
const EVE_START_MINUTES = 18 * 60;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Moment = {
  phase: Phase;
  /** 0-5 index of the service day this moment belongs to (the upcoming one for eve/dawn). */
  dayIndex: number;
  /** Calendar days until 2026-10-05 in KST. Only meaningful for `pre`. */
  daysUntilStart: number;
  /** Minutes until the relevant 04:40 service starts (eve/dawn), otherwise 0. */
  minutesToService: number;
  /** KST wall clock, HH:MM. */
  clock: string;
  /** Whether the dim night palette should be used automatically. */
  night: boolean;
};

function kstParts(date: Date) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  const ymd = shifted.toISOString().slice(0, 10);
  const minutes = shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
  return { ymd, minutes };
}

function dayNumber(ymd: string) {
  return Math.round(Date.parse(`${ymd}T00:00:00Z`) / DAY_MS);
}

export function formatClock(totalMinutes: number) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function describeDuration(minutes: number) {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours === 0) return `${rest}분`;
  if (rest === 0) return `${hours}시간`;
  return `${hours}시간 ${rest}분`;
}

export function getMoment(now: Date): Moment {
  const { ymd, minutes } = kstParts(now);
  const today = dayNumber(ymd);
  const first = dayNumber(SERVICE_DAYS[0]);
  const last = dayNumber(SERVICE_DAYS[SERVICE_DAYS.length - 1]);
  const todayIndex = today - first;
  const isServiceDay = todayIndex >= 0 && todayIndex < SERVICE_DAYS.length;
  const tomorrowIndex = todayIndex + 1;
  const tomorrowIsServiceDay = tomorrowIndex >= 0 && tomorrowIndex < SERVICE_DAYS.length;
  const night = minutes >= 21 * 60 || minutes < 6 * 60 + 30;
  const clock = formatClock(minutes);
  const base = { daysUntilStart: Math.max(0, first - today), clock };

  if (isServiceDay && minutes < SERVICE_START_MINUTES) {
    return { ...base, phase: 'dawn', dayIndex: todayIndex, minutesToService: SERVICE_START_MINUTES - minutes, night: true };
  }
  if (isServiceDay && minutes < QUIET_WINDOW_END_MINUTES) {
    return { ...base, phase: 'service', dayIndex: todayIndex, minutesToService: 0, night: true };
  }
  if (tomorrowIsServiceDay && minutes >= EVE_START_MINUTES) {
    return { ...base, phase: 'eve', dayIndex: tomorrowIndex, minutesToService: 1440 - minutes + SERVICE_START_MINUTES, night };
  }
  if (isServiceDay && !(todayIndex === SERVICE_DAYS.length - 1 && minutes >= EVE_START_MINUTES)) {
    return { ...base, phase: 'after', dayIndex: todayIndex, minutesToService: 0, night };
  }
  if (today > last || (today === last && minutes >= EVE_START_MINUTES)) {
    return { ...base, phase: 'post', dayIndex: SERVICE_DAYS.length - 1, minutesToService: 0, night };
  }
  return { ...base, phase: 'pre', dayIndex: 0, minutesToService: 0, night };
}

/** Preview presets for the design review control. */
export const PREVIEW_MOMENTS = [
  { id: 'live', label: '지금 실제 시각 기준' },
  { id: 'pre', label: '행사 전 (9월 28일 오후)' },
  { id: 'eve', label: '전날 밤 22:30' },
  { id: 'dawn', label: '새벽 대기 03:52' },
  { id: 'service', label: '예배 중 05:05' },
  { id: 'after', label: '예배 후 06:25' },
  { id: 'post', label: '행사 후 (10월 11일 아침)' },
] as const;

export type PreviewMomentId = (typeof PREVIEW_MOMENTS)[number]['id'];

function kstDate(ymd: string, hhmm: string) {
  return new Date(`${ymd}T${hhmm}:00+09:00`);
}

function previousDay(ymd: string) {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

/** Builds a KST instant for a preview phase on a chosen service day (0-5). */
export function previewDate(id: PreviewMomentId, dayIndex: number, realNow: Date) {
  const day = SERVICE_DAYS[Math.min(Math.max(dayIndex, 0), SERVICE_DAYS.length - 1)];
  switch (id) {
    case 'pre': return kstDate('2026-09-28', '15:00');
    case 'eve': return kstDate(previousDay(day), '22:30');
    case 'dawn': return kstDate(day, '03:52');
    case 'service': return kstDate(day, '05:05');
    case 'after': return kstDate(day, '06:25');
    case 'post': return kstDate('2026-10-11', '08:00');
    default: return realNow;
  }
}

export function kstMinutes(date: Date) {
  return kstParts(date).minutes;
}

export function dayLabel(index: number) {
  const [, month, day] = SERVICE_DAYS[index].split('-');
  return `${Number(month)}월 ${Number(day)}일(${WEEKDAY_LABELS[index]})`;
}
