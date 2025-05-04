@echo off
echo Starting Axiom build process...

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