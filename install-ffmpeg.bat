@echo off
echo Installing ffmpeg...
echo.
echo Downloading ffmpeg from GitHub...
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'ffmpeg.zip'}"

echo Extracting ffmpeg...
powershell -Command "& {Expand-Archive -Path 'ffmpeg.zip' -DestinationPath '.' -Force}"

echo Moving ffmpeg to system folder...
for /d %%i in (ffmpeg-master-*) do (
    move "%%i\bin\ffmpeg.exe" "%WINDIR%\System32\"
    move "%%i\bin\ffprobe.exe" "%WINDIR%\System32\"
    rmdir /s /q "%%i"
)

del ffmpeg.zip

echo.
echo ffmpeg installed successfully!
echo You can now run the server with: node server.js
pause