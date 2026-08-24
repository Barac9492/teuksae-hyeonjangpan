import type { ReactNode } from 'react';

export type AppView = 'today' | 'daily' | 'week' | 'operator';

interface HeaderProps {
  appName: string;
  churchName: string;
  activeView: AppView;
  online: boolean;
  onChangeView: (view: AppView) => void;
  trailing?: ReactNode;
}

const VIEWS: Array<{ id: AppView; label: string }> = [
  { id: 'today', label: '오늘' },
  { id: 'daily', label: '일새' },
  { id: 'week', label: '주간' },
  { id: 'operator', label: '운영' },
];

export function Header({
  appName,
  churchName,
  activeView,
  online,
  onChangeView,
  trailing,
}: HeaderProps) {
  return (
    <header className="top-header">
      <div className="shell top-inner">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            새
          </div>
          <div>
            <h1>{appName}</h1>
            <small>{churchName} 공식 안내</small>
          </div>
        </div>

        <nav className="desktop-nav" aria-label="주요 메뉴">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className={activeView === view.id ? 'active' : ''}
              onClick={() => onChangeView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </nav>

        <div className="status-group">
          <span className={`online-badge ${online ? 'is-online' : 'is-offline'}`} role="status">
            {online ? '온라인' : '오프라인'}
          </span>
          {trailing}
        </div>
      </div>
      {!online && (
        <p className="offline-warning shell" role="status">
          오프라인 상태입니다. 장소 정보가 최신이 아닐 수 있습니다.
        </p>
      )}
    </header>
  );
}
