@echo off
echo ===================================================
echo APE Extension Setup Script
echo ===================================================

echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo npm is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

echo Node.js version:
node --version
echo npm version:
npm --version

echo.
echo Installing dependencies with legacy-peer-deps option...
echo This may take a few minutes...
call npm install --legacy-peer-deps
if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies.
    echo Please check your internet connection and try again.
    exit /b 1
)

echo.
echo Building the extension...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Failed to build the extension.
    echo Please check for errors in the build output.
    exit /b 1
)

echo.
echo Running basic tests...
call npm run test:basic
if %ERRORLEVEL% neq 0 (
    echo Warning: Some basic tests failed.
    echo You can still use the extension, but it may have issues.
)

echo.
echo ===================================================
echo Setup completed successfully!
echo ===================================================
echo.
echo To run the extension in VS Code:
echo 1. Press F5 in VS Code to start debugging
echo 2. Or run 'code --install-extension ape-extension-*.vsix' to install
echo.
echo To run in live LLM mode for testing:
echo - Use 'npm run test:llm-self' or 'npm run test:llm-full'
echo.
echo Thank you for installing APE Extension!