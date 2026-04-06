const express = require("express");
const Report = require("../models/Report");
const sendReportStatusMail = require("../utils/reportMailer");
const auth = require("../middlewares/auth");
const User = require("../models/user");
const router = express.Router();

/* =====================================================
   1️⃣ GOVERNMENT / ADMIN → GET ALL REPORTS
   ===================================================== */
router.get("/all", auth("organization"), async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("reportedBy", "name email")
      .populate("verifiedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("Error fetching all reports:", err);
    res.status(500).json({ message: "Failed to fetch reports" });
  }
});

/* =====================================================
   2️⃣ GOVERNMENT → GET PENDING REPORTS (HUMAN-IN-LOOP)
   ===================================================== */
router.get("/pending", auth("organization"), async (req, res) => {
  try {
    const reports = await Report.find({ status: "pending" })
      .populate("reportedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("Error fetching pending reports:", err);
    res.status(500).json({ message: "Failed to fetch pending reports" });
  }
});

/* =====================================================
   3️⃣ CITIZEN → GET MY REPORTS (END SILENCE)
   ===================================================== */
router.get("/my-reports", auth("user"), async (req, res) => {
  try {
    const reports = await Report.find({ reportedBy: req.user.id })
      .select("imageUrl classify severity status createdAt")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    console.error("Error fetching my reports:", err);
    res.status(500).json({ message: "Failed to fetch your reports" });
  }
});

router.post("/:id/verify", auth("organization"), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate(
      "reportedBy",
      "name email",
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.status !== "pending") {
      return res.status(400).json({
        message: "Only pending reports can be verified",
      });
    }

    report.status = "verified";
    report.verifiedBy = req.user.id;
    report.verificationNote = req.body.note || "Verified by authority";

    await report.save();

    const io = req.app.get("io");
    io.emit("reportUpdated", report);

    // 📧 SEND FULL REPORT DATA
    await sendReportStatusMail({
      to: report.reportedBy.email,
      name: report.reportedBy.name,
      report, // 👈 FULL OBJECT
    });

    res.json({ message: "Report verified successfully" });
  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

router.post("/:id/false", auth("organization"), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate(
      "reportedBy",
      "name email",
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.status !== "pending") {
      return res.status(400).json({
        message: "Only pending reports can be rejected",
      });
    }

    report.status = "false";
    report.verifiedBy = req.user.id;
    report.verificationNote = req.body.note || "Marked as false report";

    await report.save();

    const io = req.app.get("io");
    io.emit("reportUpdated", report);

    // 🔥 Increment false report count
    const user = await User.findById(report.reportedBy._id);

    user.falseReportsCount += 1;

    // 🚫 Block user if count >= 3
    if (user.falseReportsCount >= 3) {
      user.isBlocked = true;
    }

    await user.save();
    await sendReportStatusMail({
      to: report.reportedBy.email,
      name: report.reportedBy.name,
      report,
    });

    res.json({ message: "Report rejected successfully" });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ message: "Rejection failed" });
  }
});

router.post("/:id/respond", auth("organization"), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate(
      "reportedBy",
      "name email",
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.status !== "verified") {
      return res.status(400).json({
        message: "Only verified reports can be responded to",
      });
    }

    report.status = "responding";
    await report.save();
    const io = req.app.get("io");
    io.emit("reportUpdated", report);
    await sendReportStatusMail({
      to: report.reportedBy.email,
      name: report.reportedBy.name,
      report,
    });

    res.json({ message: "Response dispatched" });
  } catch (err) {
    console.error("Respond error:", err);
    res.status(500).json({ message: "Failed to dispatch response" });
  }
});

router.post("/:id/resolve", auth("organization"), async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate(
      "reportedBy",
      "name email",
    );

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (report.status !== "responding") {
      return res.status(400).json({
        message: "Only responding reports can be resolved",
      });
    }

    report.status = "resolved";
    await report.save();
    const io = req.app.get("io");
    io.emit("reportUpdated", report);
    await sendReportStatusMail({
      to: report.reportedBy.email,
      name: report.reportedBy.name,
      report,
    });

    res.json({ message: "Report marked as resolved" });
  } catch (err) {
    console.error("Resolve error:", err);
    res.status(500).json({ message: "Resolution failed" });
  }
});

module.exports = router;
