#!/bin/bash

# Axiom Extension build and install script
# Works on both Windows (with Git Bash or WSL) and Linux

echo "Starting Axiom build process..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the package
echo "Building package..."
npm run build

# Create VSIX package
echo "Creating VSIX package..."
npx vsce package

# Find the generated VSIX file
VSIX_FILE=$(find . -maxdepth 1 -name "*.vsix" | sort -V | tail -n 1)

if [ -z "$VSIX_FILE" ]; then
    echo "Error: No VSIX file found."
    exit 1
fi

# Install the extension
echo "Installing extension: $VSIX_FILE"
code --install-extension "$VSIX_FILE"

echo "======================================"
echo "Build and installation complete!"
echo "Please reload VS Code to activate the extension."
echo "======================================"