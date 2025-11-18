import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getDb, saveDb } from "../models/db";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/signup", async (req, res) => {
  try {
    const parsed = signupSchema.parse(req.body);
    const db = getDb();

    const stmt = db.prepare("SELECT id FROM users WHERE email = ?");
    stmt.bind([parsed.email]);
    const exists = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (exists) return res.status(409).json({ message: "Email already exists" });

    const hash = await bcrypt.hash(parsed.password, 10);

    const insert = db.prepare(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)"
    );
    insert.bind([parsed.email, hash]);
    insert.step();
    insert.free();

    saveDb();

    const idStmt = db.prepare("SELECT last_insert_rowid() as id");
    idStmt.step();
    const { id: userId } = idStmt.getAsObject();
    idStmt.free();

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token });
  } catch (e: any) {
    if (e.errors)
      return res.status(400).json({ message: "Invalid input", issues: e.errors });
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const db = getDb();

    const stmt = db.prepare("SELECT id, password_hash FROM users WHERE email = ?");
    stmt.bind([parsed.email]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();

    if (!row) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(parsed.password, row.password_hash as string);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ userId: row.id }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ token });
  } catch (e: any) {
    if (e.errors)
      return res.status(400).json({ message: "Invalid input", issues: e.errors });
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
