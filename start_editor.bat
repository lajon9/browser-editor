call npm install
start chrome.exe http://localhost:9000 
@echo off

cd /d "%~dp0"

node editor.js
timeout /t 10