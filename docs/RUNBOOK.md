# RUNBOOK

## 설치 및 개발

```bash
npm install
npm run dev
```

Vite 기본 주소(`http://localhost:5173`)에서 확인한다. 개발 모드에서는 서비스 워커가 등록되지 않는다.

## 품질 확인

```bash
npm run lint
npm run test
npm run build
```

프로덕션 빌드 후 미리보기:

```bash
npm run preview
```

## 설정

`public/app-config.json`을 수정한다. `demoMode: true`이면 예배 전/후 전환과 예시 숫자 라벨이 표시된다. 개발 중에는 재시작 없이 새로고침으로 반영된다.

## 운영 리허설 (로컬 모드)

1. **운영** 탭으로 이동한다.
2. 로컬 모드 경고 문구를 확인한다.
3. 각 장소에서 6개 상태 버튼을 눌러 즉시 반영되는지 확인한다.
4. **변경 로그**에 `before → after` 기록이 누적되는지 확인한다.
5. **오늘** 탭으로 돌아가 이 기기에서만 반영되는지 확인한다.
6. 10분 이상 경과(또는 저장소의 `updatedAt` 조정) 후 공개 화면에 `확인 중`이 표시되는지 확인한다.

## 모먼트 업로드 리허설

1. **오늘** 탭에서 모먼트 업로드 영역을 연다.
2. 동의 체크 전에는 파일 입력이 비활성화되는지 확인한다.
3. 지원 타입(`jpeg/png/webp/mp4/mov`) 파일을 20MB 이하로 선택한다.
4. 미리보기와 `pending_review` 안내가 표시되는지 확인한다.
5. 새 파일 선택 시 이전 object URL이 해제되는지 확인한다.

## 문제 대응

- 로컬 저장 데이터가 깨졌다면 `localStorage`의 `teuksae-app-v1-snapshot` 키를 삭제한다. 앱은 손상·구버전 값을 감지하면 기본 시드로 복구한다.
- 백엔드가 연결되지 않았으므로 실제 공식 데이터 반영을 기대하면 안 된다.
- 디자인 참고용 단일 파일 목업은 루트의 `prototype.html`을 브라우저에서 직접 연다.

## CI

GitHub Actions에서 `npm ci`, `lint`, `test`, `build`를 실행한다.
