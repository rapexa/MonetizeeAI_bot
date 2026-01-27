#!/bin/bash

# Build script for MonetizeeAI Bot
# This script builds the Go application correctly

echo "Building MonetizeeAI Bot..."

# Clean previous build
rm -f bot MonetizeeAI_bot

# Build the application (build all .go files in current directory)
go build -o bot .

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Binary created: ./bot"
    chmod +x bot
else
    echo "❌ Build failed!"
    exit 1
fi
