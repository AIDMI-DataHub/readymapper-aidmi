# ReadyMapper — 2026 Nepal Floods (AIDMI)

A [GitHub Pages](https://aidmi-datahub.github.io/readymapper-aidmi/) deployment of
**ReadyMapper** (CrisisReady) for the August 2026 Rasuwa & Nuwakot flood: satellite
building/bridge/road damage, flood extent, mobility, and a **News Sources** layer of
news-derived, source-attributed facts.

**Live:** https://aidmi-datahub.github.io/readymapper-aidmi/#/disaster?disasterId=2026-nepal-floods

## Hosting
A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the app, bundles the
committed data, injects the Mapbox token from the `MAPBOX_TOKEN` repo secret, and deploys
to Pages. Actions is free/unlimited for public repos. All data is bundled — nothing is
fetched from S3.

- `proto-app/` — the Vue/Vite source.
- `data/` — bundled Nepal disaster data + COD admin boundaries (served at `/data`).

## Configuration
- **`MAPBOX_TOKEN`** (repo secret) — the basemap token, injected into `config.json` at
  deploy time so it is never committed. It is still visible client-side on the live map
  (unavoidable), so it should be **URL-restricted to `*.github.io`** in the Mapbox account.
- To change the event/data, update `data/` and `data/disasters.json`.

## Rebuild / redeploy
Push to `main`, or run the **Deploy to GitHub Pages** workflow manually (Actions tab).
