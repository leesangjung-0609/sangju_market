@echo off
:: 1. 프로젝트 폴더로 이동 (C드라이브가 아닐 경우를 대비해 /d 옵션 사용)
cd /d "C:\Users\남태민\myapp"

:: 2. 새 창을 띄워서 node server.js 실행
start "My Node Server" cmd /k "node server.js"

:: 3. 또 다른 새 창을 띄워서 ngrok 실행
start "Ngrok Tunnel" cmd /k "ngrok http 3000"