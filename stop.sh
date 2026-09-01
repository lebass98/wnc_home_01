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

if [ "$found" = "1" ]; then
  printf "${GREEN}[완료]${NC} 개발 서버를 종료했습니다.\n"
else
  printf "${CYAN}[정보]${NC} 실행 중인 개발 서버가 없습니다.\n"
fi
