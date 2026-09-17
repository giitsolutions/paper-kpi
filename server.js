const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data", "submissions.json");
const FRONTEND_DIR = path.join(__dirname, "frontend");

// make sure the data file exists
if (!fs.existsSync(DATA_FILE)) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, "[]");
}

app.use(express.json());
app.use(express.static(FRONTEND_DIR));

// Save a completed assessment
app.post("/api/submissions", (req, res) => {
  try {
    const submissions = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    submissions.push(req.body);
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Could not save submission." });
  }
});

// List all saved assessments (e.g. for a professor / admin to review)
app.get("/api/submissions", (req, res) => {
  try {
    const submissions = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ ok: false, error: "Could not read submissions." });
  }
});

// Any other route -> serve the single-page app
app.get("*", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Paper KPI tool running at http://localhost:${PORT}`);
});
