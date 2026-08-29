# ReadyMapper — 2026 Nepal Floods (AIDMI)

A static [GitHub Pages](https://aidmi-datahub.github.io/readymapper-aidmi/) deployment of
**ReadyMapper** (CrisisReady) showing the August 2026 Rasuwa & Nuwakot flood: satellite
building/bridge/road damage, flood extent, mobility, and a **News Sources** layer of
news-derived, source-attributed facts.

**Live:** https://aidmi-datahub.github.io/readymapper-aidmi/#/disaster?disasterId=2026-nepal-floods

## How it's hosted
No CI. The pre-built site + all data are committed in **`docs/`**, and GitHub Pages serves
that folder directly (Settings → Pages → *Deploy from a branch* → `main` / `docs`). All data
is bundled — nothing is fetched from S3.

- `docs/` — the built site, `config.json`, and `docs/data/` (Nepal disaster data + COD admin boundaries).
- `proto-app/` — the Vue/Vite source.

## Rebuild
```bash
cd proto-app
npm ci
npx vite build --base=/readymapper-aidmi/
cp -R dist/. ../docs/
# then restore docs/config.json (data base URL + Mapbox token) — see docs/config.json
```

## Note on the Mapbox token
The basemap token in `docs/config.json` is client-side and therefore public on any live map.
It should be **URL-restricted to `*.github.io`** in the Mapbox account (Account → Tokens).
