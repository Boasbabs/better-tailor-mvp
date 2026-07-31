# better tailor — MVP prototype

A mobile-first, high-fidelity throwaway prototype to validate demand among tailors
for a customer/measurement/order/invoice app. No backend — localStorage + seeded
Nigerian demo data. See [mvp-plan.md](./mvp-plan.md) for the full plan, demo
script, and validation funnel.

## Stack

React + Vite + Tailwind CSS v4, zustand (persisted to `localStorage`),
react-router (HashRouter), html2canvas-pro for invoice PNG export.
GoatCounter for analytics (events: `opened`, `engaged`, `waitlist-click`).

## Run

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)

```bash
npm run deploy
```

Builds and pushes `dist/` to the `gh-pages` branch.
