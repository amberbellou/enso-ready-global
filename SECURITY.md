# Security policy

ENSO Ready Global is a static site: no accounts, no server-side code, no databases with user data. Location and settings stay in the user's browser.

**Report a vulnerability** through GitHub's private advisory form: https://github.com/amberbellou/enso-ready-global/security/advisories/new. Please do not open a public issue for security problems.

**What we check in CI:** dependency audit (`pip-audit` for the data pipeline; the site has no runtime JavaScript dependencies), a third-party host check that fails the build if any page loads scripts, styles or fonts from a host other than the site itself, the editorial lint, and the source link check.

**Third parties the app contacts, and why:** the site's own second Pages domain (place index); Open-Meteo (seasonal forecast, when a briefing opens); OpenStreetMap tiles (only when the user taps the map). No analytics, no fonts, no CDNs.
