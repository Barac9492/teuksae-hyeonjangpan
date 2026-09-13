import { useRef, useState } from 'react';
import { eventContent, photoSources, scenes } from './content';
import type { PlaceId } from './content';
import { SceneStory } from './SceneStory';
import { WorshipGuide } from './WorshipGuide';
import { EverydayPrayer } from './EverydayPrayer';

export function LandingPage() {
  const [selectedPlace, setSelectedPlace] = useState<PlaceId>('songlim');
  const guideRef = useRef<HTMLElement>(null);
  const heroPhoto = scenes[0];
  function openGuide(place: PlaceId): void {
    setSelectedPlace(place);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true;
    guideRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
  return (
    <div id="woori-apple" lang="ko">
      <nav className="wa-nav" aria-label="특별새벽부흥회 메뉴">
        <a className="wa-brand" href="#wa-home" aria-label="분당우리교회 특새 첫 화면"><span className="wa-wordmark">우리</span><span className="wa-brand-rule" aria-hidden="true" /><span>분당우리교회</span></a>
        <div className="wa-menu">
          <a href="#wa-story">우리의 새벽</a><a href="#wa-today">예배 안내</a><a href="#wa-everyday">우리의 일상</a>
          <button type="button" className="wa-small-action" onClick={() => openGuide('online')}>오늘 예배</button>
        </div>
      </nav>
      <main>
        <section className="wa-hero" id="wa-home" aria-labelledby="wa-hero-title">
          <p className="wa-eyebrow">{eventContent.name}</p><h1 id="wa-hero-title">우리</h1><p className="wa-hero-sub">{eventContent.headline}</p>
          <div className="wa-actions">
            <button type="button" className="wa-main-action" onClick={() => openGuide('online')}>오늘 예배 <span className="wa-arrow" aria-hidden="true">›</span></button>
            <button type="button" className="wa-text-action" onClick={() => openGuide('songlim')}>현장 안내 <span className="wa-arrow" aria-hidden="true">›</span></button>
          </div>
          <figure className="wa-hero-photo">
            <img src={heroPhoto.image} alt={heroPhoto.alt} width={heroPhoto.width} height={heroPhoto.height} fetchPriority="high" />
            <figcaption className="wa-photo-caption">우리의 예배 풍경 · 2026.03.22</figcaption>
          </figure>
        </section>
        <div className="wa-invitation"><p>함께 울고, 함께 웃는 우리.<br /><span>이 새벽에도, 서로의 곁에.</span></p><a className="wa-text-action" href="#wa-story">우리의 새벽을 만나다 <span className="wa-arrow" aria-hidden="true">↓</span></a></div>
        <SceneStory />
        <WorshipGuide selected={selectedPlace} onSelect={setSelectedPlace} sectionRef={guideRef} />
        <EverydayPrayer />
      </main>
      <footer className="wa-footer">
        <div className="wa-footer-top"><span>함께 울고 함께 웃는 분당우리교회</span><span>디자인 시안 · 공식 행사 안내가 아닙니다.</span></div>
        <details><summary>사진 출처 및 안내</summary><p>행사 주제와 일정은 미정이며, 말씀과 기도는 구성을 보여주기 위한 예시입니다.</p>
          <ul>
            <li>예배당 사진: <a href={photoSources.worship} target="_blank" rel="noopener noreferrer">분당우리교회 2026.03.22 주일 3부 예배 풍경</a></li>
            <li>가정 사진: <a href={photoSources.family} target="_blank" rel="noopener noreferrer">국민일보 가정 성경읽기 사진</a> · 분위기 참고용이며 분당우리교회 성도 사진으로 표시하지 않습니다.</li>
          </ul>
        </details>
      </footer>
    </div>
  );
}
