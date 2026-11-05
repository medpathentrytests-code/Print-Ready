# Screenshots

All images in this folder are **real captures of the running application**, taken with
headless Chromium (Playwright) driving the live dev server and demo account — not
mockups or AI-generated UI. They're safe to use on the landing page, in the sales
listing, or in investor/acquirer materials.

| File | Shows |
|---|---|
| `01-landing-hero.png` | Marketing site hero section (desktop) |
| `02-landing-features.png` | Marketing site features/checks section |
| `03-login.png` | Login screen |
| `04-dashboard-overview.png` | Project dashboard — usage bar, projects grid, demo-mode banner |
| `05-new-inspection.png` | New inspection flow — upload dropzone, spec selector, bleed/margin config |
| `06-results-dashboard.png` | Full inspection results — score ring, critical/warning counts, page previews, detected issues with severity/explanation/fix |
| `07-admin-dashboard.png` | Admin dashboard — users, inspections, processing failures, storage, daily-volume chart, subscription config |
| `08-mobile-landing.png` | Marketing site hero on a 390×844 mobile viewport |
| `og-preview.png` | Auto-generated social/Open Graph share card (`src/app/opengraph-image.tsx`), rendered on every page share |

## Regenerating

These were produced with a throwaway driver script (not part of the repo) using:

```bash
npx playwright install chromium
sudo npx playwright install-deps chromium   # system shared libs (apt)
cd /tmp/shots && npm install playwright
node screenshot.js
```

The script logs in as the seeded demo account (`demo@printready.demo` /
`PrintReadyDemo!2026`), navigates the real app, and calls
`page.screenshot({ path: ... })`. The admin shots use `admin@printready.demo` /
`PrintReadyAdmin!2026`. See `README.md` for the full demo credential list.
