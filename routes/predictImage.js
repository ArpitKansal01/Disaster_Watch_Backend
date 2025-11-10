const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("../config/cloudinary");
const Report = require("../models/Report");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/predict", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded." });

    // ✅ Step 1: Send file to Flask AI model first
    const formData = new FormData();
    formData.append("file", req.file.buffer, req.file.originalname);

    const response = await axios.post(
      "https://disaster-prediction-375g.onrender.com/predict",
      formData,
      { headers: formData.getHeaders() }
    );

    const { predicted_class } = response.data;

    const nonDisasterClasses = [
      "non_damage_building",
      "non_damage_forest",
      "non_disaster",
      "sea",
      "no_disaster_detected",
    ];

    const isNoDisaster = nonDisasterClasses.includes(predicted_class);
    const message = isNoDisaster ? "NO DISASTER DETECTED" : predicted_class;

    // ✅ Step 2: If NO disaster detected → return immediately
    if (isNoDisaster) {
      return res.json({
        message,
        saved: false,
        reason: "No disaster detected, image not uploaded.",
      });
    }

    // ✅ Step 3: Upload to Cloudinary if disaster is detected
    const base64File = `data:${
      req.file.mimetype
    };base64,${req.file.buffer.toString("base64")}`;
    const uploadResponse = await cloudinary.uploader.upload(base64File, {
      folder: "disaster-reports",
      resource_type: "image",
    });

    const imageUrl = uploadResponse.secure_url;

    // ✅ Step 4: Save to MongoDB
    const { note, location } = req.body;
    const report = await Report.create({
      prediction: message,
      note,
      location,
      imageUrl,
    });

    // ✅ Step 5: Return success response
    return res.json({
      message,
      saved: true,
      report,
    });
  } catch (err) {
    console.error("Prediction Error:", err.message);
    return res
      .status(500)
      .json({ error: "Prediction failed.", details: err.message });
  }
});

module.exports = router;
