@echo off
:: 한글 깨짐 방지를 위해 인코딩을 UTF-8로 변경
chcp 65001 > nul

:: 1. [핵심] 사용자 홈 폴더 변수(UserProfile)를 사용해 안전하게 이동
cd /d "%UserProfile%\myapp"

:: 2. 혹시 이동에 실패했거나 파일이 없는지 확인 (에러 진단용)
if not exist "server.js" (
    echo [ERROR] server.js 파일을 찾을 수 없습니다!
    echo 현재 위치: %CD%
    echo 폴더 경로가 맞는지 확인해주세요.
    pause
    exit
)

:: 3. 4초 뒤 ngrok 실행 예약
:: (중요: localhost 대신 127.0.0.1을 강제로 써서 연결 거부 오류 방지)
start "" cmd /c "timeout /t 1 >nul & start ngrok http 127.0.0.1:3000"

:: 4. 메인 서버 실행
echo Node 서버를 시작합니다...
node server.js

:: 5. 서버가 꺼지거나 에러가 나면 창을 바로 닫지 않음
pause
