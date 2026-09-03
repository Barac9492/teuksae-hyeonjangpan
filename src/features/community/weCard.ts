import type { PublicCounts } from "../../domain/types";
import type { DawnSky } from "./dawnSky";
import { planPeople, YOUR_POINT_INDEX } from "./weGlyph";

export interface WeCardInput {
  sky: DawnSky;
  counts: PublicCounts;
  poem: string[];
  dayLabel: string;
  dayNumber: number;
  attendingToday: boolean;
  churchName: string;
}

export const WE_CARD_WIDTH = 1080;
export const WE_CARD_HEIGHT = 1350;

/**
 * 얼굴 사진 대신 오늘 새벽을 담은 카드를 그린다. 사람은 점으로만 나온다.
 * 기기 안에서만 만들어지고, 어디로도 자동 전송되지 않는다.
 */
export function drawWeCard(
  canvas: HTMLCanvasElement,
  input: WeCardInput,
): boolean {
  canvas.width = WE_CARD_WIDTH;
  canvas.height = WE_CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  const W = WE_CARD_WIDTH;
  const H = WE_CARD_HEIGHT;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, input.sky.top);
  sky.addColorStop(1, input.sky.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 해 기운
  if (input.sky.glow > 0) {
    const sun = ctx.createRadialGradient(W * 0.5, H * 0.62, 10, W * 0.5, H * 0.62, W * 0.6);
    sun.addColorStop(0, `rgba(255, 214, 150, ${0.55 * input.sky.glow})`);
    sun.addColorStop(1, "rgba(255, 214, 150, 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, W, H);
  }

  const light = input.sky.glow > 0.6 ? "#27231f" : "#ffffff";
  const soft = input.sky.glow > 0.6 ? "rgba(39,35,31,0.7)" : "rgba(255,255,255,0.72)";
  const font = "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";

  ctx.fillStyle = soft;
  ctx.font = `600 30px ${font}`;
  ctx.textAlign = "left";
  ctx.fillText(`${input.churchName} 특새 · ${input.dayNumber}일차 ${input.dayLabel}`, 80, 110);
  ctx.textAlign = "right";
  ctx.fillText(`${input.sky.timeLabel} · ${input.sky.phase.label}`, W - 80, 110);

  // 사람으로 쓴 '우리'
  const people = planPeople(input.counts.todayTotal, input.counts.onlineTotal);
  const scale = (W - 200) / 320;
  const ox = 100;
  const oy = 190;
  for (const dot of people) {
    const isYou = dot.index === YOUR_POINT_INDEX;
    const online = dot.online;
    ctx.beginPath();
    ctx.arc(ox + dot.x * scale, oy + dot.y * scale, isYou ? 15 : 9.5, 0, Math.PI * 2);
    if (isYou && !input.attendingToday) {
      ctx.strokeStyle = soft;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle = isYou ? light : online ? "#7fc9a4" : "#e9a27f";
      ctx.fill();
      if (isYou) {
        ctx.strokeStyle = soft;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ox + dot.x * scale, oy + dot.y * scale, 30, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  // 시
  ctx.textAlign = "left";
  ctx.fillStyle = light;
  ctx.font = `400 40px Georgia, 'Nanum Myeongjo', serif`;
  let y = 900;
  for (const line of input.poem) {
    ctx.fillText(line, 80, y, W - 160);
    y += 62;
  }

  ctx.fillStyle = soft;
  ctx.font = `500 26px ${font}`;
  ctx.fillText(
    `현장 ${input.counts.onsiteTotal.toLocaleString("ko-KR")} · 온라인 ${input.counts.onlineTotal.toLocaleString("ko-KR")} · 같은 크기의 점`,
    80,
    H - 90,
  );
  ctx.textAlign = "right";
  ctx.fillText("얼굴 없이, 이름 없이, 함께 있음만", W - 80, H - 90);
  return true;
}

export type ShareOutcome = "shared" | "downloaded" | "failed";

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== "function") {
      resolve(null);
      return;
    }
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function shareWeCard(
  canvas: HTMLCanvasElement,
  fileName: string,
): Promise<ShareOutcome> {
  const blob = await canvasToBlob(canvas);
  if (!blob) return "failed";
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (nav && typeof nav.share === "function") {
    try {
      if (typeof nav.canShare !== "function" || nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: "우리 카드" });
        return "shared";
      }
    } catch {
      // 사용자가 취소했거나 지원하지 않음 → 다운로드로
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
