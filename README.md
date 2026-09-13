# 특새 현장판

새 홈페이지는 `/`, 기존 현장판은 `/app`에서 실행합니다. Apple 벤치마크 목업을 유지한 React 스캐폴드의 구성과 콘텐츠 수정 방법은 [홈페이지 개발 안내](docs/LANDING-SCAFFOLD.md)를 참고하세요. 홈페이지는 별도의 환경 변수 없이 실행됩니다.

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
- 기기 전용: `wordNote`, `prayerNote`, 선택한 실천, 실천 완료 기록, 우리 나눔 기록(카풀·간식·사진·감사 메모)
- 금지: 좌석 수, 리더보드, 연속 출석, 공개 피드/기도/간증, QR 출석, AI 설교 요약, 오픈 카풀 매칭

## 우리 탭

`우리` 탭은 다락방 단톡방에 보낼 것을 30초 안에 만드는 화면이다. 카풀·간식 문장 생성(앱은 매칭하지 않는다), 사진·영상 검수 대기 업로드, 운전자 잠 계산, 이름 없는 감사 한 줄, 기기 전용 나눔 기록으로 구성된다. 참석 인원은 같은 크기의 점으로 그린 '우리' 글자로만 보여 주며, 공식 승인 전 카드에는 "운영 리허설 · 예시 숫자"가 찍힌다. 나눔 기록은 세지도 비교하지도 않는다. 리뷰 기록은 `docs/reviews/`에 있다.

설정은 [운영 런북](docs/RUNBOOK.md), 보안 계약은 [백엔드 계약](docs/BACKEND-CONTRACT.md)을 참고하세요. 프로덕션 본문 제어는 `public/app-config.json`의 `officialApproved`, active event의 `official_approved`, `VITE_APP_MODE=production`이 모두 충족될 때만 공식 안내가 됩니다.
