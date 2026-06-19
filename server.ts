import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse request bodies
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.text({ type: "text/*" }));

  // Unified Server-Side Secure CORS Proxy
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter" });
    }

    try {
      console.log(`[Proxy] [${req.method}] Fetching: ${targetUrl}`);
      
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      // Copy essential headers from the incoming client request
      const reqContentType = req.headers["content-type"];
      if (reqContentType) headers["content-type"] = reqContentType;

      const reqAccept = req.headers["accept"];
      if (reqAccept) headers["accept"] = reqAccept;

      const reqAuth = req.headers["authorization"];
      if (reqAuth) headers["authorization"] = reqAuth as string;

      const reqApiKey = req.headers["x-api-key"] || req.headers["X-API-Key"];
      if (reqApiKey) headers["x-api-key"] = reqApiKey as string;

      const reqElsKey = req.headers["x-els-apikey"] || req.headers["X-ELS-APIKey"];
      if (reqElsKey) headers["X-ELS-APIKey"] = reqElsKey as string;

      // Prepare request body if applicable
      let body: any = undefined;
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        if (reqContentType?.includes("application/x-www-form-urlencoded")) {
          if (typeof req.body === "object") {
            const params = new URLSearchParams();
            Object.entries(req.body).forEach(([k, v]) => params.append(k, String(v)));
            body = params.toString();
          } else {
            body = req.body;
          }
        } else if (reqContentType?.includes("application/json")) {
          body = typeof req.body === "object" ? JSON.stringify(req.body) : req.body;
        } else {
          body = req.body;
        }
      }

      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body
      });

      // Headers forward
      const contentType = response.headers.get("content-type") || "text/plain";
      res.setHeader("Content-Type", contentType);
      
      // Mirror status code safely
      res.status(response.status);

      // Stream the raw array buffer directly back to the client
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error(`[Proxy Error] [${req.method}] ${targetUrl}:`, error);
      return res.status(500).json({ error: `Proxy failed: ${error?.message || error}` });
    }
  });

  // Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Integrate Vite for dev, serve static in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Fallback all other routes to index.html for React SPA Router routing
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
