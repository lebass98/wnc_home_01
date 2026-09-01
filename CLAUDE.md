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

### 5. 개발 서버 재시작 (코드를 고쳤다면 항상)

```bash
./stop.sh && ./start.sh
```

작업을 마치면 **사용자가 요청하지 않아도 항상 서버를 켜 둔 상태로 넘긴다.**
사용자가 매번 재시작을 부탁하지 않아도 바로 결과를 확인할 수 있어야 한다.

- 설정 파일을 고쳤다면 **반드시** 재시작해야 변경이 반영된다
  (아래 [재시작이 필요한 변경](#재시작이-필요한-변경) 참고).
- `src/` 아래 코드만 고쳤더라도, 서버가 꺼져 있거나 중간에 검증하느라 내렸다면 다시 올린다.
- 이미 정상 동작 중인 서버를 굳이 내렸다 올릴 필요는 없다. 다만 **끝난 시점에 서버는 반드시 떠 있어야 한다.**

재시작 후 두 서버가 모두 올라왔는지 확인하고, 결과를 사용자에게 알린다.

```bash
curl -s -o /dev/null -w "web:%{http_code} " http://localhost:5173/
curl -s -o /dev/null -w "api:%{http_code}\n" http://localhost:4000/api/health
```

작업 완료를 보고할 때 접속 주소를 함께 알려 준다.

- 홈페이지 http://localhost:5173
- 관리자 http://localhost:5173/admin

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

### 재시작이 필요한 변경

아래 파일은 서버 기동 시점에만 읽힌다. 수정했다면 재시작하지 않는 한
코드가 맞아도 화면에 반영되지 않으므로, 멀쩡한 코드를 잘못됐다고 오판하게 된다.
**작업 중에 결과를 확인해야 한다면 그 자리에서 바로 재시작한다.**

| 변경한 파일 | 이유 |
|---|---|
| `apps/web/tailwind.config.js` | 테마·다크모드 설정을 기동 시 한 번만 읽는다 |
| `apps/web/vite.config.ts` | 프록시·플러그인·base 경로 설정 |
| `apps/web/postcss.config.js` | CSS 파이프라인 구성 |
| `apps/api/.env` | `tsx watch` 는 `src/` 만 감시해 `.env` 변경을 감지하지 못한다 |
| `apps/api/prisma/schema.prisma` | `npx prisma generate` 후 재시작해야 새 클라이언트가 적용된다 |
| `package.json` (의존성 추가·삭제) | 새로 설치한 패키지를 읽어들여야 한다 |

재시작 뒤에는 **반드시 두 서버가 모두 올라왔는지 확인하고**, 변경이 실제로 반영됐는지 눈으로 검증한다.

```bash
curl -s -o /dev/null -w "web:%{http_code} " http://localhost:5173/
curl -s -o /dev/null -w "api:%{http_code}\n" http://localhost:4000/api/health
```

**재시작이 필요 없는 변경** (HMR/watch 로 자동 반영):
`src/` 아래의 `.tsx`·`.ts`·`.css` 파일. 프론트는 새로고침 없이 갱신되고, 백엔드는 자동 재시작된다.

## 코드 작성 규칙

- 주석과 UI 문구는 한글로 쓴다.
- 기존 파일의 스타일(들여쓰기, 네이밍, 주석 밀도)을 따른다.
- 사용자에게 보이는 오류 메시지는 무엇이 잘못됐고 어떻게 해야 하는지 알려준다.
- 사이트 콘텐츠 폭은 `container-wnc` (최대 1440px) 를 사용한다.
