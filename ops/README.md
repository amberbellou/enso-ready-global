# Ops

`deploy.yml.pending` is the GitHub Actions workflow (monthly ENSO status refresh + build + Pages deploy).
It could not be pushed because the local `gh` token lacks the `workflow` scope. To enable it once:

```bash
gh auth refresh -h github.com -s workflow
git mv ops/deploy.yml.pending .github/workflows/deploy.yml
git commit -m "ci: enable monthly refresh and Pages deploy" && git push
gh api -X PUT repos/amberbellou/enso-ready-global/pages -f build_type=workflow
```

Until then the site is deployed from the `gh-pages` branch with `bash ops/deploy-branch.sh`.
