@echo off
rem FM-1 ラボを手元で開く。この窓を閉じると止まります。
echo FM-1 ラボを起動しています... この黒い窓は開いたままにしてください（閉じると止まります）
start "" "http://localhost:8765/index.html"
python -m http.server 8765 -d "%~dp0."
pause
