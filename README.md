# 워드앤코드 홈페이지 템플릿

회사소개 홈페이지 + 관리자 대시보드(게시판·문의 관리) 모노레포 템플릿입니다.

## 작업 일지

작업이 끝날 때마다 날짜별로 한 줄씩 간략히 기록합니다. (최신 날짜가 위)

### 2026-09-02

- 소식 페이지를 참고 템플릿(THEME007 공지사항) 구성으로 개편 — 상단 배너 탭으로 게시판을 오가고, 등록 건수·알약형 검색 상자·번호/제목/작성자/등록일/조회 표
- 제품소개 페이지를 참고 템플릿 구성으로 개편 — 상단 배너 탭으로 대분류를 하나씩 오가고, 탭마다 소개 글·대표 이미지·이미지 좌측형 제품 목록
- 사업분야 페이지를 참고 템플릿(THEME007 business-infra) 구성으로 개편 — 소개 두 묶음, 사업 인프라 제목·선, 번호형 카드 세 장
- 상단 POPUP 문구를 서브 페이지에서도 항상 표시 — 배지는 게시 중인 전체 건수, 누르면 어디서든 팝업 열림
- 메인 비주얼 조작부를 하단 가운데 반투명 알약 형태로 옮김 — 점 인디케이터와 이전·정지/재생·다음 버튼
- 사이트맵을 WEVEN 형태로 재디자인 — 검정 덮개 위 로고·유틸 링크·5열 메뉴, 오른쪽에서 밀려 들어오며 페이드인, 닫으면 오른쪽으로 밀려 나가며 페이드아웃
- 상단 메뉴 오른쪽에 언어 선택(국기·KOR)·POPUP 건수 배지·사이트맵 버튼 추가, 인천공항 형태의 사이트맵 페이지 신설
- 팝업을 KIHF 형태로 개편 — 두 장씩 보이며 세 장부터 좌우 화살표로 무한 루프, 메인 비주얼은 KHA 처럼 천천히 밀리는 슬라이드·배경 패럴랙스·번호/재생 조작 막대 추가
- 기본 팝업 데이터를 6건으로 늘려 진행중 3건이 첫 화면에 뜨도록 하고, 한 화면에 나란히 놓는 개수를 3장으로 조정
- 작업 일지를 날짜별 한 줄 요약으로 정리하고, 하위 항목을 만들지 않도록 작업 규칙에 명시
- 홈페이지 팝업을 화면 가운데 겹침 형태로 개편 (2장까지 나란히, 3장부터 슬라이드, 건수·닫기·오늘 하루 열지 않기)
- 메인·회사소개에 스크롤 인터랙션 추가 — 화면에 들어온 요소가 순차적으로 나타남
- 회사소개 페이지를 참고 템플릿 구성으로 개편하고 서브 페이지 상단 배너를 어두운 형태로 통일
- 로고를 영문 WORDNCODE 로 변경하고 W 아이콘 삭제
- 메인 화면을 참고 템플릿(THEME039) 구성으로 전면 개편, 강조색 민트 계열 추가
- KRDS 형태 날짜 선택기 도입 — 단일·기간 선택, 시각 선택, [확인] 을 눌러야 반영
- 팝업 관리 기능 신설 — 게시기간·노출위치·창 형태·표시기간 설정, 진행 상태 필터와 검색
- 어드민 다국어(i18n) 구조 구현 — 4개 언어팩과 언어 선택, 번역문은 미입력 상태
- 게시판 설정 페이지 신설 — 5개 탭 중 기본 설정 탭 구현 (다국어 입력, 분류, 비밀글 등)
- 어드민 게시판 목록 개편 — 카드 리스트, 검색, 노출 토글, 페이지네이션
- 게시판 유형 3종(기본형·갤러리형·카드형) 추가

### 2026-09-01

- 페이지 관리 기능 구현 — 생성·수정·삭제, 발행 전환, 자동 버전 백업과 되돌리기, `/page/슬러그` 노출
- 환경설정 메뉴 추가 — 일반/SEO 탭, Open Graph 와 검색엔진 설정을 공개 사이트 head 에 반영
- 게시판 목록 신설 — 고정 분류를 없애고 게시판을 직접 추가·수정·삭제하도록 변경
- 게시판 환경설정 추가 — 유형별 메타 템플릿과 SEO 제공 페이지 선택
- 관리자 사이드바를 밝은 테마로 변경하고 하위 메뉴를 트리 구조로 정리
- 어드민 라이트/다크 모드 전환 기능 추가 (공개 사이트는 라이트 고정)
- 어드민 로그인 화면에 데모 계정 자동 입력 버튼 추가
- 사이트 콘텐츠 최대 폭을 1152px → 1440px 로 확대
- 개발 서버 실행 스크립트 추가 (`start.sh` / `start.bat`, `stop.sh` / `stop.bat`)
- 제품 소개 기능 구현 — 3차 카테고리, 검색·정렬, 4열 그리드, 제품 상세, 어드민 제품·카테고리 관리
- 초기 구축 — 모노레포 구성, 공개 사이트 5개 화면, 어드민 대시보드·게시판·문의, GitHub Pages 데모 모드

---

## 기술 스택

| 구분 | 스택 |
|------|------|
| 프론트엔드 | React 18, Vite 5, TypeScript, Tailwind CSS 3, React Router 6, Recharts |
| 백엔드 | Node.js, Express 4, TypeScript, Prisma 5, SQLite |
| 인증 | JWT (bcrypt 해싱) |
| 검증 | Zod |

> 참고: 백엔드는 Node.js(Express) 로 구성했습니다. React 는 프론트엔드 라이브러리라 서버로는 사용할 수 없습니다.

## 프로젝트 구조

```
.
├── apps/
│   ├── web/                    # 프론트엔드 (Vite + React + Tailwind)
│   │   └── src/
│   │       ├── components/     # 레이아웃 및 공통 UI
│   │       ├── lib/            # API 클라이언트, 인증 컨텍스트, 포맷 유틸
│   │       └── pages/
│   │           ├── site/       # 공개 회사소개 페이지
│   │           └── admin/      # 관리자 대시보드
│   └── api/                    # 백엔드 (Express + Prisma)
│       ├── prisma/             # 스키마 및 시드 스크립트
│       └── src/
│           ├── lib/            # 인증 미들웨어, 에러 처리, DB 클라이언트
│           └── routes/         # auth / posts / contacts / dashboard
└── packages/
    └── shared/                 # 프론트·백엔드 공용 타입
```

## 시작하기

### 간편 실행 (권장)

터미널에서 아래 한 줄이면 준비 작업부터 서버 실행까지 자동으로 처리됩니다.

```bash
./start.sh          # macOS / Linux
```

Windows 에서는 탐색기에서 `start.bat` 을 더블클릭하거나, 터미널에서:

```cmd
start.bat
```

최초 실행 시 의존성 설치 → `.env` 생성(JWT_SECRET 자동 발급) → DB 생성·샘플 데이터
주입까지 자동으로 수행합니다. 두 번째 실행부터는 바로 서버가 뜹니다.

서버를 종료하려면 실행한 터미널에서 `Ctrl + C` 를 누르세요.
창이 강제로 닫혀 서버가 남아 있다면 `./stop.sh` (Windows: `stop.bat`) 로 정리할 수 있습니다.

> 코드를 수정하면 자동으로 반영됩니다. 프론트엔드는 새로고침 없이 화면이 갱신되고(HMR),
> 백엔드는 파일 저장 시 서버가 자동 재시작됩니다.

### 수동 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수 설정
cp apps/api/.env.example apps/api/.env
# JWT_SECRET 을 충분히 긴 임의 문자열로 변경하세요.

# 3. DB 생성 및 샘플 데이터 주입
npm run db:push
npm run db:seed

# 4. 개발 서버 실행 (프론트 + 백엔드 동시)
npm run dev
```

- 홈페이지: http://localhost:5173
- 관리자: http://localhost:5173/admin
- API: http://localhost:4000

### 테스트 계정

| 이메일 | 비밀번호 | 권한 |
|--------|----------|------|
| admin@wnc.co.kr | admin1234 | 최고관리자 |
| editor@wnc.co.kr | admin1234 | 편집자 |

## 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 프론트 + 백엔드 동시 실행 |
| `npm run dev:web` | 프론트엔드만 실행 |
| `npm run dev:api` | 백엔드만 실행 |
| `npm run build` | 전체 프로덕션 빌드 |
| `npm run db:push` | Prisma 스키마를 DB에 반영 |
| `npm run db:seed` | 샘플 데이터 주입 |

## 화면 구성

### 공개 사이트
- `/` 메인 — 히어로, 통계, 서비스 소개, 최근 소식, CTA
- `/about` 회사소개 — 개요, 핵심 가치, 연혁
- `/services` 사업분야 — 서비스 4종, 진행 프로세스
- `/products` 제품 소개 — 3차 카테고리 트리, 검색, 정렬, 썸네일 4열 그리드
- `/products/:id` 제품 상세 — 좌측 이미지 / 우측 정보·사양·문의 CTA, 하단 상세 내용
- `/board` 소식 — 분류 탭, 검색, 페이지네이션
- `/board/:id` 상세 — 조회수 자동 증가
- `/contact` 문의하기 — 문의 폼 (DB 저장)

### 관리자 대시보드
- `/admin` 대시보드 — 통계 카드 4종, 14일 등록 추이 차트, 문의 처리 현황, 최근 활동
- `/admin/posts` 게시판 관리 — 목록, 분류 필터, 검색, 삭제
- `/admin/posts/new`, `/admin/posts/:id` — 작성 및 수정 (공개/비공개 전환)
- `/admin/products` 제품 관리 — 목록, 카테고리 필터, 검색, 삭제
- `/admin/products/new`, `/admin/products/:id` — 등록·수정 (썸네일 업로드/URL, 사양 표, TipTap 편집기)
- `/admin/categories` 제품 카테고리 — 3차까지 트리 구성, 추가·수정·삭제
- `/admin/contacts` 문의 관리 — 목록, 상태 필터, 상세 드로어(상태 변경·내부 메모)

## API 엔드포인트

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/auth/login` | - | 로그인 |
| GET | `/api/auth/me` | 필요 | 토큰 검증 및 사용자 정보 |
| GET | `/api/posts` | - | 게시글 목록 (페이징·분류·검색) |
| GET | `/api/posts/:id` | - | 게시글 상세 |
| POST | `/api/posts` | 필요 | 게시글 작성 |
| PUT | `/api/posts/:id` | 필요 | 게시글 수정 |
| DELETE | `/api/posts/:id` | 필요 | 게시글 삭제 |
| POST | `/api/contacts` | - | 문의 접수 |
| GET | `/api/contacts` | 필요 | 문의 목록 |
| PATCH | `/api/contacts/:id` | 필요 | 상태·메모 수정 |
| DELETE | `/api/contacts/:id` | 필요 | 문의 삭제 |
| GET | `/api/dashboard/stats` | 필요 | 대시보드 통계 |
| GET | `/api/categories` | - | 카테고리 트리 (3차) |
| POST | `/api/categories` | 필요 | 카테고리 추가 |
| PUT | `/api/categories/:id` | 필요 | 카테고리 수정 |
| DELETE | `/api/categories/:id` | 필요 | 카테고리 삭제 |
| GET | `/api/products` | - | 제품 목록 (카테고리·검색·정렬) |
| GET | `/api/products/:id` | - | 제품 상세 |
| POST | `/api/products` | 필요 | 제품 등록 |
| PUT | `/api/products/:id` | 필요 | 제품 수정 |
| DELETE | `/api/products/:id` | 필요 | 제품 삭제 |
| POST | `/api/uploads` | 필요 | 이미지 업로드 (최대 5MB) |

비공개(임시저장) 게시글·제품은 공개 목록·상세에서 제외되며, 관리자 목록에서만 `includeDrafts=1` 로 조회됩니다.

### 제품 카테고리 규칙

- 대분류(1차) → 중분류(2차) → 소분류(3차) 까지만 생성할 수 있습니다.
- 3차 카테고리는 하위를 가질 수 없어 상위 선택 목록에 나타나지 않습니다.
- 하위 카테고리나 제품이 남아 있는 카테고리는 삭제되지 않습니다.
- 상위 카테고리를 선택하면 그 아래 모든 하위 제품이 함께 조회됩니다.

### 상세 내용 편집기

TipTap 기반 WYSIWYG 편집기로 제목·목록·인용·링크·이미지를 사용할 수 있습니다.
편집기 번들(약 400KB)은 제품 등록/수정 화면에서만 지연 로딩되어 공개 페이지 속도에 영향을 주지 않습니다.
저장된 HTML 은 표시 직전 [RichText.tsx](apps/web/src/components/RichText.tsx) 에서 허용 태그만 남기고
정리되므로 `script`·`iframe`·`onerror`·`javascript:` 등은 렌더링되지 않습니다.

## GitHub Pages 배포 (데모 모드)

`main` 브랜치에 푸시하면 GitHub Actions 가 자동으로 빌드·배포합니다.
→ https://lebass98.github.io/wnc_home_01/

### 최초 1회 설정

저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 변경하세요.
(기본값인 "Deploy from a branch" 상태에서는 워크플로우가 실패합니다.)

### 데모 모드란?

GitHub Pages 는 정적 파일만 호스팅하므로 Express 서버와 SQLite DB 를 실행할 수 없습니다.
그래서 배포 빌드에서는 `VITE_DEMO=true` 로 **데모 모드**를 활성화합니다.

- API 호출이 브라우저 안의 목업 구현([demoApi.ts](apps/web/src/lib/demoApi.ts))으로 대체됩니다.
- 데이터는 `localStorage` 에 저장되어 새로고침해도 유지되지만, **기기·브라우저 간에는 공유되지 않습니다.**
- 상단에 데모 모드 배너가 표시되며 데이터 초기화 버튼을 제공합니다.
- 로그인은 `admin@wnc.co.kr` / `admin1234` 로만 가능합니다.

즉 Pages 배포본은 **UI 시연용**이며, 실제 서비스로 쓰려면 백엔드를 별도 호스팅(Render, Railway,
Fly.io 등)한 뒤 프론트에서 해당 API 주소를 바라보게 해야 합니다.

로컬에서 데모 모드를 확인하려면:

```bash
BASE_PATH=/wnc_home_01/ VITE_DEMO=true npm run build:web
npx serve apps/web/dist   # 또는 임의의 정적 서버
```

## 운영 배포 전 체크리스트

- [ ] `JWT_SECRET` 을 충분히 긴 임의 문자열로 교체
- [ ] 시드 계정 비밀번호 변경 또는 계정 삭제
- [ ] SQLite → PostgreSQL/MySQL 전환 (`apps/api/prisma/schema.prisma` 의 `provider` 및 `DATABASE_URL` 수정)
- [ ] `CORS_ORIGIN` 을 실제 도메인으로 지정
- [ ] 로그인 시도 횟수 제한(rate limit) 추가
- [ ] 업로드 파일을 로컬 디스크 대신 S3 등 외부 스토리지로 전환 (`apps/api/uploads/`)
- [ ] 회사 정보(주소·연락처·연혁 등) 실제 내용으로 교체
