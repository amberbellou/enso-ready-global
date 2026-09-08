# Incident log

## 2026-09-07 — API keys committed in file names
**What:** two files named `.envsk-ant-…` (created by mis-pasted terminal commands) were swept into commit 96ad212 by `git add -A` and pushed to the public repo; one name held the live key.
**Fix:** files deleted, history rewritten (filter-branch) and force-pushed, `.env*` ignored, key revoked and re-issued by the owner.
**Lesson:** never `git add -A` on this repo; stage explicit paths. Check `git status` for unexpected dotfiles before every commit. Keys go in `.env` via the documented terminal line only.
