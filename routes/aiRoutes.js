const express = require("express");
const { summarizeTranslate } = require("../controllers/summarizeTranslate");

const router = express.Router();

router.post("/summarize-translate", summarizeTranslate);

module.exports = router;
