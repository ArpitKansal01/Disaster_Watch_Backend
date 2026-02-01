const express = require("express");
const multer = require("multer");
const Contact = require("../models/Contact");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const transporter = require("../config/mailer"); // ✅ import mailer
require("dotenv").config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (temporary storage + file filter)
const upload = multer({
  dest: "temp/",
  fileFilter: (req, file, cb) => {
    if (
      !["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype)
    ) {
      return cb(new Error("Only PDF, JPG, or PNG files are allowed"));
    }
    cb(null, true);
  },
});

// POST /api/contact
router.post("/", upload.single("registrationFile"), async (req, res) => {
  try {
    const contactData = req.body;

    if (req.file) {
      // Determine resource type
      const isPDF = req.file.mimetype === "application/pdf";
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "contacts", // PDF = raw, images = auto
        use_filename: true,
        unique_filename: false, // Optional: keep original filename
      });
      console.log(result.url);

      // Store the secure URL returned by Cloudinary
      contactData.registrationFile = result.url;

      // Delete temp file
      fs.unlinkSync(req.file.path);

      const contact = new Contact(contactData);
      await contact.save();
      await transporter.sendMail({
        from: `"Disaster Platform" <${process.env.EMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: "New Organization Contact Submission",
        html: `
        <h2>New Organization Registered</h2>
        <p><strong>Organization:</strong> ${contact.orgName}</p>
        <p><strong>Type:</strong> ${contact.orgType || "N/A"}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Website:</strong> ${contact.website}</p>
        <p><strong>Contact Person:</strong> ${contact.contactPerson}</p>
        <p><strong>Phone:</strong> ${contact.phone || "N/A"}</p>
        <p><strong>Purpose:</strong> ${contact.purpose || "N/A"}</p>
        ${
          contact.registrationFile
            ? `<p><a href="${contact.registrationFile}" target="_blank">View Registration Document</a></p>`
            : ""
        }
      `,
      });
      res.status(201).json({ message: "Contact form submitted", contact });
    }
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// GET all contacts
router.get("/", async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
