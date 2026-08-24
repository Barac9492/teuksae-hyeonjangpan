# 특새 현장판

분당우리교회 특별새벽부흥회 기간에 사용할 **교회 공식 모바일 현장판** (PWA v1).

> 예배 전에는 장소별 혼잡도와 안전 정보를 확인하고 참석 여부를 표시합니다.
> 예배 후에는 받은 말씀을 오늘 실천할 한 가지로 정해 특새를 일새로 이어갑니다.

## 빠른 시작

```bash
npm install
npm run dev
```

프로덕션 빌드:

```bash
npm run build
npm run preview
```

테스트:

```bash
npm test
```

자세한 운영 절차는 [`docs/RUNBOOK.md`](docs/RUNBOOK.md)를 참고하세요.

## 화면 구성

1. **오늘** — 예배 전 장소 안내, 참석, 2초 영상, 예배 후 말씀·일새·개인 기록
2. **일새** — 오늘 실천 확인, 주간 일새 스트립
3. **주간** — 나만 보는 참석·일새 기록
4. **운영** — 장소 상태 변경 및 감사 로그 (로컬 모드)

## 데모 모드

`public/app-config.json`에서 `demoMode: true`이면 예배 전·후 전환과 예시 참석 숫자가 표시됩니다. 공유 백엔드는 아직 연결되지 않았으며, 모든 변경은 이 기기 `localStorage`에만 저장됩니다.

## 프로토타입

승인된 단일 HTML 목업은 [`prototype.html`](prototype.html)에 보관되어 있습니다. 새 앱은 Vite + React + TypeScript로 재구현되었으며, 시각 디자인과 한국어 문구를 유지합니다.

## 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 현재 구현 vs 백엔드 대기 항목
- [`docs/BACKEND-CONTRACT.md`](docs/BACKEND-CONTRACT.md) — 향후 API (개인 기록 제외)
- [`docs/PLAN.md`](docs/PLAN.md) — 초기 조사·검증 계획

## 제품 원칙

- 정확한 좌석 수보다 담당자가 방금 확인한 상태를 제공합니다.
- 본당, 드림센터, 체육관, 온라인은 같은 예배의 자리입니다.
- 참석 인원은 순위를 매기지 않습니다.
- 기도·간증 공개 게시판, 리더보드, AI 설교 요약은 만들지 않습니다.
- 개인 말씀·기도 기록은 이 기기에만 저장됩니다.
