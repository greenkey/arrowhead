#!/bin/bash

# Save original file
cp .forgejo/workflows/ci-cd.yml .forgejo/workflows/ci-cd.yml.bak

# Replace Forgejo-specific syntax with GitHub Actions compatible syntax
sed -i '' 's/runs-on: codeberg-tiny/runs-on: ubuntu-latest/g' .forgejo/workflows/ci-cd.yml
sed -i '' 's/runs-on: codeberg-small/runs-on: ubuntu-latest/g' .forgejo/workflows/ci-cd.yml
sed -i '' 's/runs-on: codeberg-medium/runs-on: ubuntu-latest/g' .forgejo/workflows/ci-cd.yml
sed -i '' 's|uses: https://code.forgejo.org/actions/checkout@v4|uses: actions/checkout@v4|g' .forgejo/workflows/ci-cd.yml
sed -i '' 's|uses: https://code.forgejo.org/actions/setup-node@v4|uses: actions/setup-node@v4|g' .forgejo/workflows/ci-cd.yml
sed -i '' 's|uses: https://code.forgejo.org/actions/upload-artifact@v4|uses: actions/upload-artifact@v4|g' .forgejo/workflows/ci-cd.yml
sed -i '' 's/node-version: .24/node-version: '\''20'\''/g' .forgejo/workflows/ci-cd.yml
sed -i '' "s/startsWith(forgejo.ref/startsWith(github.ref/g" .forgejo/workflows/ci-cd.yml

# Run act (skip release job which needs actual Forgejo API)
act --workflows .forgejo/workflows/ci-cd.yml -j lint-and-typecheck -j unit-tests -j integration-tests -j build "$@"

# Restore original file
mv .forgejo/workflows/ci-cd.yml.bak .forgejo/workflows/ci-cd.yml