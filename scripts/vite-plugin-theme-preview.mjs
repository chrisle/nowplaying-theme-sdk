import { request as httpRequest } from "node:http";

/** A same-origin proxy keeps the development token out of theme/browser code. */
export function themePreviewPlugin(token, port = 17831) {
  return {
    name: "np3-theme-preview",
    configureServer(server) {
      server.middlewares.use("/__np3/events", (request, response) => {
        const host = request.headers.host ?? "";
        if (
          !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ||
          (request.headers.origin &&
            request.headers.origin !== `http://${host}`)
        ) {
          response.writeHead(403).end();
          return;
        }
        if (request.method !== "GET" || request.url !== "/") {
          response.writeHead(404).end();
          return;
        }
        if (!token || token.length < 32) {
          response
            .writeHead(503, { "Content-Type": "text/plain" })
            .end("Set NP_THEME_DEV_TOKEN in .env.local and restart the SDK.");
          return;
        }
        const upstream = httpRequest(
          {
            hostname: "127.0.0.1",
            port,
            path: "/events",
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          },
          (source) => {
            response.writeHead(source.statusCode ?? 502, {
              "Content-Type": source.headers["content-type"] ?? "text/plain",
              "Cache-Control": "no-store",
              "X-Accel-Buffering": "no",
            });
            source.pipe(response);
            source.on("error", () => response.destroy());
          },
        );
        upstream.on("error", () => {
          if (!response.headersSent)
            response
              .writeHead(503)
              .end("Start Now Playing with the same development token.");
          else response.destroy();
        });
        response.on("close", () => upstream.destroy());
        upstream.end();
      });
    },
  };
}
