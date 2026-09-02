#!/usr/bin/env bash
# 워드앤코드 개발 서버 실행 (macOS / Linux)
# 프론트엔드(5173) + 백엔드(4000) 를 함께 띄우고, 최초 실행 시 준비 작업을 자동 처리한다.

set -u
cd "$(dirname "$0")"

GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { printf "${CYAN}[정보]${NC} %s\n" "$1"; }
ok()    { printf "${GREEN}[완료]${NC} %s\n" "$1"; }
warn()  { printf "${YELLOW}[주의]${NC} %s\n" "$1"; }
fail()  { printf "${RED}[오류]${NC} %s\n" "$1"; }

echo ""
echo "============================================"
echo "  워드앤코드 홈페이지 개발 서버"
echo "============================================"
echo ""

# 1) Node.js 확인
if ! command -v node > /dev/null 2>&1; then
  fail "Node.js 가 설치되어 있지 않습니다."
  echo "     https://nodejs.org 에서 20 이상 버전을 설치한 뒤 다시 실행하세요."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
info "Node.js $(node -v) 확인됨"
if [ "$NODE_MAJOR" -lt 20 ]; then
  warn "Node.js 20 이상을 권장합니다. 현재 $(node -v)"
fi

# 2) 의존성 설치
if [ ! -d "node_modules" ]; then
  info "의존성을 설치합니다. 처음 한 번만 수행되며 몇 분 걸릴 수 있습니다..."
  if ! npm install; then
    fail "의존성 설치에 실패했습니다."
    exit 1
  fi
  ok "의존성 설치 완료"
else
  info "의존성 확인됨"
fi

# 3) 환경변수 파일
if [ ! -f "apps/api/.env" ]; then
  info ".env 파일이 없어 새로 만듭니다."
  cp apps/api/.env.example apps/api/.env
  # 예시 값 그대로 두면 위험하므로 임의 시크릿을 생성해 넣는다.
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  node -e "
    const fs=require('fs');
    const p='apps/api/.env';
    fs.writeFileSync(p, fs.readFileSync(p,'utf8').replace(/^JWT_SECRET=.*$/m, 'JWT_SECRET=\"${SECRET}\"'));
  "
  ok ".env 생성 및 JWT_SECRET 자동 발급 완료"
else
  info "환경설정 확인됨"
fi

# 4) 데이터베이스
if [ ! -f "apps/api/prisma/dev.db" ]; then
  info "데이터베이스를 생성하고 샘플 데이터를 넣습니다..."
  npm run db:push  --silent || { fail "DB 생성에 실패했습니다."; exit 1; }
  npm run db:seed  --silent || { fail "샘플 데이터 주입에 실패했습니다."; exit 1; }
  ok "데이터베이스 준비 완료"
else
  # 스키마가 바뀌었을 수 있으므로 항상 동기화한다 (기존 데이터는 유지).
  npm run db:push --silent > /dev/null 2>&1
  # 새 표가 추가됐다면 비어 있으므로 기본 데이터를 채운다.
  # 시드는 표마다 '비어 있을 때만' 넣으므로 기존 데이터는 건드리지 않는다.
  npm run db:seed --silent > /dev/null 2>&1
  info "데이터베이스 확인됨"
fi

# 5) 포트 정리 — 이전에 남아 있던 서버가 있으면 종료한다.
for PORT in 4000 5173; do
  PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    warn "포트 $PORT 를 사용 중인 프로세스를 종료합니다."
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
  fi
done

# 6) 서버 실행
echo ""
echo "--------------------------------------------"
echo "  홈페이지    http://localhost:5173"
echo "  관리자      http://localhost:5173/admin"
echo "  API         http://localhost:4000"
echo ""
echo "  관리자 계정  admin@wnc.co.kr / admin1234"
echo ""
echo "  종료하려면 Ctrl + C 를 누르세요."
echo "--------------------------------------------"
echo ""

# 종료 처리.
# npm 이 손자 프로세스(tsx, vite)를 낳으므로, 포트를 점유한 프로세스를
# 직접 찾아 종료하는 방식이 가장 확실하다.
cleaned=0
cleanup() {
  [ "$cleaned" = "1" ] && return 0
  cleaned=1
  echo ""
  info "서버를 종료합니다..."
  # 이 스크립트가 띄운 npm 자식들을 먼저 정리한다.
  pkill -P $$ 2>/dev/null || true
  for PORT in 4000 5173; do
    PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
    [ -n "$PIDS" ] && echo "$PIDS" | xargs kill -9 2>/dev/null || true
  done
  ok "종료되었습니다."
}

# INT/TERM 은 물론, 어떤 경로로 스크립트가 끝나든 EXIT 에서 반드시 정리한다.
trap 'cleanup; exit 0' INT TERM
trap cleanup EXIT

npm run dev:api &
API_PID=$!
npm run dev:web &
WEB_PID=$!

# 두 서버 중 하나라도 멈추면 전체를 정리한다.
wait $API_PID $WEB_PID
