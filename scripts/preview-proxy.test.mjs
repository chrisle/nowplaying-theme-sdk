import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, get } from "node:http";
import { themePreviewPlugin } from "./vite-plugin-theme-preview.mjs";

test("SDK proxy injects auth without exposing the token and rejects remote callers", async () => {
  const token = "test-development-token-with-32-characters";
  let authorization;
  const upstream = createServer((request, response) => {
    authorization = request.headers.authorization;
    response.writeHead(200, { "Content-Type": "text/event-stream" });
    response.end(
      'event: np-event\ndata: {"type":"np:controller","protocol":1,"controller":null}\n\n',
    );
  });
  await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  let middleware;
  themePreviewPlugin(token, upstream.address().port).configureServer({
    middlewares: {
      use(path, handler) {
        assert.equal(path, "/__np3/events");
        middleware = handler;
      },
    },
  });
  const proxy = createServer((request, response) => {
    request.url = "/";
    middleware(request, response);
  });
  await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${proxy.address().port}/__np3/events`;
  try {
    const response = await fetch(url);
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.equal(authorization, `Bearer ${token}`);
    assert.ok(text.includes('"np:controller"'));
    assert.ok(!text.includes(token));
    assert.equal(
      (await fetch(url, { headers: { Origin: "https://unrelated.example" } }))
        .status,
      403,
    );
    const wrongHost = await new Promise((resolve) =>
      get(url, { headers: { Host: "unrelated.example" } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      }),
    );
    assert.equal(wrongHost, 403);
  } finally {
    await Promise.all([
      new Promise((resolve) => proxy.close(resolve)),
      new Promise((resolve) => upstream.close(resolve)),
    ]);
  }
});
