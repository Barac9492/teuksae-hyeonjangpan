import type { PublicCounts } from "../../domain/types";

export const RINGS: Array<{ radius: number; count: number }> = [
  { radius: 52, count: 14 },
  { radius: 90, count: 26 },
  { radius: 128, count: 40 },
];
export const CENTER = 160;
export const WE_CIRCLE_DOTS = RINGS.reduce((sum, ring) => sum + ring.count, 0);
export const YOUR_DOT_INDEX = RINGS[0].count; // 가운데 고리의 맨 위

export interface DotSpec {
  index: number;
  x: number;
  y: number;
  online: boolean;
}

/** 오늘 참석 집계를 고정된 점 배열로 옮긴다. 현장과 온라인은 같은 크기의 점이다. */
export function planDots(counts: PublicCounts): DotSpec[] {
  const total = Math.max(0, counts.todayTotal);
  const onlineDots =
    total > 0
      ? Math.round((WE_CIRCLE_DOTS * Math.max(0, counts.onlineTotal)) / total)
      : 0;

  const dots: DotSpec[] = [];
  let index = 0;
  for (const ring of RINGS) {
    for (let j = 0; j < ring.count; j += 1) {
      const angle = -Math.PI / 2 + (j * 2 * Math.PI) / ring.count;
      const online =
        Math.floor(((index + 1) * onlineDots) / WE_CIRCLE_DOTS) >
        Math.floor((index * onlineDots) / WE_CIRCLE_DOTS);
      dots.push({
        index,
        x: CENTER + ring.radius * Math.cos(angle),
        y: CENTER + ring.radius * Math.sin(angle),
        online,
      });
      index += 1;
    }
  }
  return dots;
}

export function peoplePerDot(total: number): number {
  return Math.max(1, Math.round(total / WE_CIRCLE_DOTS));
}
