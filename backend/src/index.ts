import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import generationRoutes from "./routes/generations";
import { initDb } from "./models/db";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "AI Studio Backend" });
});

// Routes
app.use("/auth", authRoutes);
app.use("/generations", generationRoutes);

const PORT = Number(process.env.PORT || 4000);
const HOST = process.env.HOST || '0.0.0.0';

// Initialize database before starting server
async function start() {
  try {
    console.log("🚀 Starting AI Studio Backend...");
    console.log("📍 Environment:", {
      NODE_ENV: process.env.NODE_ENV,
      PORT,
      HOST,
      DB_PATH: process.env.DB_PATH,
    });

    await initDb();

    app.listen(PORT, HOST, () => {
      console.log(`✅ Backend running on http://${HOST}:${PORT}`);
      console.log(`📡 Ready to accept connections`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();