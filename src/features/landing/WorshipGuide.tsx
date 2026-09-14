import { useState } from 'react';
import type { RefObject } from 'react';
import { eventContent, placeOrder, places } from './content';
import type { PlaceId } from './content';

interface Props {
  selected: PlaceId;
  onSelect: (place: PlaceId) => void;
  sectionRef?: RefObject<HTMLElement | null>;
}

export function WorshipGuide({ selected, onSelect, sectionRef }: Props) {
  const [expanded, setExpanded] = useState(false);
  const place = places[selected];

  function choose(id: PlaceId) {
    onSelect(id);
    setExpanded(false);
  }

  return (
    <section className="wa-worship" id="wa-worship" ref={sectionRef} aria-labelledby="wa-hero-title">
      <div className="wa-hero-copy">
        <p className="wa-kicker">{eventContent.name} · 일러스트 시안</p>
        <h1 id="wa-hero-title">우리</h1>
        <p className="wa-hero-line">{eventContent.headline}</p>
        <p className="wa-schedule">{eventContent.schedule}</p>
      </div>
      <div className="wa-status-panel" aria-label="오늘 예배 장소 예시">
        <div className="wa-status-heading"><div><span className="wa-live-dot" aria-hidden="true" />오늘 예배 장소</div><strong>상태와 시간은 모두 예시</strong></div>
        <div className="wa-place-picker" role="group" aria-label="예배 장소 선택">
          {placeOrder.map((id) => (
            <button type="button" key={id} aria-pressed={selected === id} onClick={() => choose(id)}>
              <strong>{places[id].label}</strong><span className={`wa-venue-state wa-venue-state-${id}`}>{places[id].state}</span><small>{places[id].sampleTime}</small>
            </button>
          ))}
        </div>
        <div className="wa-place-detail" aria-live="polite">
          <div><p className="wa-example-label">예시 안내</p><h2>{place.title}</h2><p>{place.description}</p></div>
          <dl>{place.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
          <button type="button" className="wa-detail-toggle" aria-expanded={expanded} aria-controls="wa-access-detail" onClick={() => setExpanded((value) => !value)}>{place.action}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
          <div id="wa-access-detail" className="wa-access-detail" hidden={!expanded}>{place.guidance.map((line) => <p key={line}>{line}</p>)}</div>
        </div>
      </div>
    </section>
  );
}
