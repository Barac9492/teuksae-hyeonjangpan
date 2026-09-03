/**
 * 카카오톡(다락방 단톡방)에 붙여넣을 문장을 만든다.
 * 앱은 사람을 매칭하지 않는다. 문장만 만들고, 연결은 다락방 안에서 일어난다.
 */
export type CarpoolRole = "offer" | "request";

export interface CarpoolMessageInput {
  role: CarpoolRole;
  dayLabel: string;
  time: string;
  from: string;
  venueName: string;
  seats: number;
}

export interface SnackMessageInput {
  dayLabel: string;
  item: string;
  servings: number;
  allergens: string[];
  venueName: string;
}

export const ALLERGEN_OPTIONS = ["견과류", "우유", "밀", "계란"] as const;

function clean(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : fallback;
}

export function formatTimeLabel(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) {
    return "새벽";
  }
  const hour = Number(match[1]);
  const minute = match[2];
  if (Number.isNaN(hour) || hour < 0 || hour > 23) {
    return "새벽";
  }
  const period = hour < 12 ? "새벽" : hour < 18 ? "오후" : "저녁";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${minute}`;
}

export function buildCarpoolMessage(input: CarpoolMessageInput): string {
  const from = clean(input.from, "우리 동네");
  const venue = clean(input.venueName, "특새 예배 장소");
  const time = formatTimeLabel(input.time);
  const seats = Math.min(6, Math.max(1, Math.round(input.seats)));

  if (input.role === "offer") {
    return [
      `[특새 카풀 · 같이 타요]`,
      `${input.dayLabel}요일 ${time} ${from} 출발 → ${venue}`,
      `빈자리 ${seats}자리 있어요. 같이 가실 분 답장 주세요.`,
      `출발 10분 전에 한 번 더 확인할게요. 조심히 다녀와요 🙂`,
    ].join("\n");
  }

  return [
    `[특새 카풀 · 태워주세요]`,
    `${input.dayLabel}요일 ${time}쯤 ${from}에서 ${venue}로 가요.`,
    `지나가는 길에 자리 있으시면 함께 타고 싶어요.`,
    `어렵다면 괜찮아요. 온라인으로도 같은 예배를 드릴 수 있으니까요 🙂`,
  ].join("\n");
}

export function buildSnackMessage(input: SnackMessageInput): string {
  const item = clean(input.item, "간식");
  const venue = clean(input.venueName, "예배 장소");
  const servings = Math.min(500, Math.max(1, Math.round(input.servings)));
  const allergenLine =
    input.allergens.length > 0
      ? `${input.allergens.join(", ")} 들어 있어요. 알레르기 있으신 분은 알려주세요.`
      : "견과류·우유·밀·계란은 넣지 않았어요.";

  return [
    `[특새 간식 · 떡을 떼며]`,
    `${input.dayLabel}요일 우리 다락방 간식은 제가 준비할게요.`,
    `${item} ${servings}개, 개별 포장이에요.`,
    allergenLine,
    `예배 후 ${venue} 입구에서 조용히 나눠요 🙂`,
  ].join("\n");
}

export function buildThanksMessage(note: string): string {
  const body = clean(note, "오늘 새벽, 함께여서 고마웠어요.");
  return [`[특새 · 고마운 한 사람]`, body, `오늘도 같은 새벽을 함께 걸어 주셔서 고맙습니다.`].join(
    "\n",
  );
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
