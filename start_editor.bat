start chrome.exe --profile-directory="Default" --app="data:text/html,<html><body><script>window.moveTo(0,0);window.resizeTo(2000,2000);window.location='http://localhost:9000';</script></body></html>"
@echo off

cd /d "%~dp0"

node editor.js
timeout /t 10