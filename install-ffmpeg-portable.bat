@echo off
echo Downloading ffmpeg portable...
echo.

powershell -Command "& {Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile 'ffmpeg.zip'}"

echo Extracting ffmpeg...
powershell -Command "& {Expand-Archive -Path 'ffmpeg.zip' -DestinationPath '.' -Force}"

echo Setting up ffmpeg...
for /d %%i in (ffmpeg-*) do (
    move "%%i" "ffmpeg"
)

del ffmpeg.zip

echo.
echo ffmpeg installed successfully in ./ffmpeg/ folder!
echo.
pause