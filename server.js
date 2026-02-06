const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Load MGS data
let mgsData = {};
try {
  mgsData = JSON.parse(fs.readFileSync(path.join(__dirname, "mgs.json"), "utf8"));
  console.log("✅ MGS data loaded");
} catch (err) {
  console.error("❌ Failed to load mgs.json", err);
}

// Health check
app.get("/check", (req, res) => {
  res.send("Backend working");
});

// Utility: calculate match score
function getMatchScore(input, officialItems) {
  const inputWords = input.toLowerCase().split(/\s+/);
  let maxScore = 0;

  for (let item of officialItems) {
    const itemWords = item.toLowerCase().split(/\s+/);
    const matchedWords = inputWords.filter(w => itemWords.includes(w));
    const score = (matchedWords.length / inputWords.length) * 100;
    if (score > maxScore) maxScore = score;
  }
  return Math.round(maxScore);
}

// Utility: find suggestions
function findSuggestions(input, mgsData) {
  const inputWords = input.toLowerCase().split(/\s+/);
  const suggestions = [];

  for (const cls in mgsData) {
    for (const item of mgsData[cls].items) {
      const itemWords = item.toLowerCase().split(/\s+/);
      const matchedWords = inputWords.filter(w => itemWords.includes(w));
      const score = (matchedWords.length / inputWords.length) * 100;
      if (score > 0) suggestions.push({ class: cls, item, score: Math.round(score) });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
}

// POST /check
app.post("/check", (req, res) => {
  const { classNo, goods } = req.body;
  if (!classNo || !goods) return res.status(400).json({ error: "Invalid input" });

  const goodsArray = Array.isArray(goods)
    ? goods
    : goods.split(/,|;|\n/).map(g => g.trim()).filter(Boolean);

  const classData = mgsData[String(classNo)];
  const officialItems = classData?.items || [];

  const results = goodsArray.map(input => {
    const score = getMatchScore(input, officialItems);
    const matched = score >= 80;
    const suggestions = matched ? [] : findSuggestions(input, mgsData);

    return { good: input, score, matched, suggestions };
  });

  res.json(results);
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
