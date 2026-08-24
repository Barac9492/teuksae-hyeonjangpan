import { useState } from 'react';
import { formatUpdatedLabel, VENUE_STATE_LABELS } from '../../domain/venue';
import type { AppSnapshot, VenueId, VenueState } from '../../domain/types';

interface OperatorViewProps {
  snapshot: AppSnapshot;
  onSetVenueState: (venueId: VenueId, nextState: VenueState) => number;
}

interface InteractionTiming {
  id: string;
  venueName: string;
  state: VenueState;
  elapsedSeconds: string;
}

const ALL_STATES: VenueState[] = [
  'preparing',
  'open',
  'recommended',
  'busy',
  'full',
  'checking',
];

export function OperatorView({ snapshot, onSetVenueState }: OperatorViewProps) {
  const [interactionTimings, setInteractionTimings] = useState<InteractionTiming[]>([]);

  const handleStateClick = (venueId: VenueId, venueName: string, nextState: VenueState): void => {
    const elapsedMs = onSetVenueState(venueId, nextState);
    const elapsedSeconds = (elapsedMs / 1000).toFixed(3);
    const id = `${venueId}-${Date.now()}`;

    setInteractionTimings((prev) => [
      { id, venueName, state: nextState, elapsedSeconds },
      ...prev,
    ]);
  };

  return (
    <>
      <section className="page-intro">
        <div>
          <p className="eyebrow">운영 화면</p>
          <h2>현장 상태 변경</h2>
        </div>
        <p>각 변경은 로컬 저장만 되고 백엔드와 연동되지 않습니다.</p>
      </section>

      <p className="operator-warning" role="alert">
        로컬 모드 경고: 이 화면의 변경은 현재 기기에서만 보이는 리허설 데이터입니다.
      </p>

      <section className="operator-wrap">
        <div className="op-list">
          {snapshot.venues.map((venue) => (
            <article key={venue.id} className="op-venue">
              <div className="op-head">
                <strong>{venue.name}</strong>
                <span className={`badge ${venue.state}`}>{VENUE_STATE_LABELS[venue.state]}</span>
              </div>
              <p className="op-meta">
                {formatUpdatedLabel(venue.updatedAt)} · {venue.updatedBy}
              </p>
              <div className="op-buttons">
                {ALL_STATES.map((state) => (
                  <button
                    key={state}
                    type="button"
                    className={state === venue.state ? 'selected' : ''}
                    onClick={() => handleStateClick(venue.id, venue.name, state)}
                  >
                    {VENUE_STATE_LABELS[state]}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <aside className="op-log">
          <h3>변경 로그 (불변 기록)</h3>
          <div className="interaction-timing">
            <h4>클릭 처리 시간</h4>
            {interactionTimings.length === 0 ? (
              <p className="empty-copy">아직 버튼을 누르지 않았습니다.</p>
            ) : (
              interactionTimings.slice(0, 8).map((timing) => (
                <p key={timing.id} className="log-line">
                  {timing.venueName} · {VENUE_STATE_LABELS[timing.state]} · {timing.elapsedSeconds}초
                </p>
              ))
            )}
          </div>

          {snapshot.operatorLogs.map((log) => (
            <p key={log.id} className="log-line">
              {formatUpdatedLabel(log.updatedAt)} · {log.updatedBy} · {VENUE_STATE_LABELS[log.before]} →{' '}
              {VENUE_STATE_LABELS[log.after]}
            </p>
          ))}
        </aside>
      </section>
    </>
  );
}
