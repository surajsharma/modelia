import express from "express";
import cors from "cors";
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import authRoutes from "./routes/auth";
import genRoutes from "./routes/generations";
import { initDb } from "./models/db";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json({ limit: "12mb" }));

// Swagger documentation
const swaggerDocument = YAML.load('./OPENAPI.yaml');
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

(async () => {
  await initDb();

  app.use("/auth", authRoutes);
  app.use("/generations", genRoutes);
  app.get("/", (_req, res) => res.json({ ok: true }));
  app.use('/uploads', express.static('./uploads'));
  app.use('/uploads/:userId/:filename', (req, res, next) => {
    const requestedUserId = req.params.userId;
    const filepath = path.join('./uploads', requestedUserId, req.params.filename);
    res.sendFile(filepath, { root: '.' }, (err) => {
      if (err) {
        res.status(404).json({ message: 'Image not found' });
      }
    });
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  if (process.env.NODE_ENV !== "test") {
    app.listen(port, () => {
      console.log(`API listening ${port}`);
      console.log(`API docs available at http://localhost:${port}/api-docs`);
    });
  }
})();

export default app;