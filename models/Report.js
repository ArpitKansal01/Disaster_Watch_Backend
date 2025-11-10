const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  imageUrl: { type: String }, // optional if storing image path
  note: { type: String },
  location: { type: String },
  prediction: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);
