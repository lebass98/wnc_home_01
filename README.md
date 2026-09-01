# 워드앤코드 홈페이지 템플릿

회사소개 홈페이지 + 관리자 대시보드(게시판·문의 관리) 모노레포 템플릿입니다.

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
