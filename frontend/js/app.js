/* ---------------------------------------------------------
   APP STATE
--------------------------------------------------------- */
const state = {
  step: "home", // home | intro | setup | form | dashboard | kpiDetail
  name: "",
  email: "",
  material: "",
  product: "",
  woodSource: "domestic", // "domestic" | "imported" — which Wood/Pulp benchmark band applies
  values: {},
  openCat: "financial",
  detailCat: null, // which category id is open on the KPI-detail page
  page: "home", // home | about | methodology | results
};

const root = document.getElementById("app");

/* ---------------------------------------------------------
   BELL CURVE SVG — 4 zones + score marker
--------------------------------------------------------- */
function bellCurveSVG(percentile, big, kpi) {
  const has = percentile !== null && percentile !== undefined;
  const p = has ? clamp(percentile, 1, 99) : null;
  // Extra room below the axis for the "Your Percentile" callout (Option C).
  const h = big ? 200 : 176;
  // Wider viewBox so the curve keeps its natural bell shape (instead of
  // being stretched flat) once the chart card grows wide on large screens.
  const W = 460;
  const left = 16;
  const right = W - 16;
  const mid = (left + right) / 2;
  const baseline = h - 76;
  const peakY = 22;
  const amplitude = baseline - peakY;
  const sigma = (right - left) * 0.196;
  const gid = `pcg-${Math.random().toString(36).slice(2)}`;

  const xFor = (pct) => left + (pct / 100) * (right - left);
  const yOnCurve = (x) => baseline - amplitude * Math.exp(-((x - mid) ** 2) / (2 * sigma * sigma));

  const pts = [];
  for (let x = left; x <= right; x += (right - left) / 46) pts.push([x, yOnCurve(x)]);
  const linePath = "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");
  const areaPath = `${linePath} L${right},${baseline} L${left},${baseline} Z`;

  const avgX = xFor(AVG_PERCENTILE);
  const bestX = xFor(BEST_PERCENTILE);
  const avgY = yOnCurve(avgX);
  const bestY = yOnCurve(bestX);
  const valueX = has ? xFor(p) : null;
  const valueY = has ? yOnCurve(valueX) : null;

  // When a specific KPI is passed in (individual KPI charts), show that
  // KPI's actual Average/Best values from the Excel sheet instead of the
  // generic 50th/90th percentile numbers. Category-level charts (kpi is
  // null, e.g. the dashboard's per-category curves) still show the
  // percentile, since a category has no single unit to attach a value to.
  const avgNum = kpi ? kpi.avgEdge : AVG_PERCENTILE;
  const bestNum = kpi ? kpi.best : BEST_PERCENTILE;
  const avgLegend = kpi ? `${kpi.avgEdge} ${kpi.unit}` : `${AVG_PERCENTILE}th`;
  const bestLegend = kpi ? `${kpi.best} ${kpi.unit}` : `${BEST_PERCENTILE}th`;
  const avgSub = kpi ? kpi.unit : "(out of 100)";
  const bestSub = kpi ? kpi.unit : "(out of 100)";

  /*
    Average and Best labels always sit above the curve, over their own dot.
    The Your-Percentile marker is handled separately (see valueBadge below):
    it gets a bigger highlighted dot on the curve, with its label pinned
    below the axis instead of competing for space above the curve — so it
    can never collide with Average/Best, no matter how close the values are.
  */
  const topLabel = (x, y, name, num, textColor) => {
    let anchor = "middle";
    let dx = 0;
    if (x <= left + 34) { anchor = "start"; dx = 4; }
    else if (x >= right - 34) { anchor = "end"; dx = -4; }

    const nameSize = 9;
    const numSize = 11;
    const approxWidth = Math.max(name.length * (nameSize * 0.56), String(num).length * (numSize * 0.62)) + 6;
    let lx = x + dx;
    if (anchor === "start") lx = Math.max(left, Math.min(right - approxWidth, lx));
    else if (anchor === "end") lx = Math.max(left + approxWidth, Math.min(right, lx));
    else lx = Math.max(left + approxWidth / 2, Math.min(right - approxWidth / 2, lx));

    const topY = clamp(y - 30, 12, h - 62);
    const numY = topY + 13;
    return `
      <g class="curve-marker-label">
        <text x="${lx}" y="${topY}" text-anchor="${anchor}" font-size="${nameSize}" font-weight="700" fill="${textColor}" stroke="#ffffff" stroke-width="2.2" paint-order="stroke">${name}</text>
        <text x="${lx}" y="${numY}" text-anchor="${anchor}" font-size="${numSize}" font-weight="800" fill="${textColor}" stroke="#ffffff" stroke-width="2.2" paint-order="stroke">${num}</text>
      </g>
    `;
  };

  // Option C: the Your-Percentile callout lives in its own row below the
  // axis, centred under the dot (clamped inside the chart), so it never
  // has to dodge the Average/Best labels above the curve.
  const valueBadgeY = baseline + 30;
  const valueBadge = (x, num) => {
    const label = "Your Percentile";
    const nameSize = 9.5, numSize = 13;
    const approxWidth = Math.max(label.length * (nameSize * 0.56), String(num).length * (numSize * 0.62));
    const padX = 9, padY = 6;
    const bw = approxWidth + padX * 2;
    const bx = clamp(x - bw / 2, left, right - bw);
    const by = valueBadgeY;
    const bh = 34;
    const cx = bx + bw / 2;
    return `
      <line x1="${x}" y1="${valueY}" x2="${x}" y2="${by}" stroke="#0d63d4" stroke-width="1.4" stroke-dasharray="3,3"></line>
      <g class="curve-marker-label">
        <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh}" rx="8" fill="#eaf4ff" stroke="#9cc7f2" stroke-width="1"></rect>
        <text x="${cx.toFixed(1)}" y="${(by + 14).toFixed(1)}" text-anchor="middle" font-size="${nameSize}" font-weight="700" fill="#0d63d4">${label}</text>
        <text x="${cx.toFixed(1)}" y="${(by + 28).toFixed(1)}" text-anchor="middle" font-size="${numSize}" font-weight="800" fill="#0d63d4">${num}</text>
      </g>
    `;
  };

  return `
    <div class="percentile-curve">
      <div class="curve-formula">
        <span class="formula-title">Excel benchmark percentile</span>
        <span class="formula-text">${has ? percentileFormula(kpi) : "Enter a KPI value to calculate your percentile."}</span>
      </div>
      <div class="curve-legend">
        <span class="curve-legend-item"><span class="curve-dot curve-dot-value"></span>Your Percentile</span>
        <span class="curve-legend-item"><span class="curve-dot curve-dot-avg"></span>Average (${avgLegend})</span>
        <span class="curve-legend-item"><span class="curve-dot curve-dot-best"></span>Best (${bestLegend})</span>
      </div>
      <div class="curve-body">
        <div class="curve-chart">
          <svg width="100%" viewBox="0 0 ${W} ${h}" preserveAspectRatio="xMidYMid meet" style="overflow:visible; display:block; aspect-ratio:${W}/${h};" aria-label="Benchmark percentile distribution curve">
            <defs>
              <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#1677e8" stop-opacity=".38"></stop>
                <stop offset="1" stop-color="#1677e8" stop-opacity="0"></stop>
              </linearGradient>
            </defs>

            <line x1="${left}" y1="${baseline}" x2="${right}" y2="${baseline}" stroke="#dfeaf5" stroke-width="1"></line>
            <path d="${areaPath}" fill="url(#${gid})"></path>
            <path d="${linePath}" fill="none" stroke="#1677e8" stroke-width="2"></path>

            <line x1="${avgX}" y1="${baseline}" x2="${avgX}" y2="${avgY}" stroke="#6d829d" stroke-width="1.2" stroke-dasharray="3,3"></line>
            <circle cx="${avgX}" cy="${avgY}" r="3.6" fill="#ffffff" stroke="#6d829d" stroke-width="1.6"></circle>
            ${topLabel(avgX, avgY, "Average", avgNum, "#4B5563")}

            <line x1="${bestX}" y1="${baseline}" x2="${bestX}" y2="${bestY}" stroke="#16a36a" stroke-width="1.2" stroke-dasharray="3,3"></line>
            <circle cx="${bestX}" cy="${bestY}" r="4" fill="#16a36a"></circle>
            ${topLabel(bestX, bestY, "Best", bestNum, "#16a36a")}

            ${has ? `
              <circle cx="${valueX}" cy="${valueY}" r="12" fill="#1677e8" opacity="0.16"></circle>
              <circle cx="${valueX}" cy="${valueY}" r="6.5" fill="#1677e8" stroke="#ffffff" stroke-width="2"></circle>
              ${valueBadge(valueX, Math.round(p))}
            ` : ""}

            <text x="${left}" y="${baseline + 15}" font-size="9" fill="#8195aa">0</text>
            <text x="${right}" y="${baseline + 15}" text-anchor="end" font-size="9" fill="#8195aa">100</text>
            <text x="${mid}" y="${baseline + 15}" text-anchor="middle" font-size="9" fill="#8195aa">Performance Score (Percentile)</text>
          </svg>
        </div>
        <div class="curve-stats">
          <div class="curve-stat curve-stat-value">
            <div class="curve-stat-label">Your Percentile</div>
            <div class="curve-stat-num">${has ? Math.round(p) : "—"}</div>
            <div class="curve-stat-sub">(out of 100)</div>
          </div>
          <div class="curve-stat curve-stat-avg">
            <div class="curve-stat-label">Average</div>
            <div class="curve-stat-num">${avgNum}</div>
            <div class="curve-stat-sub">${avgSub}</div>
          </div>
          <div class="curve-stat curve-stat-best">
            <div class="curve-stat-label">Best</div>
            <div class="curve-stat-num">${bestNum}</div>
            <div class="curve-stat-sub">${bestSub}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ---------------------------------------------------------
   TOP NAV (shared across pages)
--------------------------------------------------------- */
function topNav(activeLabel) {
  const labels = ["Home", "About", "Methodology", "Contact", "Results"];
  return `
    <div class="topnav">
      <div class="brand-wrap">
        <button class="brand-button" data-nav="Home" aria-label="Go to Home">
          <img class="acg-logo" src="img/acg-logo.png" alt="ACG Logo">
        </button>
      </div>
      <div class="nav-links">
        ${labels.map((label) => `<button type="button" class="nav-link ${activeLabel === label ? "active" : ""}" data-nav="${label}">${label}</button>`).join("")}
      </div>
      <div class="nav-status"><span class="nav-dot"></span>${activeLabel}</div>
    </div>
  `;
}

function stepper(active) {
  const steps = ["Details", "Setup", "KPIs", "Results"];
  const order = { home: 0, intro: 0, setup: 1, form: 2, dashboard: 3, kpiDetail: 3 };
  const current = order[active] ?? 0;
  return `
    <div class="stepper" aria-label="Application progress">
      ${steps.map((label, i) => {
        const done = i < current;
        const isActive = i === current;
        return `<div class="step-item ${done ? "done" : ""} ${isActive ? "active" : ""}">
          <div class="step-circle">${done ? "✓" : i + 1}</div>
          <div>${label}</div>
        </div>`;
      }).join("")}
    </div>
  `;
}

/* ---------------------------------------------------------
   STATIC NAV PAGES — About / Methodology
--------------------------------------------------------- */
function renderAbout() {
  root.innerHTML = `
    ${topNav("About")}
    <main class="page info-page">
      <section class="info-hero">
        <span class="eyebrow">About the tool</span>
        <h1>Make paper-mill performance easier to understand.</h1>
        <p class="lede">The Paper Industry KPI Tool turns operational and financial KPI inputs into a clear benchmark position, so teams can quickly see where performance is strong and where improvement may have the biggest impact.</p>
      </section>

      <div class="info-grid">
        <article class="card info-card">
          <div class="info-icon">01</div>
          <h3>Benchmark performance</h3>
          <p>Compare each entered KPI with the benchmark bands built into the tool and see the resulting position on a 0–100 benchmark scale.</p>
        </article>
        <article class="card info-card">
          <div class="info-icon">02</div>
          <h3>See what changed your score</h3>
          <p>Results are broken down by Financial, Fibre, Utilities, Chemical, Operational, and Quality & Delivery categories.</p>
        </article>
        <article class="card info-card">
          <div class="info-icon">03</div>
          <h3>Act on the gaps</h3>
          <p>Use the strongest and weakest categories as a quick starting point for improvement discussions and further mill-level analysis.</p>
        </article>
      </div>

      <section class="card info-section">
        <div>
          <span class="eyebrow">What you can measure</span>
          <h2>One assessment, multiple performance areas</h2>
        </div>
        <div class="tag-grid">
          ${["Financial Performance","Fibre & Raw Material","Utilities & Energy","Chemical Consumption","Operational Efficiency & Productivity","Quality & Delivery"].map((x, i) => `
            <div class="info-tag"><span>${String(i + 1).padStart(2,"0")}</span>${x}</div>
          `).join("")}
        </div>
      </section>

      <div class="row-actions">
        <button class="btn btn-ghost" data-nav="Home">← Back to Home</button>
        <button class="btn" id="about-start">Start Benchmarking →</button>
      </div>
    </main>
  `;
  document.getElementById("about-start").addEventListener("click", () => {
    state.page = "home";
    state.step = "home";
    render();
  });
}

function renderMethodology() {
  root.innerHTML = `
    ${topNav("Methodology")}
    <main class="page info-page">
      <section class="info-hero">
        <span class="eyebrow">Methodology</span>
        <h1>How your benchmark score is calculated.</h1>
        <p class="lede">The tool uses the benchmark bands in the supplied Excel sheet. Average, Good, and Best are mapped to the 50th, 70th, and 90th benchmark percentiles respectively; values outside the bands are linearly extrapolated and capped at 0–100.</p>
      </section>

      <div class="method-flow">
        <article class="card method-card">
          <span class="method-number">1</span>
          <div><h3>Enter your KPI values</h3><p>Choose your raw-material base and product type, then enter the current values for the KPIs relevant to your mill.</p></div>
        </article>
        <article class="card method-card">
          <span class="method-number">2</span>
          <div><h3>Map against benchmark edges</h3><p>Each KPI uses its Excel Average and Best values. Average is the mean (50th percentile) and Best is the 90th percentile. The tool derives σ from those two values and uses the standard normal CDF; it also knows whether higher or lower values represent better performance.</p></div>
        </article>
        <article class="card method-card">
          <span class="method-number">3</span>
          <div><h3>Convert to benchmark position</h3><p>Average is anchored at the 50th percentile and Best-in-Class at the 90th percentile. Your value is interpolated between those anchors and capped at 0–100.</p></div>
        </article>
        <article class="card method-card">
          <span class="method-number">4</span>
          <div><h3>Roll up the result</h3><p>A category score is the average of its answered KPI scores. The overall score is the average of the answered category scores.</p></div>
        </article>
      </div>


      <section class="card info-section">
        <span class="eyebrow">Direction matters</span>
        <h2>Higher is not always better</h2>
        <div class="direction-grid">
          <div class="direction-box"><strong>Higher is better</strong><span>Examples: EBITDA margin, OTIF delivery, condensate recovery and yield.</span></div>
          <div class="direction-box"><strong>Lower is better</strong><span>Examples: electricity use, chemical consumption, inventory days and breaks per day.</span></div>
        </div>
      </section>

      <div class="row-actions">
        <button class="btn btn-ghost" data-nav="Home">← Back to Home</button>
        <button class="btn" id="method-start">Start Benchmarking →</button>
      </div>
    </main>
  `;
  document.getElementById("method-start").addEventListener("click", () => {
    state.page = "home";
    state.step = "home";
    render();
  });
}

function renderContact() {
  const initials = "AG";
  const tiles = [
    {
      label: "Phone",
      value: "+91 99103 26249",
      href: "tel:+919910326249",
      icon: `<path d="M4 5c0-.6.4-1 1-1h2.6c.5 0 .9.3 1 .8l.8 3.3c.1.4 0 .9-.3 1.2L7.7 10.7a13 13 0 0 0 5.6 5.6l1.4-1.4c.3-.3.8-.4 1.2-.3l3.3.8c.5.1.8.5.8 1V19c0 .6-.4 1-1 1h-1.5C9.6 20 4 14.4 4 6.5V5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
    },
    {
      label: "Email",
      value: "arvind@acgletters.com",
      href: "mailto:arvind@acgletters.com",
      icon: `<rect x="3.5" y="5.5" width="17" height="13" rx="2.2" stroke="currentColor" stroke-width="1.8"/><path d="m4.5 7 7 5.5L18.5 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    },
    {
      label: "Address",
      value: "M428, Ground Floor, Orchid Island, Sector 51, Gurugram, Haryana, India – 122001",
      href: null,
      icon: `<path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.8"/>`,
    },
    {
      label: "Website",
      value: "www.arvindconsulting.com",
      href: "https://www.arvindconsulting.com",
      icon: `<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.6 5.4 3.6 8.5S14.4 18.1 12 20.5C9.6 18.1 8.4 15.1 8.4 12S9.6 5.9 12 3.5Z" stroke="currentColor" stroke-width="1.8"/>`,
    },
  ];

  root.innerHTML = `
    ${topNav("Contact")}
    <main class="page info-page">
      <section class="info-hero">
        <span class="eyebrow">Get in touch</span>
        <h1>Contact us</h1>
        <p class="lede">Have a question about your benchmark results or the methodology behind them? Reach out and we'll be happy to help.</p>
      </section>

      <div class="card contact-profile-card">
        <div class="contact-profile-head">
          <div class="contact-avatar">${initials}</div>
          <div>
            <h3 class="contact-profile-name">Arvind Garg</h3>
            <p class="contact-profile-role">Partner</p>
          </div>
        </div>
        <div class="contact-tile-grid">
          ${tiles.map((t) => {
            const inner = `
              <div class="contact-tile-icon"><svg viewBox="0 0 24 24" fill="none">${t.icon}</svg></div>
              <div class="contact-tile-body">
                <span class="contact-tile-label">${t.label}</span>
                <span class="contact-tile-value">${t.value}</span>
              </div>
            `;
            return t.href
              ? `<a class="contact-tile" href="${t.href}" ${t.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>${inner}</a>`
              : `<div class="contact-tile">${inner}</div>`;
          }).join("")}
        </div>
      </div>

      <div class="row-actions">
        <button class="btn btn-ghost" data-nav="Home">← Back to Home</button>
        <button class="btn" id="contact-start">Start Benchmarking →</button>
      </div>
    </main>
  `;
  document.getElementById("contact-start").addEventListener("click", () => {
    state.page = "home";
    state.step = "home";
    render();
  });
}

function renderResultsNavPage() {
  const hasResults = Object.values(state.values).some(v => v !== "" && v !== undefined && v !== null);
  if (hasResults) {
    state.page = "";
    state.page = ""; state.step = "dashboard";
    renderDashboard();
    return;
  }

  root.innerHTML = `
    ${topNav("Results")}
    <main class="page info-page">
      <section class="results-empty card">
        <div class="results-empty-icon">✓</div>
        <span class="eyebrow">Results</span>
        <h1>Your benchmark results will appear here.</h1>
        <p class="lede">Complete the short assessment first. Once you calculate your KPIs, use this tab any time to return to your dashboard.</p>
        <button class="btn" id="results-start">Start Assessment →</button>
      </section>
    </main>
  `;
  document.getElementById("results-start").addEventListener("click", () => {
    state.page = "home";
    state.step = "home";
    render();
  });
}

/* ---------------------------------------------------------
   PAGE: HOME (landing — hero + feature cards only, no form)
--------------------------------------------------------- */
function renderHome() {
  root.innerHTML = `
    ${topNav("Home")}
    <div class="page">
      ${stepper("home")}
      <section class="hero">
        <div class="hero-content">
          <p class="eyebrow">Data driven · Smarter decisions</p>
          <h1>Benchmark your mill against industry performance</h1>
          <p class="lede">Compare your key performance indicators with paper-industry benchmarks, understand your percentile position, and identify opportunities to improve efficiency and profitability.</p>
          <div class="hero-pills">
            <span class="hero-pill">Industry benchmarks</span>
            <span class="hero-pill">KPI percentiles</span>
            <span class="hero-pill">Actionable insights</span>
          </div>
        </div>
        <div class="hero-visual">
        <img src="img/paper-mill-hero.png" alt="Paper mill industry">
    </div>
      </section>

      <div class="feature-grid">
        <div class="feature-card"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div><h3>Industry Benchmarks</h3><p>Understand where your mill stands against benchmark performance.</p></div>
        <div class="feature-card"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3a7 7 0 0 0-4 12.74V19h8v-3.26A7 7 0 0 0 12 3Z" stroke="currentColor" stroke-width="1.8"/><path d="M9 22h6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></div><h3>KPI Percentiles</h3><p>See how each KPI maps onto your benchmark distribution.</p></div>
        <div class="feature-card"><div class="feature-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h3>Actionable Insights</h3><p>Find strengths and improvement areas from your results dashboard.</p></div>
      </div>

      <div class="row-actions">
        <button class="btn" id="btn-home-continue">Get Started &#8594;</button>
      </div>
    </div>
  `;

  document.getElementById("btn-home-continue").addEventListener("click", () => {
    state.step = "intro";
    render();
  });
}

/* ---------------------------------------------------------
   PAGE: INTRO (name / email)
--------------------------------------------------------- */
function renderIntro() {
  root.innerHTML = `
    ${topNav("Home")}
    <div class="page">
      ${stepper("intro")}
      <section class="hero hero-compact">
        <div class="hero-content">
          <p class="eyebrow">Step 1 · Details</p>
          <h1>Let's start your benchmark</h1>
          <p class="lede">Enter your details to personalize your benchmarking session.</p>
        </div>
      </section>

      <div class="card">
        <div class="form-grid">
          <div class="field">
            <label>Your name</label>
            <input id="f-name" type="text" placeholder="e.g. Ananya Sharma" value="${state.name}" />
            <div class="field-error" id="err-name">Please enter your name.</div>
          </div>
          <div class="field">
            <label>Email</label>
            <input id="f-email" type="email" placeholder="you@company.com" value="${state.email}" />
            <div class="field-error" id="err-email">Please enter a valid email address (e.g. you@company.com).</div>
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" id="btn-home-back">&#8592; Back</button>
          <button class="btn" id="btn-continue">Continue &#8594;</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-home-back").addEventListener("click", () => {
    state.step = "home";
    render();
  });

  const emailInput = document.getElementById("f-email");
  const nameInput = document.getElementById("f-name");
  const emailErr = document.getElementById("err-email");
  const nameErr = document.getElementById("err-name");
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = (v) => EMAIL_RE.test(v.trim());

  const clearError = (input, errEl) => {
    input.classList.remove("input-error");
    errEl.classList.remove("show");
  };
  emailInput.addEventListener("input", () => clearError(emailInput, emailErr));
  nameInput.addEventListener("input", () => clearError(nameInput, nameErr));

  document.getElementById("btn-continue").addEventListener("click", () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    let ok = true;

    if (!name) { nameInput.classList.add("input-error"); nameErr.classList.add("show"); ok = false; }
    else clearError(nameInput, nameErr);

    if (!isValidEmail(email)) { emailInput.classList.add("input-error"); emailErr.classList.add("show"); ok = false; }
    else clearError(emailInput, emailErr);

    if (!ok) return;
    state.name = name; state.email = email; state.page = ""; state.step = "setup"; render();
  });
}

/* ---------------------------------------------------------
   PAGE: SETUP (2 dropdowns)
--------------------------------------------------------- */
function renderSetup() {
  root.innerHTML = `
    ${topNav("Home")}
    <div class="page">
      ${stepper("setup")}
      <p class="eyebrow">Step 2 · Setup</p>
      <h2>Tell us about your mill</h2>
      <p class="lede">This decides which benchmark bands apply to your numbers.</p>
      <div class="card">
        <div class="field">
          <label>Raw material base</label>
          <select id="f-material">
            <option value="">Select material...</option>
            <option value="waste" ${state.material === "waste" ? "selected" : ""}>Waste Paper (RCF-based)</option>
            <option value="agro" ${state.material === "agro" ? "selected" : ""}>Agro Waste (straw / bagasse)</option>
            <option value="wood" ${state.material === "wood" ? "selected" : ""}>Wood / Pulp (integrated mill)</option>
          </select>
        </div>
        <div class="field">
          <label>Product output</label>
          <select id="f-product">
            <option value="">Select product...</option>
            <option value="newsprint" ${state.product === "newsprint" ? "selected" : ""}>Newsprint / Writing Paper</option>
            <option value="board" ${state.product === "board" ? "selected" : ""}>Board</option>
          </select>
        </div>
        <div class="field">
          <label>Wood/Pulp fibre source (for the Fibre procurement - Wood/Pulp KPI)</label>
          <select id="f-woodsource">
            <option value="domestic" ${state.woodSource === "domestic" ? "selected" : ""}>Domestic captive wood (eucalyptus/subabul)</option>
            <option value="imported" ${state.woodSource === "imported" ? "selected" : ""}>Imported bleached pulp (BHK/NBSK) blend</option>
          </select>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" id="btn-back">&#8592; Back</button>
          <button class="btn" id="btn-continue">Continue &#8594;</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-back").addEventListener("click", () => { state.step = "intro"; render(); });
  document.getElementById("btn-continue").addEventListener("click", () => {
    state.material = document.getElementById("f-material").value;
    state.product = document.getElementById("f-product").value;
    state.woodSource = document.getElementById("f-woodsource").value;
    if (!state.material || !state.product) {
      alert("Please select both options.");
      return;
    }
    state.step = "form";
    render();
  });
}

/* ---------------------------------------------------------
   PAGE: FORM (categorized KPI inputs)
--------------------------------------------------------- */
function renderForm() {
  const categories = buildCategories(state.material, state.product, state.woodSource);
  const allKpis = categories.flatMap((c) => c.kpis);
  const filled = allKpis.filter((k) => state.values[k.id]).length;

  root.innerHTML = `
    ${topNav("Home")}
    <div class="page">
      ${stepper("form")}
      <p class="eyebrow">Step 3 · KPI values</p>
      <h2>Enter your KPI values</h2>
      <p class="lede">Provide your current KPI values. You can expand each category to enter the relevant metrics.</p>
      <div class="progress-meta"><span>${filled} of ${allKpis.length} KPIs completed</span><span>${Math.round((filled / allKpis.length) * 100)}%</span></div>
      <div class="progress-bar"><div class="progress-fill" style="width:${(filled / allKpis.length) * 100}%"></div></div>

      ${categories.map((cat) => {
        const open = state.openCat === cat.id;
        const answered = cat.kpis.filter((k) => state.values[k.id]).length;
        return `
          <div class="cat">
            <div class="cat-head" data-cat="${cat.id}">
              <span class="cat-title">${cat.title}</span>
              <span class="cat-meta">
                <span class="badge">${answered}/${cat.kpis.length}</span>
                <span class="chevron ${open ? "open" : ""}">&#9662;</span>
              </span>
            </div>
            ${open ? `
              <div class="cat-body">
                ${cat.kpis.map((k) => `
                  <div class="kpi-row">
                    <span class="kpi-label">${k.label}</span>
                    <input type="number" inputmode="decimal" placeholder="Value" data-kpi="${k.id}" value="${state.values[k.id] ?? ""}" />
                    <span class="kpi-unit">${k.unit}</span>
                  </div>
                `).join("")}
              </div>
            ` : ""}
          </div>
        `;
      }).join("")}

      <div class="row-actions">
        <button class="btn btn-ghost" id="btn-back">&#8592; Back</button>
        <button class="btn" id="btn-calc" ${filled === 0 ? "disabled" : ""}>Calculate Results &#8594;</button>
      </div>
    </div>
  `;

  document.querySelectorAll(".cat-head").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-cat");
      state.openCat = state.openCat === id ? "" : id;
      render();
    });
  });

  document.querySelectorAll("input[data-kpi]").forEach((el) => {
    el.addEventListener("input", () => {
      state.values[el.getAttribute("data-kpi")] = el.value;
    });
    el.addEventListener("change", () => {
      state.values[el.getAttribute("data-kpi")] = el.value;
      render();
    });
  });

  document.getElementById("btn-back").addEventListener("click", () => { state.step = "setup"; render(); });
  document.getElementById("btn-calc").addEventListener("click", () => {
    state.page = ""; state.step = "dashboard";
    submitToBackend();
    render();
  });
}

/* ---------------------------------------------------------
   PAGE: DASHBOARD
--------------------------------------------------------- */
function renderDashboard() {
  const categories = buildCategories(state.material, state.product, state.woodSource);
 const categoryScores = categories.map((cat) => {
  const answeredKpis = cat.kpis.filter(
    (k) => state.values[k.id] !== undefined &&
           state.values[k.id] !== null &&
           state.values[k.id] !== ""
  );

  const scores = answeredKpis
    .map((k) => scoreKPI(state.values[k.id], k))
    .filter((s) => s !== null);

  const avg = scores.length
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : null;

  return {
    ...cat,
    score: avg,
    answered: scores.length,
    total: cat.kpis.length
  };
}).filter((cat) => cat.answered > 0);
  const withScore = categoryScores.filter((c) => c.score !== null);
  const overall = withScore.length ? withScore.reduce((a, c) => a + c.score, 0) / withScore.length : null;

 const strengths = withScore
  .filter((c) => c.score >= 50)
  .sort((a, b) => b.score - a.score);

const weaknesses = withScore
  .filter((c) => c.score < 50)
  .sort((a, b) => a.score - b.score);

  const circumference = 2 * Math.PI * 26;
  const dash = overall !== null ? (overall / 100) * circumference : 0;

  root.innerHTML = `
    ${topNav("Results")}
    <div class="page">
      ${stepper("dashboard")}
      <p class="eyebrow">Step 4 · Results</p>
      <h2>Benchmark results</h2>
      <p class="lede">Your KPI values are positioned on a benchmark percentile distribution.</p>

      <div class="card overall-card">
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="#E5E7EB" stroke-width="7"></circle>
          <circle cx="32" cy="32" r="26" fill="none" stroke="#16A34A" stroke-width="7"
            stroke-dasharray="${dash} ${circumference}" stroke-linecap="round" transform="rotate(-90 32 32)"></circle>
          <text x="32" y="30" text-anchor="middle" font-size="14" font-weight="700" fill="#12183A">${overall !== null ? Math.round(overall) : "—"}</text>
          <text x="32" y="41" text-anchor="middle" font-size="7" fill="#6B7280">/100</text>
        </svg>
        <div>
          <div class="overall-tag">${overall !== null ? scoreLabel(overall) : "No data yet"}</div>
          <div class="overall-sub">Overall benchmark percentile across the answered categories.</div>
        </div>
      </div>

      <div class="chip-row">
        ${categoryScores.map((c) => `
          <div class="chip">
            <div class="chip-label">${c.title}</div>
            <div class="chip-score">
  ${c.score !== null ? `${Math.round(c.score)}th percentile` : "—"}
</div>
            <div class="chip-tag chip-${c.score !== null ? scoreLabel(c.score).toLowerCase().replace(" ", "-") : "none"}">${c.score !== null ? scoreLabel(c.score) : "N/A"}</div>
          </div>
        `).join("")}
      </div>
            <div class="legend-card">
        <div class="legend-title">Understanding your percentile</div>
        <div class="legend-sub">Here's what each band means and the percentile range it covers.</div>

        <div class="range-row">
          <div class="range-item">
            <span class="range-dot" style="background:var(--red);"></span><span class="range-name">Below Average</span>
            <div class="range-range">0th – 49th percentile</div>
          </div>
          <div class="range-item">
            <span class="range-dot" style="background:var(--amber);"></span><span class="range-name">Above Average</span>
            <div class="range-range">50th – 89th percentile</div>
          </div>
          <div class="range-item">
            <span class="range-dot" style="background:var(--green);"></span><span class="range-name">Best-in-Class</span>
            <div class="range-range">90th – 100th percentile</div>
          </div>
        </div>

        <div class="scale-wrap">
          <div class="scale-bar">
            <div class="scale-seg-below"></div>
            <div class="scale-seg-above"></div>
            <div class="scale-seg-best"></div>
          </div>
          <div class="scale-ticks">
            <span>0</span><span>50</span><span>90</span><span>100</span>
          </div>
        </div>

        <div class="definition-box">
          <b>What is a percentile?</b>Just like exam percentiles, this shows how you compare to others — not your marks out of 100, but your standing among all mills. 69th percentile = you outperformed 69 out of every 100 mills.
        </div>
      </div>

      <!-- Strengths / improvement boxes now sit directly below the category percentile cards -->
      ${(strengths.length || weaknesses.length) ? `
        <div class="results-insights-grid">
          ${strengths.length ? `
            <div class="card list-card">
              <div class="list-title">Top strengths</div>
              ${strengths.map((s) => `<div class="list-row"><span>${s.title}</span><span class="list-good">${Math.round(s.score)}</span></div>`).join("")}
            </div>
          ` : ""}
          ${weaknesses.length ? `
            <div class="card list-card">
              <div class="list-title">Areas to improve</div>
              ${weaknesses.map((s) => `<div class="list-row"><span>${s.title}</span><span class="list-bad">${Math.round(s.score)}</span></div>`).join("")}
            </div>
          ` : ""}
        </div>
      ` : ""}

      <div class="section-title">Category-wise benchmark percentile</div>
      <p class="lede" style="margin-top:-8px;">Tap a category to see the graph for each of its individual KPIs.</p>
      <div class="curve-grid">
        ${categoryScores.map((c) => `
          <div class="card curve-card clickable" data-open-cat="${c.id}" role="button" tabindex="0">
            <div class="curve-title-row">
              <div class="curve-title">${c.title}</div>
              <span class="curve-open-hint">${c.total} KPIs &#8594;</span>
            </div>
            <div class="curve-sub">
  ${c.score !== null
    ? `${Math.round(c.score)}th percentile · ${scoreLabel(c.score)}`
    : `${c.answered}/${c.total} answered`
  }
</div>
            ${bellCurveSVG(c.score, false, null)}
          </div>
        `).join("")}
      </div>

          <div class="row-actions">
  <button class="btn btn-ghost" id="btn-back-dash">&#8592; Back to Results</button>
  <button class="btn btn-ghost" id="btn-edit">Edit numbers</button>
</div>

<div class="pdf-download-wrap">
  <button class="btn pdf-download-btn" id="btn-download-pdf">
    &#128196; Download result as PDF
  </button>
</div>

<div class="row-actions">
  <button class="btn" id="btn-restart">&#8635; Start over</button>
</div>
      </div>
    </div>
  `;

  document.querySelectorAll(".curve-card[data-open-cat]").forEach((el) => {
    const open = () => {
      state.detailCat = el.getAttribute("data-open-cat");
      state.step = "kpiDetail";
      render();
    };
    el.addEventListener("click", open);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  document.getElementById("btn-edit").addEventListener("click", () => { state.page = ""; state.step = "form"; render(); });
  document.getElementById("btn-restart").addEventListener("click", () => {
    Object.assign(state, { page: "home", step: "home", name: "", email: "", material: "", product: "", values: {}, openCat: "financial", detailCat: null });
    render();
  });
  document.getElementById("btn-download-pdf").addEventListener("click", downloadResultsPDF);
}
async function downloadResultsPDF() {
  const button = document.getElementById("btn-download-pdf");
  const report = document.querySelector(".page");

  if (!button || !report) return;

  if (!window.html2canvas || !window.jspdf) {
    alert("PDF tools are still loading. Please try again in a moment.");
    return;
  }

  const originalText = button.innerHTML;
  button.disabled = true;
  button.innerHTML = "Preparing PDF...";
  const actionButtons = document.querySelector(".row-actions");
const pdfButton = document.querySelector(".pdf-download-wrap");

if (actionButtons) actionButtons.style.display = "none";
if (pdfButton) pdfButton.style.display = "none";

  try {
    const canvas = await html2canvas(report, {
      scale: 1.5,
      useCORS: true,
      backgroundColor: "#eef6fd",
      logging: false,
      windowWidth: report.scrollWidth
    });

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const margin = 8;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;

    const imageHeight =
      (canvas.height * usableWidth) / canvas.width;

    let remainingHeight = imageHeight;
    let sourceY = 0;

    const pagePixelHeight = Math.floor(
      (canvas.width * (pageHeight - margin * 2)) / usableWidth
    );

    while (remainingHeight > 0) {

      const sliceHeight = Math.min(
        pagePixelHeight,
        canvas.height - sourceY
      );

      const pageCanvas = document.createElement("canvas");

      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext("2d");

      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight
      );

      if (sourceY > 0) {
        pdf.addPage();
      }

      const sliceMmHeight =
        (sliceHeight * usableWidth) / canvas.width;

      pdf.addImage(
        pageCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        usableWidth,
        sliceMmHeight
      );

      sourceY += sliceHeight;
      remainingHeight -= sliceMmHeight;
    }

    const safeName =
      (state.name || "User")
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "") || "User";

    pdf.save(`KPI-Benchmark-Results-${safeName}.pdf`);

  } catch (error) {

    console.error("PDF generation failed:", error);

    alert("PDF could not be generated. Please try again.");

  } finally {
    if (actionButtons) actionButtons.style.display = "";
    if (pdfButton) pdfButton.style.display = "";
    button.disabled = false;
    button.innerHTML = originalText;

  }
}

/* ---------------------------------------------------------
   PAGE: KPI DETAIL — one category's KPIs, each with its own graph
--------------------------------------------------------- */
function renderKpiDetail() {
  const categories = buildCategories(state.material, state.product, state.woodSource);
  const cat = categories.find((c) => c.id === state.detailCat) || categories[0];

 const kpiRows = cat.kpis
  .filter((k) => {
    const value = state.values[k.id];

    return value !== undefined &&
           value !== null &&
           value !== "";
  })
  .map((k) => {
    const raw = state.values[k.id];
    const percentile = scoreKPI(raw, k);

    return {
      kpi: k,
      raw,
      percentile
    };
  });

  root.innerHTML = `
    ${topNav("Results")}
    <div class="page">
      ${stepper("kpiDetail")}
      <h2>${cat.title}</h2>
      <p class="lede">Each of the ${cat.kpis.length} KPIs in this category, plotted on its own benchmark percentile curve.</p>

      <div class="curve-grid">
        ${kpiRows.map(({ kpi: k, raw, percentile }) => `
          <div class="card curve-card">
            <div class="curve-title">${k.label}</div>
            <div class="curve-sub">
              ${raw !== undefined && raw !== "" ? `Your value: ${raw} ${k.unit}` : "Not answered"}
              ${percentile !== null
  ? ` · ${Math.round(percentile)}th percentile · ${scoreLabel(percentile)}`
  : ""
}
            </div>
            ${bellCurveSVG(percentile, false, k)}
          </div>
        `).join("")}
      </div>

      <div class="row-actions">
  <button class="btn btn-ghost" id="btn-back-dash">&#8592; Back to Results</button>
  <button class="btn btn-ghost" id="btn-edit">Edit numbers</button>
  <button class="btn" id="btn-restart">&#8635; Start over</button>
</div>

<div class="pdf-download-wrap">
  <button class="btn pdf-download-btn" id="btn-download-pdf">
    &#128196; Download result as PDF
  </button>
</div>
  `;

  document.getElementById("btn-back-dash").addEventListener("click", () => { state.page = ""; state.step = "dashboard"; render(); });
  document.getElementById("btn-edit").addEventListener("click", () => { state.page = ""; state.step = "form"; render(); });
  document.getElementById("btn-restart").addEventListener("click", () => {
    Object.assign(state, { page: "home", step: "home", name: "", email: "", material: "", product: "", values: {}, openCat: "financial", detailCat: null });
    render();
  });
  document.getElementById("btn-download-pdf").addEventListener("click", downloadResultsPDF);
}

/* ---------------------------------------------------------
   SEND RESULTS TO BACKEND (optional — fails silently if no backend running)
--------------------------------------------------------- */
function submitToBackend() {
  const categories = buildCategories(state.material, state.product, state.woodSource);
  const categoryScores = categories.map((cat) => {
    const scores = cat.kpis.map((k) => scoreKPI(state.values[k.id], k)).filter((s) => s !== null);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return { title: cat.title, score: avg };
  });

  fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: state.name,
      email: state.email,
      material: state.material,
      product: state.product,
      values: state.values,
      categoryScores,
      submittedAt: new Date().toISOString(),
    }),
  }).catch(() => {
    // No backend running — the tool still works fully client-side.
    console.log("Backend not reachable; results were not saved server-side.");
  });
}

/* ---------------------------------------------------------
   ROUTER
--------------------------------------------------------- */
/* ---------------------------------------------------------
   NAVIGATION — top tabs are real buttons with hover + click states
--------------------------------------------------------- */
root.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-nav]");
  if (!nav) return;

  const destination = nav.getAttribute("data-nav");
  if (destination === "Home") {
    state.page = "home";
    state.step = "home";
    render();
  } else if (destination === "About") {
    state.page = "about";
    render();
  } else if (destination === "Methodology") {
    state.page = "methodology";
    render();
  } else if (destination === "Contact") {
    state.page = "contact";
    render();
  } else if (destination === "Results") {
    state.page = "results";
    render();
  }
});

function render() {
  if (state.page === "about") return renderAbout();
  if (state.page === "methodology") return renderMethodology();
  if (state.page === "contact") return renderContact();
  if (state.page === "results") return renderResultsNavPage();

  if (state.step === "home") renderHome();
  else if (state.step === "intro") renderIntro();
  else if (state.step === "setup") renderSetup();
  else if (state.step === "form") renderForm();
  else if (state.step === "dashboard") renderDashboard();
  else if (state.step === "kpiDetail") renderKpiDetail();
}

render();
