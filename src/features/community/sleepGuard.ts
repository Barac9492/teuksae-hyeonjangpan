/** 카풀 운전자의 잠을 지키는 계산. 은혜보다 안전이 먼저다. */
export interface SleepPlanInput {
  arriveAt: string; // "04:20"
  driveMinutes: number;
  prepMinutes: number;
  bedtime: string; // "22:30"
}

export type SleepVerdict = "ok" | "short" | "danger";

export interface SleepPlan {
  departAt: string;
  wakeAt: string;
  sleepMinutes: number;
  verdict: SleepVerdict;
  message: string;
}

function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function clock(minute: number): string {
  const m = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function planDriverNight(input: SleepPlanInput): SleepPlan | null {
  const arrive = parseClock(input.arriveAt);
  const bed = parseClock(input.bedtime);
  if (arrive === null || bed === null) return null;
  const drive = Math.min(180, Math.max(0, Math.round(input.driveMinutes)));
  const prep = Math.min(120, Math.max(0, Math.round(input.prepMinutes)));

  const depart = arrive - drive;
  const wake = depart - prep;
  // 취침은 전날 밤, 기상은 새벽. 자정을 넘긴 거리로 계산한다.
  let sleep = ((wake - bed) % 1440 + 1440) % 1440;
  if (sleep > 720) sleep = 0; // 취침 시각이 기상보다 늦으면 잠이 없다.

  let verdict: SleepVerdict = "ok";
  let message = `${formatDuration(sleep)} 잘 수 있어요. 운전대를 잡아도 좋은 밤입니다.`;
  if (sleep < 300) {
    verdict = "danger";
    message = `${formatDuration(sleep)}만 자게 됩니다. 오늘은 태워 주지 않는 것이 사랑입니다. 온라인으로 같은 예배를 드리거나, 다른 분 차에 타세요.`;
  } else if (sleep < 360) {
    verdict = "short";
    message = `${formatDuration(sleep)} 잡니다. 조금 부족해요. 취침을 30분만 당기면 안전선을 넘습니다.`;
  }

  return {
    departAt: clock(depart),
    wakeAt: clock(wake),
    sleepMinutes: sleep,
    verdict,
    message,
  };
}
