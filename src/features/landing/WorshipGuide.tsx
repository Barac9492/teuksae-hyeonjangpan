import { useState } from 'react';
import type { RefObject } from 'react';
import { eventContent, placeOrder, places } from './content';
import type { PlaceId, WorshipPlace } from './content';

interface Props {
  selected: PlaceId;
  onSelect: (place: PlaceId) => void;
  sectionRef: RefObject<HTMLElement | null>;
}

function PlaceDetails({ place }: { place: WorshipPlace }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div className="wa-place-detail" aria-live="polite">
        <h3>{place.title}</h3><p className="wa-place-description">{place.description}</p>
        <dl className="wa-facts">{place.facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      </div>
      <button type="button" className="wa-guide-button" aria-expanded={expanded} aria-controls="wa-guide-more"
        onClick={() => setExpanded(value => !value)}>
        <span>{place.action}</span><span className="wa-toggle-mark" aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>
      <div className="wa-guide-more" id="wa-guide-more" hidden={!expanded}>{place.guidance.map(line => <p key={line}>{line}</p>)}</div>
    </>
  );
}

export function WorshipGuide({ selected, onSelect, sectionRef }: Props) {
  return (
    <section className="wa-today" id="wa-today" ref={sectionRef} aria-labelledby="wa-today-title">
      <div className="wa-today-head"><h2 className="wa-section-title" id="wa-today-title">오늘도, 우리 함께.</h2><p>예배드릴 자리를 선택해주세요.</p></div>
      <div className="wa-guide">
        <div className="wa-guide-intro">
          <div><p className="wa-eyebrow">{eventContent.name}</p><h3>우리의 새벽을<br />준비합니다.</h3></div>
          <div><p>같은 말씀으로 하루를 열고,<br />함께 기도하는 시간.</p><p className="wa-schedule">{eventContent.schedule}</p></div>
        </div>
        <div className="wa-guide-body">
          <div className="wa-place-picker" role="group" aria-label="예배 장소">
            {placeOrder.map(id => <button type="button" key={id} aria-pressed={selected === id} onClick={() => onSelect(id)}>{places[id].label}</button>)}
          </div>
          <PlaceDetails key={selected} place={places[selected]} />
        </div>
      </div>
    </section>
  );
}
