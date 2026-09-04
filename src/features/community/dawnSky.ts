/** 실제 시계에 따라 바뀌는 새벽 하늘과 '하루의 우리' 시간표. */
export interface DawnPhase {
  id: string;
  startMinute: number;
  label: string;
  line: string;
}

export const DAWN_PHASES: DawnPhase[] = [
  { id: "night", startMinute: 0, label: "아직 밤", line: "누군가는 벌써 알람을 맞춰 두었습니다." },
  { id: "wake", startMinute: 180, label: "깨우는 시간", line: "다락방 단톡방에 첫 '일어나셨어요?'가 올라옵니다." },
  { id: "leave", startMinute: 220, label: "떠나는 시간", line: "시동 소리, 아이를 안고 나서는 현관, 이어폰을 꽂는 병실." },
  { id: "arrive", startMinute: 260, label: "도착하는 시간", line: "문이 열리고 자리를 찾습니다. 어디든 같은 자리입니다." },
  { id: "together", startMinute: 280, label: "함께 있는 시간", line: "같은 말씀 앞에, 같은 시간. 지금이 '우리'입니다." },
  { id: "bread", startMinute: 360, label: "떡을 떼는 시간", line: "입구 밖에서 떡 한 조각과 두유 한 병이 오갑니다." },
  { id: "scatter", startMinute: 400, label: "흩어지는 시간", line: "출근길과 등굣길로 흩어져도 우리는 그대로입니다." },
  { id: "live", startMinute: 540, label: "살아내는 시간", line: "붙든 말씀 한 문장을 하루에 심습니다." },
  { id: "rest", startMinute: 1260, label: "잠을 지키는 시간", line: "내일 새벽을 위해 오늘 밤은 일찍 눕습니다." },
];

interface SkyStop {
  minute: number;
  top: string;
  bottom: string;
  glow: number; // 0..1 해 기운
}

const SKY_STOPS: SkyStop[] = [
  { minute: 0, top: "#0b1026", bottom: "#1a1f3a", glow: 0 },
  { minute: 240, top: "#101a3d", bottom: "#2b2f5e", glow: 0.05 },
  { minute: 300, top: "#1d2b5c", bottom: "#7a4a5e", glow: 0.35 },
  { minute: 360, top: "#4a5a9a", bottom: "#e7a06a", glow: 0.8 },
  { minute: 420, top: "#8fb6e6", bottom: "#fbe0b8", glow: 1 },
  { minute: 720, top: "#8ec5f5", bottom: "#e8f2fb", glow: 1 },
  { minute: 1080, top: "#6f8fd0", bottom: "#f0b08a", glow: 0.8 },
  { minute: 1200, top: "#1f2a5a", bottom: "#5b3d5e", glow: 0.3 },
  { minute: 1440, top: "#0b1026", bottom: "#1a1f3a", glow: 0 },
];

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const channel = (x: number, y: number): string =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
}

export interface DawnSky {
  minute: number;
  top: string;
  bottom: string;
  glow: number;
  phase: DawnPhase;
  timeLabel: string;
}

export function minuteOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinute(minute: number): string {
  const m = ((Math.round(minute) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, "0");
  return `${String(h).padStart(2, "0")}:${mm}`;
}

export function phaseAt(minute: number): DawnPhase {
  let current = DAWN_PHASES[0];
  for (const phase of DAWN_PHASES) {
    if (minute >= phase.startMinute) current = phase;
  }
  return current;
}

export function describeDawn(minute: number): DawnSky {
  const m = Math.min(1440, Math.max(0, minute));
  let from = SKY_STOPS[0];
  let to = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
    if (m >= SKY_STOPS[i].minute && m <= SKY_STOPS[i + 1].minute) {
      from = SKY_STOPS[i];
      to = SKY_STOPS[i + 1];
      break;
    }
  }
  const span = to.minute - from.minute || 1;
  const t = (m - from.minute) / span;
  return {
    minute: m,
    top: mixHex(from.top, to.top, t),
    bottom: mixHex(from.bottom, to.bottom, t),
    glow: from.glow + (to.glow - from.glow) * t,
    phase: phaseAt(m),
    timeLabel: formatMinute(m),
  };
}

/** 어두운 하늘이면 흰 글자, 밝은 하늘이면 먹색 글자. */
export function inkForSky(sky: DawnSky): "light" | "dark" {
  return sky.glow > 0.6 ? "dark" : "light";
}
