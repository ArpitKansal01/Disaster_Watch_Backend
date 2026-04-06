const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const contactRoute = require("./routes/contact");
const authRoutes = require("./routes/auth");
const prediction = require("./routes/predictImage");
const severity = require("./routes/predictDisaster");
const reportRoutes = require("./routes/reportRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.set("trust proxy", 1);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// ✅ Handle connection
io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

// ✅ Make io accessible in routes
app.set("io", io);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

app.use("/api/auth", authRoutes);
app.use("/api/contact", contactRoute);
app.use("/api/classify", prediction);
app.use("/api/severity", severity);
app.use("/api/reports", reportRoutes);
app.use("/api/ai", aiRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
