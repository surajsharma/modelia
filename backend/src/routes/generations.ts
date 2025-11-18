import express from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getDb, saveDb } from "../models/db";

const router = express.Router();

const createSchema = z.object({
  prompt: z.string().min(1),
  style: z.string().min(1),
  // imageUpload is base64 or data URL
  imageUpload: z.string().min(1)
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = createSchema.parse(req.body);
    // Simulate 1-2s delay
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

    // 20% overload simulation
    if (Math.random() < 0.2) {
      return res.status(503).json({ message: "Model overloaded" });
    }

    // For simplicity we "store" the uploaded image as a dataURL in DB as image_url (in real app we would store on disk or S3)
    const db = getDb();

    // Insert the generation
    db.run(
      `INSERT INTO generations (user_id, prompt, style, image_url, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [req.userId!, parsed.prompt, parsed.style, parsed.imageUpload, "succeeded"]
    );

    // Get the last inserted row ID
    const idResult = db.exec("SELECT last_insert_rowid() as id");
    const id = idResult[0].values[0][0] as number;

    // Get the created_at timestamp
    const createdAtResult = db.exec(
      "SELECT created_at FROM generations WHERE id = " + id
    );
    const createdAt = createdAtResult[0]?.values[0]?.[0] as string;

    // Save DB to disk
    saveDb();

    res.status(201).json({
      id,
      imageUrl: parsed.imageUpload,
      prompt: parsed.prompt,
      style: parsed.style,
      createdAt,
      status: "succeeded"
    });
  } catch (e: any) {
    if (e.errors) return res.status(400).json({ message: "Invalid input", issues: e.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", requireAuth, (req: AuthRequest, res) => {
  const limit = Math.min(Number(req.query.limit ?? 5), 50);
  const db = getDb();

  const stmt = db.prepare(
    `SELECT id, prompt, style, image_url AS imageUrl, created_at AS createdAt, status 
     FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
  );

  stmt.bind([req.userId!, limit]);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  res.json(rows);
});

export default router;