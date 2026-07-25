const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const indexPath = path.join(root, "outputs", "index.html");
const port = Number(process.env.PORT || 8787);

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

async function proxyYahooChart(req, res, url) {
  const symbol = (url.searchParams.get("symbol") || "").trim();
  const range = url.searchParams.get("range") || "1d";
  const interval = url.searchParams.get("interval") || "1m";
  const includePrePost = url.searchParams.get("includePrePost") || "true";

  if (!symbol) {
    send(res, 400, JSON.stringify({ error: "Missing symbol" }), "application/json; charset=utf-8");
    return;
  }

  const yahooUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
  yahooUrl.searchParams.set("range", range);
  yahooUrl.searchParams.set("interval", interval);
  yahooUrl.searchParams.set("includePrePost", includePrePost);
  yahooUrl.searchParams.set("_", String(Date.now()));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(yahooUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 InvestQuest/1.0",
        "Accept": "application/json"
      }
    });
    const text = await response.text();
    send(res, response.status, text, "application/json; charset=utf-8");
  } catch (error) {
    send(res, 504, JSON.stringify({ error: "Yahoo chart request timed out" }), "application/json; charset=utf-8");
  } finally {
    clearTimeout(timeout);
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/chart") {
    proxyYahooChart(req, res, url);
    return;
  }

  if (url.pathname === "/" || url.pathname === "/index.html") {
    fs.readFile(indexPath, "utf8", (error, html) => {
      if (error) {
        send(res, 500, "Could not load Invest Quest.");
        return;
      }
      send(res, 200, html, "text/html; charset=utf-8");
    });
    return;
  }

  send(res, 404, "Not found");
});

server.listen(port, () => {
  console.log(`Invest Quest running at http://localhost:${port}`);
});
