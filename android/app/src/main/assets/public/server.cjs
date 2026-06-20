var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.use(import_express.default.urlencoded({ extended: true }));
  app.use(import_express.default.text({ type: "text/*" }));
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).json({ error: "Missing 'url' query parameter" });
    }
    try {
      console.log(`[Proxy] [${req.method}] Fetching: ${targetUrl}`);
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };
      const reqContentType = req.headers["content-type"];
      if (reqContentType) headers["content-type"] = reqContentType;
      const reqAccept = req.headers["accept"];
      if (reqAccept) headers["accept"] = reqAccept;
      const reqAuth = req.headers["authorization"];
      if (reqAuth) headers["authorization"] = reqAuth;
      const reqApiKey = req.headers["x-api-key"] || req.headers["X-API-Key"];
      if (reqApiKey) headers["x-api-key"] = reqApiKey;
      const reqElsKey = req.headers["x-els-apikey"] || req.headers["X-ELS-APIKey"];
      if (reqElsKey) headers["X-ELS-APIKey"] = reqElsKey;
      let body = void 0;
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
      const contentType = response.headers.get("content-type") || "text/plain";
      res.setHeader("Content-Type", contentType);
      res.status(response.status);
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    } catch (error) {
      console.error(`[Proxy Error] [${req.method}] ${targetUrl}:`, error);
      return res.status(500).json({ error: `Proxy failed: ${error?.message || error}` });
    }
  });
  app.get("/api/html-iframe-proxy", async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
      return res.status(400).send("Missing 'url' query parameter");
    }
    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        }
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        const arrayBuffer = await response.arrayBuffer();
        res.setHeader("Content-Type", contentType);
        return res.send(Buffer.from(arrayBuffer));
      }
      let html = await response.text();
      const originMatch = targetUrl.match(/^https?:\/\/[^\/]+/);
      if (originMatch) {
        const baseHref = new URL(targetUrl).href;
        const baseTag = `<base href="${baseHref}">`;
        if (html.includes("<head>")) {
          html = html.replace("<head>", `<head>
${baseTag}`);
        } else {
          html = baseTag + "\n" + html;
        }
      }
      res.setHeader("Content-Type", "text/html");
      res.status(response.status).send(html);
    } catch (error) {
      console.error(`[HTML Proxy Error] ${targetUrl}:`, error);
      res.status(500).send(`Failed to load page: ${error.message}`);
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
