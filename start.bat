@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ============================================
echo   워드앤코드 홈페이지 개발 서버
echo ============================================
echo.

REM 1) Node.js 확인
where node > nul 2>&1
if errorlevel 1 (
  echo [오류] Node.js 가 설치되어 있지 않습니다.
  echo        https://nodejs.org 에서 20 이상 버전을 설치한 뒤 다시 실행하세요.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [정보] Node.js !NODE_VER! 확인됨

REM 2) 의존성 설치
if not exist "node_modules" (
  echo [정보] 의존성을 설치합니다. 처음 한 번만 수행되며 몇 분 걸릴 수 있습니다...
  call npm install
  if errorlevel 1 (
    echo [오류] 의존성 설치에 실패했습니다.
    pause
    exit /b 1
  )
  echo [완료] 의존성 설치 완료
) else (
  echo [정보] 의존성 확인됨
)

REM 3) 환경변수 파일
if not exist "apps\api\.env" (
  echo [정보] .env 파일이 없어 새로 만듭니다.
  copy "apps\api\.env.example" "apps\api\.env" > nul
  REM 예시 값 그대로 두면 위험하므로 임의 시크릿을 생성해 넣는다.
  for /f "delims=" %%s in ('node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"') do set JWT=%%s
  node -e "const fs=require('fs');const p='apps/api/.env';fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/^JWT_SECRET=.*$/m,'JWT_SECRET=\"!JWT!\"'));"
  echo [완료] .env 생성 및 JWT_SECRET 자동 발급 완료
) else (
  echo [정보] 환경설정 확인됨
)

REM 4) 데이터베이스
if not exist "apps\api\prisma\dev.db" (
  echo [정보] 데이터베이스를 생성하고 샘플 데이터를 넣습니다...
  call npm run db:push --silent
  if errorlevel 1 (
    echo [오류] DB 생성에 실패했습니다.
    pause
    exit /b 1
  )
  call npm run db:seed --silent
  if errorlevel 1 (
    echo [오류] 샘플 데이터 주입에 실패했습니다.
    pause
    exit /b 1
  )
  echo [완료] 데이터베이스 준비 완료
) else (
  REM 스키마가 바뀌었을 수 있으므로 항상 동기화한다 (기존 데이터는 유지).
  call npm run db:push --silent > nul 2>&1
  echo [정보] 데이터베이스 확인됨
)

REM 5) 이전에 남아 있던 서버 정리
for %%p in (4000 5173) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p" ^| findstr "LISTENING"') do (
    echo [주의] 포트 %%p 를 사용 중인 프로세스를 종료합니다.
    taskkill /F /PID %%a > nul 2>&1
  )
)

REM 6) 서버 실행
echo.
echo --------------------------------------------
echo   홈페이지    http://localhost:5173
echo   관리자      http://localhost:5173/admin
echo   API         http://localhost:4000
echo.
echo   관리자 계정  admin@wnc.co.kr / admin1234
echo.
echo   종료하려면 이 창에서 Ctrl + C 를 누르거나
echo   창을 닫으세요.
echo --------------------------------------------
echo.

REM 백엔드는 별도 창에서, 프론트는 이 창에서 실행한다.
start "WNC API 서버" cmd /c "npm run dev:api"

REM API 가 뜰 시간을 잠깐 준다.
timeout /t 3 /nobreak > nul

REM 브라우저 자동 실행
start "" http://localhost:5173

call npm run dev:web

REM 프론트가 종료되면 API 창도 함께 정리한다.
echo.
echo [정보] 서버를 종료합니다...
for %%p in (4000 5173) do (
  for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a > nul 2>&1
  )
)
echo [완료] 종료되었습니다.
endlocal
