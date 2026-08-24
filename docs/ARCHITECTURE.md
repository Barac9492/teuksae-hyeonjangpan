# 특새 현장판 v1 아키텍처

## 개요

`Vite + React + TypeScript` 단일 SPA로, 특별새벽부흥회 현장 안내와 개인 실천 기록을 제공한다. v1은 **로컬 모드**만 동작하며 실시간 동기화·업로드·인증은 구현하지 않는다.

## 디렉터리 구조

```
src/
  domain/     타입, 장소 상태 파생, 설정 로더
  data/       AppRepository 인터페이스 + LocalAppRepository
  features/   화면별 UI (오늘, 일새, 주간, 운영)
  styles/     tokens, base, app
public/       manifest, sw.js, app-config.json, 아이콘
```

## 저장소 경계

- `AppRepository` 인터페이스가 읽기/쓰기 계약을 정의한다.
- `LocalAppRepository`가 버전이 붙은 JSON을 `localStorage`에 저장한다.
- 탭 간 동기화: `BroadcastChannel` 우선, 불가 시 `storage` 이벤트로 반영한다.

## 상태 모델

| 영역 | 내용 |
|------|------|
| 장소 | 6종 상태(`preparing/open/recommended/busy/full/checking`), 10분 초과 시 공개 화면에서 `checking`으로 파생 |
| 참석 | 오늘/내일 참석, 장소 선택, `attendanceDayIndexes` |
| 실천 | 선택/완료, 개인 메모(`wordNote`, `prayerNote`) — 로컬 전용 |
| 모먼트 | 메타데이터만 저장(`id`, `pending_review`), 파일 업로드 없음 |
| 운영 | 불변 변경 로그(`before` → `after`) |

## PWA

- `manifest.webmanifest` + 프로덕션 빌드에서만 `sw.js` 등록
- 앱 셸: 네트워크 우선 내비게이션, 오프라인 시 `/index.html` 폴백
- `/assets/` 해시 자산: 캐시 우선
- 비-GET 요청 및 `/api/` 경로는 가로채지 않음

## 의도적으로 제외된 범위

- 교회 운영 데이터 실시간 동기화
- 운영자 변경 서버 전송
- 모먼트 파일 업로드
- 인증/권한, 푸시 알림, 분석

## 핵심 규칙

1. 공식 현장 안내판이 항상 우선이다.
2. 10분 이상 갱신되지 않은 장소 상태는 공개 UI에서 `확인 중`으로 표시한다. 저장된 원본 상태와 운영 로그는 그대로 유지한다.
3. 데모 모드의 숫자와 상태는 예시이며 실제 집계로 오인하지 않도록 라벨링한다.
4. `prototype.html`은 디자인 참고용 단일 파일 목업으로 보존한다.
