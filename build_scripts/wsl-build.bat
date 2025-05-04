@echo off
echo Starting Axiom WSL build process...

:: Get the current directory in WSL format
for /f "delims=" %%i in ('wsl pwd') do set WSL_PATH=%%i

:: Check that we have the correct WSL path
echo WSL path: %WSL_PATH%

:: Run the build process in WSL
echo Running build in WSL environment...
wsl cd "%WSL_PATH%" ^&^& ./build-install.sh

echo ======================================
echo WSL build and installation complete!
echo Please reload VS Code to activate the extension.
echo ======================================