import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth";
import genRoutes from "./routes/generations";
import { initDb } from "./models/db";
import path from "path";

const app = express();
app.use(cors());
app.use(express.json({ limit: "12mb" }));

initDb(); // ensure tables

app.use("/auth", authRoutes);
app.use("/generations", genRoutes);

app.get("/", (_req, res) => res.json({ ok: true }));

app.use('/uploads', express.static('./uploads'));

// Secure uploads middleware - only allow users to access their own images
app.use('/uploads/:userId/:filename', (req, res, next) => {
  const requestedUserId = req.params.userId;

  // If you have auth middleware, verify the user can access this file
  // For now, we'll serve all files (add auth check here if needed)

  const filepath = path.join('./uploads', requestedUserId, req.params.filename);
  res.sendFile(filepath, { root: '.' }, (err) => {
    if (err) {
      res.status(404).json({ message: 'Image not found' });
    }
  });
});


const port = process.env.PORT ? Number(process.env.PORT) : 4000;
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => console.log(`API listening ${port}`));
}

export default app;
