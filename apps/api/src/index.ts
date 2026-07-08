import "dotenv/config"; // laadt apps/api/.env in dev; in prod komen vars uit de omgeving
import express from "express";
import cors from "cors";
import { api } from "./routes/api.js";
import { isConfigured } from "./lib/db.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);

// CORS: sta de frontend-origin toe (Bearer-token, geen cookies).
const origins = (process.env.WEB_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "5mb" })); // handtekeningen (PNG data-URL) kunnen groter zijn

app.get("/health", (_req, res) => {
  res.json({ ok: true, db: isConfigured() });
});

app.use("/api", api);

// Foutafhandeling
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "serverfout" });
});

app.listen(PORT, () => {
  console.log(`API luistert op poort ${PORT}`);
});
