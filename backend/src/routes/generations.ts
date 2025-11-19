import express from "express";
import { z } from "zod";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { getDb, saveDb } from "../models/db";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const router = express.Router();

// Ensure uploads directory exists
const UPLOADS_DIR = "./uploads";
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Image processing config
const MAX_WIDTH = 1920;
const JPEG_QUALITY = 90;

const createSchema = z.object({
  prompt: z.string().min(1),
  style: z.string().min(1),
  imageUpload: z.string().min(1)
});

/**
 * Save base64/dataURL to disk with automatic resizing
 * Returns: "userId/filename.ext" (relative path, no /uploads prefix)
 */
async function saveImageToDisk(dataUrl: string, userId: number): Promise<string> {
  console.log("Saving image for user:", userId);

  const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

  if (!matches || matches.length !== 3) {
    console.error("Invalid data URL format");
    throw new Error("Invalid data URL format");
  }

  const mimeType = matches[1];
  const base64Data = matches[2];

  const inputBuffer = Buffer.from(base64Data, 'base64');

  const userDir = path.join(UPLOADS_DIR, userId.toString());
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  let ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  let finalBuffer: Buffer = inputBuffer; // Add explicit Buffer type
  let processed = false;

  try {
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(inputBuffer).metadata();

    console.log(`Original: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

    const MAX_WIDTH = 1920;
    let processedImage = sharp(inputBuffer);

    // Resize if needed
    if (metadata.width && metadata.width > MAX_WIDTH) {
      console.log(`Resizing from ${metadata.width}px to ${MAX_WIDTH}px width`);
      processedImage = processedImage.resize(MAX_WIDTH, null, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert to JPEG
    finalBuffer = await processedImage
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    ext = 'jpg';
    processed = true;

    const reduction = ((1 - finalBuffer.length / inputBuffer.length) * 100).toFixed(1);
    console.log(`Processed: ${(finalBuffer.length / 1024).toFixed(1)}KB (${reduction}% reduction)`);
  } catch (error) {
    console.warn('Sharp processing failed, saving original:', error instanceof Error ? error.message : error);
    // Use original buffer as fallback
    finalBuffer = inputBuffer;
    processed = false;
  }

  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(userDir, filename);

  fs.writeFileSync(filepath, finalBuffer);

  if (processed) {
    console.log(`Image saved (processed): ${filepath}`);
  } else {
    console.log(`Image saved (original, no processing): ${filepath}`);
  }

  return `${userId}/${filename}`;
}

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  let imagePath: string | null = null;

  try {
    console.log("POST /generations - User ID:", req.userId);

    const parsed = createSchema.parse(req.body);

    // Simulate 1-2s delay
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 1000));

    // 20% overload simulation
    if (Math.random() < 0.2) {
      return res.status(503).json({ message: "Model overloaded" });
    }

    // Save and resize image to disk
    imagePath = await saveImageToDisk(parsed.imageUpload, req.userId!);
    console.log("Image path to store in DB:", imagePath);

    const db = getDb();

    // Store ONLY "userId/filename" in database (no /uploads prefix)
    const insertStmt = db.prepare(
      `INSERT INTO generations (user_id, prompt, style, image_url, status) 
       VALUES (?, ?, ?, ?, ?)`
    );

    insertStmt.bind([req.userId!, parsed.prompt, parsed.style, imagePath, "succeeded"]);
    insertStmt.step();
    insertStmt.free();

    // Get the last inserted row ID
    const idStmt = db.prepare("SELECT last_insert_rowid() as id");
    idStmt.step();
    const id = idStmt.getAsObject().id as number;
    idStmt.free();

    // Get the created_at timestamp
    const recordStmt = db.prepare(
      "SELECT created_at FROM generations WHERE id = ?"
    );
    recordStmt.bind([id]);
    recordStmt.step();
    const createdAt = recordStmt.getAsObject().created_at;
    recordStmt.free();

    // Save DB to disk
    saveDb();

    console.log("Generation created successfully:", id);
    console.log("Stored image_url in DB:", imagePath);

    res.status(201).json({
      id,
      imageUrl: `/uploads/${imagePath}`, // Add /uploads prefix for client
      prompt: parsed.prompt,
      style: parsed.style,
      createdAt,
      status: "succeeded"
    });
  } catch (e: any) {
    console.error("Error in POST /generations:", e);

    // Cleanup orphaned image file
    if (imagePath) {
      try {
        const filepath = path.join(UPLOADS_DIR, imagePath);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
          console.log("Cleaned up orphaned image file");
        }
      } catch (cleanupError) {
        console.error("Error cleaning up image:", cleanupError);
      }
    }

    if (e.errors) return res.status(400).json({ message: "Invalid input", issues: e.errors });
    res.status(500).json({ message: e.message || "Server error" });
  }
});

router.get("/", requireAuth, (req: AuthRequest, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 5), 50);
    const db = getDb();

    const stmt = db.prepare(
      `SELECT id, prompt, style, image_url, created_at, status 
       FROM generations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    );

    stmt.bind([req.userId!, limit]);

    const rows = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();

      // Get image_url from DB (should be "userId/filename")
      let imageUrlFromDb = row.image_url as string;

      // Normalize: remove /uploads prefix if it exists (for old data)
      imageUrlFromDb = imageUrlFromDb.replace(/^\/uploads\//, '');

      // Verify the file exists on disk
      const filepath = path.join(UPLOADS_DIR, imageUrlFromDb);
      const fileExists = fs.existsSync(filepath);

      if (!fileExists) {
        console.warn(`Image file not found: ${filepath} for record ${row.id}`);
      }

      console.log(`Record ${row.id}: DB value="${row.image_url}", Normalized="${imageUrlFromDb}", File exists=${fileExists}`);

      rows.push({
        id: row.id,
        prompt: row.prompt,
        style: row.style,
        imageUrl: fileExists ? `/uploads/${imageUrlFromDb}` : null, // Add /uploads prefix for client
        createdAt: row.created_at,
        status: row.status
      });
    }
    stmt.free();

    console.log(`Returning ${rows.length} generations for user ${req.userId}`);
    res.json(rows);
  } catch (e: any) {
    console.error("Error in GET /generations:", e);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;