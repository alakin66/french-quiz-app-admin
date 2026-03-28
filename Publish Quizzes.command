#!/bin/bash

# Move into the directory where this script is located
cd "$(dirname "$0")"

# Configure typical paths for macOS (where uv/brew is likely installed)
export PATH="$HOME/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# Run the python script using uv
uv run publish_quizzes.py

echo ""
read -p "Press [Enter] to close..."
