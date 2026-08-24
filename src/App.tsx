import { useEffect, useMemo, useState } from 'react';
import type { AppConfig } from './domain/config';
import type { MomentDraft, VenueId, VenueState } from './domain/types';
import type { AppRepository } from './data/AppRepository';
import { LocalAppRepository } from './data/LocalAppRepository';
import { DailyPracticeView } from './features/daily-practice/DailyPracticeView';
import { Header, type AppView } from './features/header/Header';
import { BottomNavigation } from './features/navigation/BottomNavigation';
import { OperatorView } from './features/operator/OperatorView';
import { TodayAfterView } from './features/today-after/TodayAfterView';
import { TodayBeforeView } from './features/today-before/TodayBeforeView';
import { Toast } from './features/toast/Toast';
import { WeekSummaryView } from './features/week-summary/WeekSummaryView';

interface AppProps {
  config: AppConfig;
  repository?: AppRepository;
}

type DemoPhase = 'before' | 'after';

export default function App({ config, repository }: AppProps) {
  const repo = useMemo<AppRepository>(
    () => repository ?? new LocalAppRepository(config),
    [config, repository],
  );

  const [snapshot, setSnapshot] = useState(repo.getSnapshot());
  const [activeView, setActiveView] = useState<AppView>('today');
  const [demoPhase, setDemoPhase] = useState<DemoPhase>('before');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => repo.subscribe(setSnapshot), [repo]);

  useEffect(() => {
    const goOnline = (): void => setOnline(true);
    const goOffline = (): void => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const showToast = (message: string): void => {
    setToastMessage(message);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 2200);
  };

  const handleToggleTodayAttendance = (): void => {
    const next = !snapshot.attendance.today;
    repo.setAttendanceToday(next);
    showToast(next ? '오늘 참석으로 표시했습니다.' : '오늘 참석 표시를 취소했습니다.');
  };

  const handleToggleTomorrowAttendance = (): void => {
    const next = !snapshot.attendance.tomorrow;
    repo.setTomorrowAttendance(next);
    showToast(next ? '내일 참석 예정으로 표시했습니다.' : '내일 참석 예정 표시를 취소했습니다.');
  };

  const handleSelectVenue = (venueId: VenueId): void => {
    repo.selectVenue(venueId);
    showToast(venueId === 'online' ? '온라인 예배로 선택했습니다.' : '참석 장소를 선택했습니다.');
  };

  const handleCreateMomentDraft = (draft: MomentDraft): void => {
    repo.addMomentDraft(draft);
  };

  const handleTogglePracticeToday = (): void => {
    if (!snapshot.practice.selectedAction) {
      setActiveView('today');
      if (config.demoMode) {
        setDemoPhase('after');
      }
      showToast('먼저 오늘 실천을 선택해 주세요.');
      return;
    }

    repo.togglePracticeCompleted(config.todayIndex);
    const done = !snapshot.practice.completedDayIndexes.includes(config.todayIndex);
    showToast(done ? '오늘 실천을 완료로 기록했습니다.' : '오늘 실천 완료를 취소했습니다.');
  };

  const handleSetVenueState = (venueId: VenueId, nextState: VenueState): number => {
    const start = performance.now();
    repo.setVenueState(venueId, nextState, '운영자 로컬');
    const end = performance.now();
    showToast('장소 상태를 로컬에 반영했습니다.');
    return end - start;
  };

  return (
    <div className="app-root">
      <Header
        appName={config.appName}
        churchName={config.churchName}
        activeView={activeView}
        online={online}
        onChangeView={setActiveView}
      />

      {config.demoMode && activeView === 'today' && (
        <div className="demo-bar">
          <div className="shell demo-inner">
            <p className="demo-copy">예배 전/후 화면은 데모 모드에서만 전환됩니다.</p>
            <div className="phase-switch" role="group" aria-label="예배 전후 전환">
              <button
                type="button"
                className={demoPhase === 'before' ? 'active' : ''}
                onClick={() => setDemoPhase('before')}
              >
                {config.phaseLabels.before}
              </button>
              <button
                type="button"
                className={demoPhase === 'after' ? 'active' : ''}
                onClick={() => setDemoPhase('after')}
              >
                {config.phaseLabels.after}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="shell app-main" id="main-content">
        {activeView === 'today' && (!config.demoMode || demoPhase === 'before') && (
          <TodayBeforeView
            config={config}
            snapshot={snapshot}
            onToggleTodayAttendance={handleToggleTodayAttendance}
            onToggleTomorrowAttendance={handleToggleTomorrowAttendance}
            onSelectVenue={handleSelectVenue}
            onCreateMomentDraft={handleCreateMomentDraft}
            onToast={showToast}
          />
        )}

        {activeView === 'today' && config.demoMode && demoPhase === 'after' && (
          <TodayAfterView
            config={config}
            snapshot={snapshot}
            onSelectPracticeAction={(value) => repo.setPracticeAction(value)}
            onWordNoteChange={(value) => repo.setWordNote(value)}
            onPrayerNoteChange={(value) => repo.setPrayerNote(value)}
          />
        )}

        {activeView === 'daily' && (
          <DailyPracticeView
            config={config}
            snapshot={snapshot}
            onToggleTodayPractice={handleTogglePracticeToday}
          />
        )}

        {activeView === 'week' && <WeekSummaryView config={config} snapshot={snapshot} />}

        {activeView === 'operator' && (
          <OperatorView snapshot={snapshot} onSetVenueState={handleSetVenueState} />
        )}
      </main>

      <BottomNavigation activeView={activeView} onChangeView={setActiveView} />
      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  );
}
