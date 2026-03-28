#!/bin/bash

# Move into the directory where this script is located
cd "$(dirname "$0")"

# Configure typical paths for macOS (where node/nvm/brew is likely installed)
export PATH="$HOME/.nvm/versions/node/v24.13.1/bin:$HOME/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Ensure dependencies are installed
if [ ! -d "node_modules/xlsx" ]; then
    echo "Installing required library (xlsx)..."
    npm install xlsx --silent
fi

# Run the Node script
node publish_quizzes.js

echo ""
read -p "Press [Enter] to close..."
