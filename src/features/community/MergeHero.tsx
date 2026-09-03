import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { DawnSky } from "./dawnSky";
import { inkForSky } from "./dawnSky";

interface MergeHeroProps {
  sky: DawnSky;
  merged: boolean;
  onMerge: () => void;
}

/**
 * '나'를 끌어다 '너'에 붙이면 '우리'가 된다.
 * 손으로 끌 수도, 버튼으로도 할 수 있다.
 */
export function MergeHero({ sky, merged, onMerge }: MergeHeroProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const finish = (): void => {
    setDragging(false);
    startRef.current = null;
    const stage = stageRef.current;
    if (!stage) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    const me = stage.querySelector<HTMLElement>(".merge-me");
    const you = stage.querySelector<HTMLElement>(".merge-you");
    if (me && you) {
      const a = me.getBoundingClientRect();
      const b = you.getBoundingClientRect();
      const dist = Math.hypot(
        a.left + a.width / 2 - (b.left + b.width / 2),
        a.top + a.height / 2 - (b.top + b.height / 2),
      );
      if (dist < Math.max(48, a.width * 0.75)) {
        setOffset({ x: 0, y: 0 });
        onMerge();
        return;
      }
    }
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (merged) return;
    startRef.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>): void => {
    if (!dragging || !startRef.current) return;
    setOffset({
      x: event.clientX - startRef.current.x,
      y: event.clientY - startRef.current.y,
    });
  };

  const tone = inkForSky(sky);

  return (
    <section
      className={`merge-hero ink-${tone} ${merged ? "merged" : ""}`}
      style={{
        background: `linear-gradient(180deg, ${sky.top}, ${sky.bottom})`,
      }}
      aria-label="나와 너가 우리가 되는 장면"
    >
      <div className="merge-sun" style={{ opacity: sky.glow }} aria-hidden="true" />
      <div className="merge-time" aria-live="polite">
        <span className="merge-clock">{sky.timeLabel}</span>
        <span className="merge-phase">{sky.phase.label}</span>
      </div>

      <div className="merge-stage" ref={stageRef}>
        {!merged ? (
          <>
            <button
              type="button"
              className={`merge-ball merge-me ${dragging ? "dragging" : ""}`}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={finish}
              onPointerCancel={finish}
              onClick={(event) => {
                // 끌지 않고 누르기만 해도 합쳐진다 (키보드·보조기기 포함).
                if (!dragging && offset.x === 0 && offset.y === 0) {
                  event.preventDefault();
                  onMerge();
                }
              }}
              aria-label="나. 끌어서 너에게 붙이거나 눌러서 합치기"
            >
              나
            </button>
            <span className="merge-arrow" aria-hidden="true">
              ⟶
            </span>
            <div className="merge-ball merge-you" aria-hidden="true">
              너
            </div>
          </>
        ) : (
          <div className="merge-we" role="status">
            <span className="merge-we-word">우리</span>
            <span className="merge-burst" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <i key={i} style={{ transform: `rotate(${i * 30}deg)` }} />
              ))}
            </span>
          </div>
        )}
      </div>

      <div className="merge-copy">
        <p className="eyebrow">분당우리교회 특새</p>
        <h2 className="merge-title" aria-label={merged ? "분당우리교회" : undefined}>
          {merged ? (
            <>
              분당<mark>우리</mark>교회
            </>
          ) : (
            <>&lsquo;나&rsquo;를 &lsquo;너&rsquo;에게 붙여 보세요.</>
          )}
        </h2>
        <p className="merge-lead">
          {merged
            ? "이름에 붙은 두 글자가 아니라, 새벽마다 다시 만들어지는 말입니다. 누군가를 깨우고, 태우고, 떡을 떼는 동안 나와 너는 우리가 됩니다."
            : "우리는 처음부터 우리가 아니었습니다. 새벽 세 시의 전화 한 통, 빈자리 하나에서 시작됩니다."}
        </p>
        <p className="merge-phase-line">{sky.phase.line}</p>
      </div>
    </section>
  );
}
