const transporter = require("../config/mailer");

const sendReportStatusMail = async ({ to, name, report }) => {
  const {
    _id,
    classify,
    severity,
    status,
    imageUrl,
    location,
    createdAt,
    verificationNote,
  } = report;

  const statusMap = {
    verified: "✅ VERIFIED by authorities",
    false: "❌ MARKED AS FALSE",
    responding: "🚑 RESPONSE DISPATCHED",
    resolved: "🏁 ISSUE RESOLVED",
  };

  await transporter.sendMail({
    from: `"Disaster Response System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Update on Your Disaster Report",
    html: `
      <p>Hi <strong>${name}</strong>,</p>

      <p>Your disaster report has been updated:</p>

      <hr />

      <p><strong>Status:</strong> ${statusMap[status] || status}</p>
      <p><strong>Reported On:</strong> ${new Date(createdAt).toLocaleString()}</p>

      ${location ? `<p><strong>Location:</strong> ${location}</p>` : ""}

      <p><strong>AI Classification:</strong> ${classify}</p>
      <p><strong>Severity Level:</strong> ${severity}</p>

      ${
        imageUrl
          ? `<p><strong>Image Evidence:</strong><br/>
             <a href="${imageUrl}" target="_blank">View Uploaded Image</a></p>`
          : ""
      }

      ${
        verificationNote
          ? `<p><strong>Authority Note:</strong> ${verificationNote}</p>`
          : ""
      }

      <hr />

      <p>
        Thank you for reporting responsibly.  
        Your contribution helps authorities respond faster.
      </p>

      <p><strong>Disaster Response Team</strong></p>
    `,
  });
};

module.exports = sendReportStatusMail;
