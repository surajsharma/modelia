import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import genRoutes from "./routes/generations";
import { initDb } from "./models/db";

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

initDb(); // ensure tables

app.use("/auth", authRoutes);
app.use("/generations", genRoutes);

app.get("/", (_req, res) => res.json({ ok: true }));

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`API listening ${port}`));
}

export default app;
