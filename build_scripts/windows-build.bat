@echo off
echo Starting Axiom build process in Windows environment...

:: Get current directory
set CURRENT_DIR=%cd%
echo Current directory: %CURRENT_DIR%

:: Check if we're in a WSL path
echo %CURRENT_DIR% | findstr /C:"\\wsl.localhost" >nul
if %errorlevel% equ 0 (
  echo WSL path detected. Please use wsl-build.bat instead or navigate to a Windows path.
  echo Alternatively, map the WSL path to a Windows drive letter.
  exit /b 1
)

:: Install dependencies
echo Installing dependencies...
call npm install

:: Build the package
echo Building package...
call npm run build

:: Create VSIX package
echo Creating VSIX package...
call npx vsce package

:: Find the generated VSIX file
for /f "delims=" %%a in ('dir /b *.vsix') do set VSIX_FILE=%%a

if "%VSIX_FILE%"=="" (
    echo Error: No VSIX file found.
    exit /b 1
)

:: Install the extension
echo Installing extension: %VSIX_FILE%
call code --install-extension %VSIX_FILE%

echo ======================================
echo Build and installation complete!
echo Please reload VS Code to activate the extension.
echo ======================================