#!/usr/bin/env bash
# 개발 서버 강제 종료 (start.sh 가 제대로 닫히지 않았을 때 사용)
cd "$(dirname "$0")"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
found=0

for PORT in 4000 5173; do
  PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    printf "${CYAN}[정보]${NC} 포트 %s 프로세스를 종료합니다.\n" "$PORT"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    found=1
  fi
done

# 포트를 잡고 있던 자식만 죽으면 감시(watch) 프로세스가 남는다.
# 경로에 한글이 있어 문자열 비교는 유니코드 표기 차이로 어긋나므로,
# 명령줄의 영문 부분(프로젝트 폴더 이름 + 실행 파일)으로 찾아 정리한다.
PROJ="wnc_home_01/wnc_home_01/node_modules/.bin"
for PAT in "$PROJ/tsx watch src/server.ts" "$PROJ/vite"; do
  PIDS=$(pgrep -f "$PAT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    printf "${CYAN}[정보]${NC} 남아 있는 감시 프로세스를 정리합니다.\n"
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    found=1
  fi
done

if [ "$found" = "1" ]; then
  printf "${GREEN}[완료]${NC} 개발 서버를 종료했습니다.\n"
else
  printf "${CYAN}[정보]${NC} 실행 중인 개발 서버가 없습니다.\n"
fi
