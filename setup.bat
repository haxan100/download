@echo off
echo ========================================
echo   INSTALLING ALL DEPENDENCIES
echo ========================================
echo.

echo 1. Installing yt-dlp...
pip install yt-dlp
echo.

echo 2. Installing Node.js dependencies...
npm install
echo.

echo 3. Downloading and installing ffmpeg portable...
echo This may take a few minutes...
powershell -Command "& {try { Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile 'ffmpeg.zip' } catch { Write-Host 'Download failed, trying alternative...' }}"

if exist ffmpeg.zip (
    powershell -Command "& {Expand-Archive -Path 'ffmpeg.zip' -DestinationPath '.' -Force}"
    for /d %%i in (ffmpeg-*) do (
        move "%%i" "ffmpeg"
    )
    del ffmpeg.zip
    echo ffmpeg installed to ./ffmpeg/ folder
) else (
    echo Please run: install-ffmpeg-portable.bat
)

echo.
echo ========================================
echo   INSTALLATION COMPLETE!
echo ========================================
echo.
echo To start the server: node server.js
echo Then open: http://localhost:3001/download-link.html
echo.
pause