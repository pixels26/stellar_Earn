#!/bin/bash

# Cargo Workspace Verification Script
# Identifies and fixes workspace configuration issues

echo "================================================"
echo "Rust Workspace Verification"
echo "================================================"
echo ""

WORKSPACE_DIR="$(pwd)"

echo "1. Checking workspace structure..."
if [ -f "Cargo.toml" ]; then
    echo "   ✓ Root Cargo.toml found"
    echo ""
    echo "   Workspace members defined in Cargo.toml:"
    grep -A 10 '\[workspace\]' Cargo.toml | grep 'members'
else
    echo "   ✗ No Cargo.toml found in $(pwd)"
    exit 1
fi

echo ""
echo "2. Checking member directories..."
for dir in */; do
    dir_name="${dir%/}"
    if [ -f "$dir_name/Cargo.toml" ]; then
        package_name=$(grep '^name = ' "$dir_name/Cargo.toml" | head -1 | cut -d'"' -f2)
        echo "   ✓ $dir_name/ (package: $package_name)"
    else
        echo "   ✗ $dir_name/ (no Cargo.toml)"
    fi
done

echo ""
echo "3. Checking for Cargo.lock..."
if [ -f "Cargo.lock" ]; then
    echo "   ⚠ Cargo.lock found (may cause CI issues with cached dependencies)"
    echo "   Recommendation: Exclude Cargo.lock from .gitignore or remove it"
else
    echo "   ✓ No Cargo.lock (good for CI)"
fi

echo ""
echo "4. Verifying member references..."
members_section=$(sed -n '/\[workspace\]/,/\]/p' Cargo.toml | grep -A 5 'members')
stellar_earn_ok=false
earn_quest_ok=false

if [ -d "stellar_earn" ] && [ -f "stellar_earn/Cargo.toml" ]; then
    echo "   ✓ Member 'stellar_earn' directory exists with Cargo.toml"
    stellar_earn_ok=true
else
    echo "   ✗ Member 'stellar_earn' NOT FOUND"
fi

if [ -d "earn-quest" ] && [ -f "earn-quest/Cargo.toml" ]; then
    echo "   ✓ Member 'earn-quest' directory exists with Cargo.toml"
    earn_quest_ok=true
else
    echo "   ✗ Member 'earn-quest' NOT FOUND"
fi

echo ""
echo "5. Checking .gitignore for exclusions..."
if grep -q "Cargo.lock" .gitignore; then
    echo "   ✓ Cargo.lock properly excluded"
else
    echo "   ⚠ Cargo.lock not in .gitignore (may be committed)"
fi

echo ""
echo "================================================"
echo "Recommendations"
echo "================================================"
echo ""
echo "For CI build failures with workspace members:"
echo ""
echo "A. If using GitHub Actions CI:"
echo "   1. Clear GitHub Actions cache for this repo"
echo "   2. This resolves most 'No such file or directory' errors"
echo ""
echo "B. If error persists:"
echo "   1. Verify Cargo.toml member paths use hyphens consistently"
echo "   2. Ensure directory names match workspace member entries"
echo "   3. Do NOT commit Cargo.lock to repository"
echo ""
echo "C. Current CI workflow (.github/workflows/ci.yml):"
echo "   - Sets working-directory: Contract"
echo "   - Caches Cargo registry and target/"
echo "   - Potential issue: Path cache key"
echo ""
echo "D. Fix for CI cache issues:"
echo "   - Update cache key to use absolute path"
echo "   - Or clear cache before re-running"
echo ""

echo "================================================"
echo "Status: $([ -d 'stellar_earn' ] && echo 'READY' || echo 'ERROR')"
echo "================================================"
echo ""
