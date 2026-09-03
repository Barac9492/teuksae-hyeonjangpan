import type { PublicCounts } from "../../domain/types";

/** 참석 숫자를 시로 읽는다. 순위가 아니라 장면으로. */
export function composePoem(counts: PublicCounts, dayIndex: number): string[] {
  const n = (value: number): string =>
    Math.max(0, value).toLocaleString("ko-KR");
  const total = n(counts.todayTotal);
  const onsite = n(counts.onsiteTotal);
  const online = n(counts.onlineTotal);
  const tomorrow = n(counts.tomorrowTotal);

  const variants: string[][] = [
    [
      `${total}개의 알람이 같은 어둠 속에서 울렸고`,
      `${onsite}개의 현관문이 열렸고`,
      `${online}개의 이어폰이 같은 소리를 들었다.`,
      `그것을 우리는 '우리'라고 부른다.`,
    ],
    [
      `${total}번의 "일어나셨어요?"가 오갔고`,
      `${onsite}개의 발자국이 어두운 주차장을 건넜고`,
      `${online}개의 화면이 부엌과 병실에서 켜졌다.`,
      `누구도 혼자 깨어 있지 않았다.`,
    ],
    [
      `${total}명이 오늘 각자의 이유로 잠을 내려놓았다.`,
      `이유는 ${total}가지였지만`,
      `향한 곳은 하나였다.`,
    ],
    [
      `${onsite}명이 앉을 자리를 찾았고`,
      `${online}명이 병실과 부엌과 먼 나라에 자리를 만들었다.`,
      `아무도 그 자리를 등급으로 부르지 않았다.`,
    ],
    [
      `${total}개의 손이 오늘 무언가를 건넸다.`,
      `떡 한 조각, 빈자리 하나, 안부 한 줄.`,
      `받은 사람의 수는 셀 수 없다.`,
    ],
    [
      `엿새 동안 ${total}명이 같은 새벽을 걸었다.`,
      `내일부터는 각자의 아침이지만`,
      `걸음은 이미 '우리'의 것이다.`,
    ],
  ];

  const lines = variants[((dayIndex % variants.length) + variants.length) % variants.length];
  if (counts.tomorrowTotal > 0 && dayIndex < 5) {
    return [...lines, `그리고 ${tomorrow}명이 내일도 오겠다고 했다.`];
  }
  return lines;
}
