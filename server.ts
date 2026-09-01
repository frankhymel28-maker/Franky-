import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import nodemailer from "nodemailer";
import { initDb, handleSync, clearAllDb, getWholeDbState } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize SQLite database
  initDb();

  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

  app.use(express.json({ limit: "50mb" })); // Support large payload for syncing scanned documents / signature data URLs
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API routes ---
  app.get("/api/state", (req, res) => {
    try {
      const state = getWholeDbState();
      res.json({ success: true, ...state });
    } catch (error) {
      console.error("Failed to load state", error);
      res.status(500).json({ success: false, message: "Failed to load state from database" });
    }
  });

  app.post("/api/sync", (req, res) => {
    try {
      const mergedPayload = handleSync(req.body);
      console.log(`[SQLITE] Synced ${req.body.materials?.length || 0} materials, ${req.body.spools?.length || 0} spools, ${req.body.manifests?.length || 0} manifests. Database total: ${mergedPayload.materials.length} materials, ${mergedPayload.spools.length} spools, ${mergedPayload.manifests.length} manifests.`);
      res.json({ success: true, ...mergedPayload });
    } catch (error) {
      console.error("Sync failed", error);
      res.status(500).json({ success: false, message: "Server database sync failed" });
    }
  });

  app.post("/api/clear-db", (req, res) => {
    try {
      clearAllDb();
      res.json({ success: true, message: "Server-side SQLite database cleared" });
    } catch (error) {
      console.error("Clear database failed", error);
      res.status(500).json({ success: false, message: "Failed to clear server database" });
    }
  });
  app.post("/api/send-manifest", async (req, res) => {
    const { emails, manifestId } = req.body; // Expecting array
    console.log(`[PROTOTYPE] Sending manifest ${manifestId} to ${emails.join(', ')}`);

    try {
        if (!process.env.SMTP_HOST) {
            console.log(`[PROTOTYPE] Mock sending manifest ${manifestId} to ${emails.join(', ')} (SMTP_HOST not configured)`);
            res.json({ success: true, message: "Emails sent (simulated)" });
            return;
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: emails.join(', '),
            subject: `Manifest ${manifestId} Signed`,
            text: `The manifest ${manifestId} has been signed and approved.`,
            html: `<p>The manifest <strong>${manifestId}</strong> has been signed and approved.</p>`,
        });

        res.json({ success: true, message: "Emails sent successfully" });
    } catch (error) {
        console.error("Email send failed", error);
        res.status(500).json({ success: false, message: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
