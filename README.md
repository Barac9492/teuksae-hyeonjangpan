# 특새 현장판

특별새벽부흥회 현장 안내, 익명 참석 표시, 개인 실천 기록을 제공하는 PWA입니다. 승인 전 모든 원격 데이터는 **운영 리허설**로 표시됩니다.

## 실행
```bash
npm install
cp .env.example .env.local
npm run dev
npm test
npm run lint
npm run build
node --check public/sw.js
```

`VITE_APP_MODE=local`은 `LocalAppRepository`만 사용합니다. `pilot`은 Supabase가 연결돼도 리허설로 표시하며, 설정이 없으면 안전하게 로컬 리허설로 돌아갑니다. `production`은 URL/anon key가 없으면 앱을 중지합니다.

## 데이터 경계
- 공유: 집계 참석 수, 장소 상태와 불변 로그, 비공개 검수 대기 미디어
- 기기 전용: `wordNote`, `prayerNote`, 선택한 실천, 실천 완료 기록
- 금지: 좌석 수, 리더보드, 연속 출석, 공개 피드/기도/간증, QR 출석, AI 설교 요약

설정은 [운영 런북](docs/RUNBOOK.md), 보안 계약은 [백엔드 계약](docs/BACKEND-CONTRACT.md)을 참고하세요. 프로덕션 본문 제어는 `public/app-config.json`의 `officialApproved`, active event의 `official_approved`, `VITE_APP_MODE=production`이 모두 충족될 때만 공식 안내가 됩니다.
