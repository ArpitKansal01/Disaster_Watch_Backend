const fs = require("fs");
const path = require("path");

const FILE_PATH = path.join(__dirname, "..", "data", "predictedReports.json");

function storePrediction({ imageUrl, classify, severity }) {
  try {
    // read existing data
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const data = JSON.parse(raw);

    // push new record
    data.push({
      imageUrl,
      classify,
      severity,
    });

    // write back
    fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❌ Failed to store prediction:", err);
  }
}

module.exports = storePrediction;
