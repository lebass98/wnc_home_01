#!/usr/bin/env bash
# macOS 가 남기는 ._ / .DS_Store 잔여 파일을 정리한다.
# 작업 완료 시 자동 실행되며, 직접 실행해도 된다.
cd "$(dirname "$0")"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'

# node_modules 와 .git 내부는 건드리지 않는다.
COUNT=$(find . \
  -path ./node_modules -prune -o \
  -path ./.git -prune -o \
  \( -name '._*' -o -name '.DS_Store' \) -print 2>/dev/null | wc -l | tr -d ' ')

if [ "$COUNT" = "0" ]; then
  printf "${CYAN}[정보]${NC} 정리할 잔여 파일이 없습니다.\n"
  exit 0
fi

find . \
  -path ./node_modules -prune -o \
  -path ./.git -prune -o \
  \( -name '._*' -o -name '.DS_Store' \) -print -delete 2>/dev/null

printf "${GREEN}[완료]${NC} 잔여 파일 %s개를 삭제했습니다.\n" "$COUNT"
