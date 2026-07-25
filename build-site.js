const fs = require("fs");
const path = require("path");

const root = __dirname;
const html = fs.readFileSync(path.join(root, "outputs", "index.html"), "utf8");
const outDir = path.join(root, "dist", "server");

const worker = `const INDEX_HTML = ${JSON.stringify(html)};

function jsonResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

async function proxyYahooChart(url) {
  const symbol = (url.searchParams.get("symbol") || "").trim();
  const range = url.searchParams.get("range") || "1d";
  const interval = url.searchParams.get("interval") || "1m";
  const includePrePost = url.searchParams.get("includePrePost") || "true";

  if (!symbol) {
    return jsonResponse(JSON.stringify({ error: "Missing symbol" }), 400);
  }

  const yahooUrl = new URL(
    "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(symbol)
  );
  yahooUrl.searchParams.set("range", range);
  yahooUrl.searchParams.set("interval", interval);
  yahooUrl.searchParams.set("includePrePost", includePrePost);
  yahooUrl.searchParams.set("_", String(Date.now()));

  try {
    const response = await fetch(yahooUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 InvestQuest/1.0",
        "Accept": "application/json"
      }
    });
    return jsonResponse(await response.text(), response.status);
  } catch {
    return jsonResponse(JSON.stringify({ error: "Yahoo chart request failed" }), 504);
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/api/chart") {
      return proxyYahooChart(url);
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(INDEX_HTML, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
};
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.js"), worker);
console.log("Built dist/server/index.js");
