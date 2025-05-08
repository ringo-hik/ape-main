#!/bin/bash

echo "==================================================="
echo "APE Extension Setup Script"
echo "==================================================="

# Check for Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check for npm
echo "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo "npm is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Display versions
echo "Node.js version:"
node --version
echo "npm version:"
npm --version

# Install dependencies
echo ""
echo "Installing dependencies with legacy-peer-deps option..."
echo "This may take a few minutes..."
npm install --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "Failed to install dependencies."
    echo "Please check your internet connection and try again."
    exit 1
fi

# Build the extension
echo ""
echo "Building the extension..."
npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build the extension."
    echo "Please check for errors in the build output."
    exit 1
fi

# Run basic tests
echo ""
echo "Running basic tests..."
npm run test:basic
if [ $? -ne 0 ]; then
    echo "Warning: Some basic tests failed."
    echo "You can still use the extension, but it may have issues."
fi

# Make webpack verbose for critical dependency warning
echo ""
echo "Running detailed webpack build for debugging..."
npm run webpack -- --stats-error-details
if [ $? -ne 0 ]; then
    echo "Warning: Detailed webpack build failed."
    echo "This is just for debugging purposes and won't affect the extension."
fi

# Success message
echo ""
echo "==================================================="
echo "Setup completed successfully!"
echo "==================================================="
echo ""
echo "To run the extension in VS Code:"
echo "1. Press F5 in VS Code to start debugging"
echo "2. Or run 'code --install-extension ape-extension-*.vsix' to install"
echo ""
echo "To run in live LLM mode for testing:"
echo "- Use 'npm run test:llm-self' or 'npm run test:llm-full'"
echo ""
echo "Thank you for installing APE Extension!"

# Make this script executable
chmod +x setup.sh