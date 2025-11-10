const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data"); // Node.js FormData
const router = express.Router();

const upload = multer(); // for parsing multipart/form-data

router.post("/predict", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // 1️⃣ Call disaster classification API
    const formDataClass = new FormData();
    formDataClass.append("file", file.buffer, { filename: file.originalname });

    const disasterRes = await axios.post(
      "https://disaster-prediction-375g.onrender.com/predict",
      formDataClass,
      { headers: { ...formDataClass.getHeaders() } }
    );

    const predictedClass = disasterRes.data?.predicted_class || "Unknown";

    // 2️⃣ Call disaster severity API
    const formDataSeverity = new FormData();
    formDataSeverity.append("file", file.buffer, {
      filename: file.originalname,
    });
    const severityRes = await axios.post(
      "https://disaster-severity.onrender.com/predict",
      formDataSeverity,
      { headers: { ...formDataSeverity.getHeaders() } }
    );

    const predictedSeverity =
      severityRes.data?.predicted_severity || "Unknown Severity";

    // 3️⃣ Respond with both type and severity
    res.json({
      predicted_class: predictedClass,
      predicted_severity: predictedSeverity,
      disaster_response: disasterRes.data,
      severity_response: severityRes.data,
    });
  } catch (error) {
    console.error("Error predicting disaster/severity:", error);
    res
      .status(500)
      .json({ error: "Prediction failed", details: error.message });
  }
});

module.exports = router;
