import react from "@vitejs/plugin-react";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Connect, type PreviewServer, type ViteDevServer } from "vite";
import { handleChat } from "./server/chat";

function attach(middlewares: Connect.Server): void {
  middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
    const url = req.url?.split("?")[0] ?? "";
    if (url !== "/api/chat") return next();
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.end("Method not allowed");
      return;
    }
    try {
      await handleChat(req, res);
    } catch (err) {
      console.error(err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Something went wrong on the app side." }));
      } else {
        res.end();
      }
    }
  });
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "beside-api",
      configureServer(server: ViteDevServer) {
        attach(server.middlewares);
      },
      configurePreviewServer(server: PreviewServer) {
        attach(server.middlewares);
      },
    },
  ],
});
