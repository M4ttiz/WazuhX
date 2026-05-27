#!/usr/bin/env bash
# Run these commands inside your WazuhX repo to push everything

cd /path/to/WazuhX   # <-- change this

# Stage all new and modified files
git add README.md CHANGELOG.md ROADMAP.md CONTRIBUTING.md SECURITY.md
git add CODE_OF_CONDUCT.md .gitignore docker-compose.yml
git add .github/ docs/ assets/ scripts/

# Remove the files that should NOT be public
git rm -r --cached cursorules/ 2>/dev/null || true
git rm --cached prompt3.md 2>/dev/null || true
git rm -r --cached prompts/ 2>/dev/null || true

git commit -m "chore: professional GitHub setup

- Rewrote README with badges, architecture diagram, full feature table
- Added .github/workflows/ci.yml (GitHub Actions CI)
- Added .github/ISSUE_TEMPLATE/ (bug report + feature request)
- Added .github/PULL_REQUEST_TEMPLATE.md
- Added CODE_OF_CONDUCT.md
- Improved CHANGELOG, ROADMAP, CONTRIBUTING, SECURITY
- Fixed docker-compose.yml Dockerfile.frontend path (was pointing to cursorules/)
- Updated .gitignore to exclude cursorules/, prompts/, prompt*.md
- Removed cursorules/ and prompts/ from tracking (internal dev prompts)
- Added scripts/setup.sh interactive setup script"

git push origin main
