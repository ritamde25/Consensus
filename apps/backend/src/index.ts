import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "node:url";

import marketRouter from "./controllers/market.controller";
import orderRoutes from "./controllers/orders.controller";
import portfolioRoutes from "./controllers/portfolio.controller";
import adminRouter from "./controllers/admin.controller";
import { hydrateAllBooks } from "./lib/heapMatchingEngine";

const PORT = Number(process.env.PORT) || 3000;
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);

const app = express();

if (process.env.NODE_ENV !== "production") {
  app.use(cors());
}

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/markets", marketRouter);
app.use("/orders", orderRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/admin", adminRouter);

if (process.env.NODE_ENV === "production") {
  const frontendBuildPath = path.join(repoRoot, "apps/frontend/dist");

  app.use(express.static(frontendBuildPath));

  // Express 5 / path-to-regexp v8 no longer accepts bare "*"
  app.use((_req, res) => {
    res.sendFile(path.join(frontendBuildPath, "index.html"));
  });
}

try {
  await hydrateAllBooks();
} catch (error) {
  console.error("Failed to hydrate order books:", error);
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
