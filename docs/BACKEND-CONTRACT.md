# 백엔드 연동 계약 초안

현재 앱은 로컬 모드만 동작한다. 아래는 향후 `remote` 어댑터 추가 시 참고할 계약 초안이다.

## 공통 원칙

- 개인정보 최소화
- 운영 로그는 불변 이벤트로 저장
- **`wordNote`와 `prayerNote`는 어떤 원격 페이로드에도 포함하지 않는다** (로컬 전용, 영구 제외)
- `checking`은 공개 표시용 파생 상태이며 원본 상태는 이벤트 로그를 기준으로 판단

## 원격 동기화 대상

```typescript
// 서버로 보낼 수 있는 개인 실천 필드
interface PersonalPracticeRemoteSafe {
  selectedAction: string;
  completedDayIndexes: number[];
}

// 절대 전송 금지
interface PersonalPracticeRemoteExcluded {
  wordNote: never;
  prayerNote: never;
}
```

## 제안 엔드포인트

### `GET /v1/public/snapshot`

공개 스냅샷(장소 상태, 집계 숫자).

```json
{
  "updatedAt": "2026-08-24T04:17:00.000Z",
  "venues": [
    {
      "id": "dream",
      "name": "드림센터",
      "state": "recommended",
      "description": "지금은 자리가 여유롭습니다.",
      "updatedAt": "2026-08-24T04:15:00.000Z",
      "updatedBy": "현장 담당자"
    }
  ],
  "publicCounts": {
    "todayTotal": 2659,
    "onsiteTotal": 2041,
    "onlineTotal": 618,
    "tomorrowTotal": 1384
  }
}
```

### `POST /v1/attendance`

```json
{
  "today": true,
  "tomorrow": false,
  "selectedVenue": "online"
}
```

> 개인 메모 필드는 요청 본문에 포함하지 않는다.

### `POST /v1/operator/venue-state`

```json
{
  "venueId": "songrim",
  "state": "full",
  "updatedBy": "운영자"
}
```

응답에는 저장된 이벤트 ID와 서버 시각을 포함한다.

### 모먼트 업로드(향후)

1. `POST /v1/moments/upload-url` — 사전 서명 URL 발급
2. 클라이언트가 스토리지에 직접 업로드
3. `POST /v1/moments` — 메타데이터 등록 (`status: pending_review`)

v1에서는 이 과정을 구현하지 않는다.

## 이벤트 스트림(선택)

- `venue.state.changed`
- `public.counts.updated`
- `moment.pending_review.created`

모든 이벤트에 `eventId`, `occurredAt`, `source`, `schemaVersion`을 포함한다.

## 클라이언트 전환

백엔드 연결 시 `RemoteAppRepository`(또는 하이브리드)를 구현하고 `mode: 'remote'`로 `capabilities`를 갱신한다. 오프라인 리허설과 데모용으로 `LocalAppRepository`는 유지한다.
