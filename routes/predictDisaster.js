const express = require("express");
const multer = require("multer");
const axios = require("axios");
const FormData = require("form-data"); // Node.js FormData
const cloudinary = require("../config/cloudinary");
const Report = require("../models/Report");
const User = require("../models/user");
const router = express.Router();
const upload = multer(); // for parsing multipart/form-data
const transporter = require("../config/mailer");
const auth = require("../middlewares/auth");
const geminiVerifyDisaster = require("../utils/geminiVerify");
const { predictLimiter } = require("../middlewares/rateLimiter");

router.post(
  "/predict",
  auth("user"),
  predictLimiter, // ✅ add here
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      // 2️⃣ Call disaster severity API
      const formDataSeverity = new FormData();
      formDataSeverity.append("file", file.buffer, {
        filename: file.originalname,
      });
      const severityRes = await axios.post(
        `${process.env.AI_SERVICE_URL}/predict`,
        formDataSeverity,
        {
          headers: {
            ...formDataSeverity.getHeaders(),
          },
          timeout: 30000, // optional but recommended
        },
      );

      if (!severityRes.data) {
        return res.status(500).json({
          error: "AI service unavailable",
        });
      }
      const { predicted_disaster, predicted_severity } = severityRes.data;

      const nonDisasterClasses = [
        "damaged_buildings",
        "fallen_trees",
        "fire",
        "flood",
        "landslide",
      ];
      let isNoDisaster;
      if (!nonDisasterClasses.includes(predicted_disaster)) {
        isNoDisaster = true;
      }
      if (
        predicted_severity == "no_damage" ||
        predicted_severity == "uncertain"
      ) {
        isNoDisaster = true;
      }
      const message = isNoDisaster
        ? "NO DISASTER DETECTED"
        : predicted_disaster;

      const severity = isNoDisaster
        ? "NO SEVERITY DETECTED"
        : predicted_severity;

      if (isNoDisaster) {
        return res.json({
          message,
          severity,
          saved: false,
          reason: "No disaster detected, image not uploaded.",
          data: severityRes.data,
        });
      }

      const note = req.body.note?.trim() || "";
      const location = req.body.location?.trim() || "";

      /* -------------------- DUPLICATE CHECK -------------------- */
      const DUPLICATE_TIME_WINDOW_MINUTES = 60;

      const timeThreshold = new Date(
        Date.now() - DUPLICATE_TIME_WINDOW_MINUTES * 60 * 1000,
      );
      const normalizeLocation = (location = "") =>
        location.toLowerCase().replace(/\s+/g, " ").trim();

      const normalizedLocation = normalizeLocation(location);

      const duplicate = await Report.findOne({
        classify: message,
        severity: severity,
        status: { $ne: "false" }, // ignore rejected reports
        createdAt: { $gte: timeThreshold },
      }).lean();

      let isDuplicate = false;

      if (duplicate) {
        const existingLocation = normalizeLocation(duplicate.location);

        // loose location match (same area / city)
        if (
          existingLocation.includes(normalizedLocation) ||
          normalizedLocation.includes(existingLocation)
        ) {
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        return res.json({
          message: "Duplicate Report",
          severity: severity,
          saved: false,
          info: "A similar disaster was recently reported in this area. Authorities are already reviewing it.",
        });
      }

      // Gemini verification
      let geminiPrediction = null;

      try {
        geminiPrediction = await geminiVerifyDisaster(
          req.file.buffer,
          req.file.mimetype,
        );
      } catch (error) {
        console.log("Gemini quota exceeded or unavailable");
      }

      const geminiResult = geminiPrediction?.toLowerCase().trim();
      const modelPrediction = predicted_disaster.toLowerCase().trim();

      if (!geminiResult) {
        console.log("Using primary model only");
      } else if (geminiResult !== modelPrediction) {
        return res.json({
          message: "Not a Disaster",
          severity: "NO SEVERITY DETECTED",
          saved: false,
          reason: "No disaster detected, image not uploaded.",
          data: severityRes.data,
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
      const report = await Report.create({
        classify: message,
        severity: severity,
        note,
        location,
        imageUrl,
        reportedBy: req.user.id,
        status: "pending",
      });

      const io = req.app.get("io");

      io.emit("reportCreated", report);

      const detectedTag = message;
      const summary = note || "No additional notes provided";
      const address = location || "Location not specified";
      const date = new Date();

      setImmediate(async () => {
        try {
          const organizationUsers = await User.find(
            { role: "organization" },
            { email: 1, _id: 0 },
          );

          const emails = organizationUsers.map((u) => u.email).filter(Boolean);
          if (!emails.length) return;

          const reportedAt = new Date().toLocaleString();

          await transporter.sendMail({
            from: `"Disaster-Watch" <${process.env.EMAIL_USER}>`,
            bcc: emails,
            subject: "⚠️ Disaster Report Pending Verification",
            html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: #d32f2f;">🚨 New Disaster Report Submitted</h2>

          <p>
            A <strong>new disaster report</strong> has been submitted and is
            <strong>pending verification</strong> by authorities.
          </p>

          <table style="border-collapse: collapse;">
            <tr>
              <td><strong>Category:</strong></td>
              <td>${message}</td>
            </tr>
            <tr>
              <td><strong>Severity:</strong></td>
              <td>${severity}</td>
            </tr>
            <tr>
              <td><strong>Location:</strong></td>
              <td>${location || "N/A"}</td>
            </tr>
            <tr>
              <td><strong>Reported At:</strong></td>
              <td>${reportedAt}</td>
            </tr>
          </table>

          <p><strong>Additional Notes:</strong></p>
          <p>${note || "No additional notes provided."}</p>

          <hr />

          <p>
            Please log in to the <strong>Disaster-Watch Government Dashboard</strong>
            to review the report, verify the attached image, and take necessary action.
          </p>

          <p style="font-size: 12px; color: #666;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      `,
          });
          console.log("New Report Mail Send to: ", emails);
        } catch (mailErr) {
          console.error("Organization mail error:", mailErr);
        }
      });
      // ✅ Step 5: Return success response
      return res.json({
        message,
        severity,
        saved: true,
        status: "pending",
        info: "Your report has been submitted and is under verification by authorities.",
        reportId: report.id,
      });
    } catch (error) {
      console.error("Error predicting disaster/severity:", error);
      res
        .status(500)
        .json({ error: "Prediction failed", details: error.message });
    }
  },
);

module.exports = router;
