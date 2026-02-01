const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    imageUrl: { type: String },
    note: { type: String },
    location: { type: String },
    classify: { type: String },
    severity: { type: String },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "submitted",
        "pending",
        "verified",
        "false",
        "responding",
        "resolved",
      ],
      default: "pending",
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verificationNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Report", reportSchema);
