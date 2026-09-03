import type { CSSProperties } from "react";
import type { PublicCounts, VenueId } from "../../domain/types";
import {
  peoplePerDot,
  planPeople,
  WE_GLYPH_COUNT,
  YOUR_POINT_INDEX,
} from "./weGlyph";

interface WeGlyphProps {
  counts: PublicCounts;
  attendingToday: boolean;
  selectedVenue: VenueId | null;
  onLightUp: () => void;
}

/** 오늘 함께한 사람들의 점으로 '우리'가 쓰인다. */
export function WeGlyph({
  counts,
  attendingToday,
  selectedVenue,
  onLightUp,
}: WeGlyphProps) {
  const people = planPeople(counts.todayTotal, counts.onlineTotal);
  const perDot = peoplePerDot(counts.todayTotal);
  const you = people[YOUR_POINT_INDEX];
  const youOnline = selectedVenue === "online";

  return (
    <div className="glyph-card">
      <svg
        className="glyph-svg"
        viewBox="0 0 320 190"
        role="img"
        aria-label={`오늘 함께 예배드리는 ${counts.todayTotal.toLocaleString("ko-KR")}명이 점 ${WE_GLYPH_COUNT}개가 되어 '우리'라는 글자를 이룹니다. ${
          attendingToday ? "당신의 점이 켜져 있습니다." : "당신의 점은 아직 비어 있습니다."
        }`}
      >
        {people.map((dot) => {
          const isYou = dot.index === YOUR_POINT_INDEX;
          const online = isYou ? youOnline : dot.online;
          const className = [
            "glyph-dot",
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
              r={isYou ? 5.2 : 3.4}
              style={{ "--o": dot.order } as CSSProperties}
              data-testid={isYou ? "glyph-your-dot" : undefined}
            />
          );
        })}
        {attendingToday && you && (
          <>
            <circle className="glyph-halo" cx={you.x} cy={you.y} r={11} />
            <text className="glyph-you-label" x={you.x} y={you.y - 16}>
              여기, 당신
            </text>
          </>
        )}
      </svg>

      <div className="glyph-copy">
        <p className="eyebrow">사람으로 쓴 글자</p>
        <h3>
          {attendingToday
            ? "이 글자 안의 점 하나가 당신입니다."
            : "글자에 아직 빈 점이 하나 있습니다."}
        </h3>
        <p>
          오늘 {counts.todayTotal.toLocaleString("ko-KR")}명이 점{" "}
          {WE_GLYPH_COUNT}개가 되어 &lsquo;우리&rsquo;를 씁니다. 점 하나는 약{" "}
          {perDot.toLocaleString("ko-KR")}명. 현장{" "}
          {counts.onsiteTotal.toLocaleString("ko-KR")}명과 온라인{" "}
          {counts.onlineTotal.toLocaleString("ko-KR")}명이 같은 크기로 같은
          글자 안에 있습니다.
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
        {!attendingToday ? (
          <button type="button" className="solid glyph-cta" onClick={onLightUp}>
            오늘 왔어요, 내 점 켜기
          </button>
        ) : (
          <p className="we-lit">
            이름도, 좌석 번호도, 순위도 없이 그저 함께 있음만 남습니다.
          </p>
        )}
      </div>
    </div>
  );
}
