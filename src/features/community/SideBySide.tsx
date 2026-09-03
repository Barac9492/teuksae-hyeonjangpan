import { useEffect, useState } from "react";
import type { DawnSky } from "./dawnSky";
import { inkForSky } from "./dawnSky";

export const SIDE_BY_SIDE_CHARS = ["분", "당", "우", "리", "교", "회"] as const;

interface SideBySideProps {
  sky: DawnSky;
  onClose: () => void;
}

/**
 * 여섯 사람이 폰을 나란히 놓으면 '분당우리교회'가 완성된다.
 * 서버도, 연결도 없다. 옆 사람이 있어야만 완성되는 화면.
 */
export function SideBySide({ sky, onClose }: SideBySideProps) {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const tone = inkForSky(sky);

  return (
    <div
      className={`side-overlay ink-${tone}`}
      role="dialog"
      aria-modal="true"
      aria-label="나란히 모드"
      style={{
        background: `linear-gradient(180deg, ${sky.top}, ${sky.bottom})`,
      }}
    >
      <button type="button" className="side-close" onClick={onClose}>
        닫기
      </button>

      {index === null ? (
        <div className="side-pick">
          <p className="eyebrow">나란히</p>
          <h2>여섯 개의 폰이 나란히 놓이면 한 단어가 됩니다.</h2>
          <p>
            옆 사람과 글자를 하나씩 고르고 폰을 붙여 놓아 보세요. 혼자서는
            완성할 수 없는 화면입니다.
          </p>
          <div className="side-chars" role="group" aria-label="글자 고르기">
            {SIDE_BY_SIDE_CHARS.map((char, i) => (
              <button
                key={char}
                type="button"
                className="side-char-btn"
                onClick={() => setIndex(i)}
              >
                <span>{char}</span>
                <small>{i + 1}번째</small>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="side-stage"
          onClick={() => setIndex(null)}
          aria-label={`${SIDE_BY_SIDE_CHARS[index]}. 눌러서 다른 글자 고르기`}
        >
          <span className="side-big">{SIDE_BY_SIDE_CHARS[index]}</span>
          <span className="side-hint">
            {index + 1} / {SIDE_BY_SIDE_CHARS.length} · 왼쪽부터{" "}
            {SIDE_BY_SIDE_CHARS.join("·")}
          </span>
        </button>
      )}
    </div>
  );
}
