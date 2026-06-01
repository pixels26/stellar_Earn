#!/usr/bin/env bash
set -e

# Check if rustup is installed
if ! command -v rustup &> /dev/null; then
    echo "❌ rustup is not installed."
    echo "Follow instructions at https://rustup.rs/ to install Rust."
    exit 1
fi

# Check if a default toolchain is set
DEFAULT_TOOLCHAIN=$(rustup show active-toolchain 2>/dev/null | cut -d' ' -f1)
if [[ -z "$DEFAULT_TOOLCHAIN" ]]; then
    echo "❌ No default Rust toolchain found."
    echo "Setting up stable toolchain as default..."
    rustup default stable
    if [[ $? -ne 0 ]]; then
        echo "⚠️ Failed to set default toolchain. Please check your rustup installation."
        exit 1
    fi
    echo "✅ Rust stable toolchain set as default."
else
    echo "✅ Rust default toolchain found: $DEFAULT_TOOLCHAIN"
fi

# Proceed with the rest of your project setup
echo "▶️ Continuing with project setup..."
# e.g., cargo build, cargo test, etc.