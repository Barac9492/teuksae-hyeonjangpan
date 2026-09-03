import type { CSSProperties } from "react";
import type { PublicCounts, VenueId } from "../../domain/types";
import {
  CENTER,
  peoplePerDot,
  planDots,
  WE_CIRCLE_DOTS,
  YOUR_DOT_INDEX,
} from "./weCircleLayout";

interface WeCircleProps {
  counts: PublicCounts;
  attendingToday: boolean;
  selectedVenue: VenueId | null;
  onLightUp: () => void;
}

export function WeCircle({
  counts,
  attendingToday,
  selectedVenue,
  onLightUp,
}: WeCircleProps) {
  const dots = planDots(counts);
  const perDot = peoplePerDot(counts.todayTotal);
  const yourDot = dots[YOUR_DOT_INDEX];
  const youOnline = selectedVenue === "online";

  return (
    <div className="we-circle-card">
      <svg
        className="we-circle"
        viewBox="0 0 320 320"
        role="img"
        aria-label={`오늘 함께 예배드리는 ${counts.todayTotal.toLocaleString("ko-KR")}명을 점 ${WE_CIRCLE_DOTS}개로 표현한 원. ${
          attendingToday ? "당신의 점이 켜져 있습니다." : "당신의 자리는 아직 비어 있습니다."
        }`}
      >
        <circle className="we-ring" cx={CENTER} cy={CENTER} r={52} />
        <circle className="we-ring" cx={CENTER} cy={CENTER} r={90} />
        <circle className="we-ring" cx={CENTER} cy={CENTER} r={128} />
        {dots.map((dot) => {
          const isYou = dot.index === YOUR_DOT_INDEX;
          const online = isYou ? youOnline : dot.online;
          const className = [
            "we-dot",
            online ? "online" : "onsite",
            isYou ? "you" : "",
            isYou && !attendingToday ? "empty" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <circle
              key={dot.index}
              className={className}
              cx={dot.x}
              cy={dot.y}
              r={isYou ? 6 : 4.5}
              style={{ "--i": dot.index } as CSSProperties}
              data-testid={isYou ? "we-your-dot" : undefined}
            />
          );
        })}
        {attendingToday && yourDot && (
          <>
            <circle
              className="we-halo"
              cx={yourDot.x}
              cy={yourDot.y}
              r={12}
            />
            <text className="we-you-label" x={yourDot.x} y={yourDot.y - 18}>
              여기, 당신
            </text>
          </>
        )}
        <text className="we-center-num" x={CENTER} y={CENTER - 2}>
          {counts.todayTotal.toLocaleString("ko-KR")}
        </text>
        <text className="we-center-word" x={CENTER} y={CENTER + 20}>
          함께
        </text>
      </svg>

      <div className="we-circle-copy">
        <p className="eyebrow">우리의 원</p>
        <h3>
          {attendingToday
            ? "이 원 안의 점 하나가 당신입니다."
            : "당신의 자리가 비어 있습니다."}
        </h3>
        <p>
          점 하나는 약 {perDot.toLocaleString("ko-KR")}명입니다. 현장{" "}
          {counts.onsiteTotal.toLocaleString("ko-KR")}명과 온라인{" "}
          {counts.onlineTotal.toLocaleString("ko-KR")}명이 같은 크기의 점으로,
          같은 원 안에 있습니다.
        </p>
        <ul className="we-legend" aria-label="점 색 안내">
          <li>
            <span className="we-legend-dot onsite" aria-hidden="true" />
            현장
          </li>
          <li>
            <span className="we-legend-dot online" aria-hidden="true" />
            온라인
          </li>
          <li>
            <span className="we-legend-dot you" aria-hidden="true" />
            당신
          </li>
        </ul>
        {!attendingToday && (
          <button type="button" className="solid" onClick={onLightUp}>
            오늘 왔어요, 내 점 켜기
          </button>
        )}
        {attendingToday && (
          <p className="we-lit">
            오늘 참석 표시가 이 점을 켰습니다. 이름도, 좌석 번호도, 순위도 없이
            그저 함께 있음만 남습니다.
          </p>
        )}
      </div>
    </div>
  );
}
