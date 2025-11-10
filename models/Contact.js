const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    orgName: { type: String, required: true },
    orgType: { type: String },
    website: { type: String, required: true },
    regNumber: { type: String },
    yearEstablished: { type: Number },
    email: { type: String, required: true },
    phone: { type: String },
    contactPerson: { type: String, required: true },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    purpose: { type: String },
    achievements: { type: String },
    teamSize: { type: Number },
    registrationFile: { type: String }, // store filename or URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);
