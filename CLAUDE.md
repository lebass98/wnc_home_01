# 프로젝트 작업 규칙

워드앤코드 회사소개 홈페이지 + 관리자 대시보드 프로젝트입니다.

## 작업 완료 시 자동 수행 (필수)

사용자가 요청한 작업을 마치면 **묻지 말고** 아래 순서대로 수행한다.

### 1. 잔여 파일 정리

```bash
./cleanup.sh
```

macOS 가 남기는 `._*`, `.DS_Store` 를 삭제한다. `node_modules` 와 `.git` 은 건드리지 않는다.

### 2. README 작업 일지 기재

`README.md` 상단의 **작업 일지** 섹션에 오늘 날짜로 항목을 추가한다.

- 날짜는 `date +%Y-%m-%d` 로 확인한 **실제 오늘 날짜**를 쓴다. 추측하지 않는다.
- 오늘 날짜 항목이 이미 있으면 그 아래에 줄을 덧붙이고, 없으면 `### YYYY-MM-DD` 를 새로 만든다.
- 최신 날짜가 위로 오도록 정렬한다.
- 한 줄로 간결하게. 무엇을 했는지가 드러나야 하며, 파일명 나열은 하지 않는다.
  - 좋음: `제품 목록에 가격 필터 추가`
  - 나쁨: `ProductsPage.tsx, api.ts 수정`

### 3. 커밋

```bash
git add -A
git commit -m "<타입>: <한글 요약>"
```

- **커밋 메시지는 반드시 한글로 작성한다.** 타입 접두사(`feat`, `fix`, `chore`, `style`, `docs`, `refactor`)만 영문을 쓴다.
- 제목은 50자 내외. 본문이 필요하면 빈 줄 뒤에 무엇을·왜 바꿨는지 적는다.
- 커밋 메시지 끝에 다음 줄을 넣는다.
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  ```

### 4. 푸시 및 동기화

```bash
git pull --rebase origin main
git push origin main
```

- 먼저 `pull --rebase` 로 원격 변경을 가져온 뒤 푸시한다.
- **충돌이 나면 임의로 해결하지 말고 즉시 중단**하고 사용자에게 알린다.

### 자동 수행을 건너뛰는 경우

아래에 해당하면 커밋·푸시하지 않고 사용자에게 상황을 먼저 알린다.

- 코드를 전혀 바꾸지 않은 질문·조회성 작업
- 타입체크나 빌드가 실패하는 상태 (고친 뒤에 커밋한다)
- 작업이 중간 단계이고 동작하지 않는 상태
- `pull --rebase` 중 충돌 발생

## 커밋 전 확인 사항

- `.env`, `*.db`, `node_modules/`, `dist/`, `apps/api/uploads/` 가 스테이징되지 않았는지 확인한다.
- 프론트엔드를 수정했으면 `npm run typecheck --workspace=apps/web` 이 통과해야 한다.
- 백엔드를 수정했으면 `npm run typecheck --workspace=apps/api` 가 통과해야 한다.

## 프로젝트 구조

```
apps/web/        프론트엔드 (Vite + React + Tailwind)
apps/api/        백엔드 (Express + Prisma + SQLite)
packages/shared/ 프론트·백엔드 공용 타입
```

- 공용 타입은 `packages/shared/src/index.ts` 한 곳에서 관리한다. API 응답 형태를 바꾸면 여기도 함께 고친다.
- **데모 모드**: GitHub Pages 는 정적 호스팅이라 백엔드가 없다. API 를 추가하면
  `apps/web/src/lib/demoApi.ts` 에도 같은 엔드포인트를 구현해야 Pages 배포본이 동작한다.

## 개발 서버

```bash
./start.sh    # 프론트(5173) + 백엔드(4000) 동시 실행
./stop.sh     # 남은 서버 정리
```

관리자 계정: `admin@wnc.co.kr` / `admin1234`

## 코드 작성 규칙

- 주석과 UI 문구는 한글로 쓴다.
- 기존 파일의 스타일(들여쓰기, 네이밍, 주석 밀도)을 따른다.
- 사용자에게 보이는 오류 메시지는 무엇이 잘못됐고 어떻게 해야 하는지 알려준다.
- 사이트 콘텐츠 폭은 `container-wnc` (최대 1440px) 를 사용한다.
