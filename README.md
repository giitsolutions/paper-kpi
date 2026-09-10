# Paper Industry KPI Benchmarking Tool

A self-assessment website for paper mills. Users enter their name/email,
choose their raw-material base and product type, fill in their KPI numbers,
and get a dashboard showing how each category benchmarks against
Below Average / Average / Good / Best-in-Class industry standards.

## Project structure

```
paper-kpi-website/
├── frontend/                 # everything the browser loads
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── data.js           # the 26 KPI definitions and benchmark bands
│       ├── scoring.js        # converts a raw value into a 0-100 score
│       └── app.js            # page navigation, rendering, dashboard charts
│
└── backend/                  # optional Node/Express server
    ├── server.js             # serves the frontend + saves submissions
    ├── package.json
    └── data/
        └── submissions.json  # auto-created; every completed assessment is appended here
```

## Option A — run it with the backend (recommended)

This serves the website **and** saves every completed assessment to
`backend/data/submissions.json`, so you (or your professor) can see who
has taken the assessment and what they scored.

```bash
cd backend
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

## Option B — frontend only, no backend

If you just want to demo the tool without saving data anywhere, you can
open `frontend/index.html` directly in a browser (double-click it, or use
a tool like VS Code's "Live Server" extension). Everything — the form,
the scoring, the dashboard — works fully in the browser. The only thing
that won't happen is saving the result to `submissions.json`, since
there's no server to send it to.

## How the scoring works

Each KPI has three benchmark edges taken from the industry data (Best,
Good, Average). A submitted value is linearly interpolated into a 0-100
score:

- 0–25  → Below Average
- 25–50 → Average
- 50–75 → Good
- 75–100 → Best

A category's score is the average of its answered KPIs, and the overall
score is the average of all answered category scores.

## Customizing

- **KPI benchmarks / bands**: edit `frontend/js/data.js`
- **Scoring formula**: edit `frontend/js/scoring.js`
- **Colors, fonts, layout**: edit `frontend/css/style.css`
- **Page flow / dashboard content**: edit `frontend/js/app.js`


## Percentile distribution calculation

The dashboard now uses a normal-distribution-style visual driven by two explicit benchmark percentile anchors:

- Average benchmark = 50th percentile
- Best-in-Class benchmark = 90th percentile
- The user's raw KPI value is linearly interpolated between the Average and Best raw benchmark edges.
- Values worse than Average are mapped below the 50th percentile; values better than Best are capped at the 100th percentile.
- Lower-is-better KPIs reverse the raw-value direction before positioning.
- The curve marker is placed using the calculated percentile, so it is not a decorative/fixed star.

Important: the supplied workbook provides benchmark bands but does not provide the underlying peer-mill observations needed to calculate a statistically fitted industry percentile. Therefore the dashboard labels this as a **benchmark-position percentile**, not a true statistical percentile.
