import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distDir = path.join(root, "dist");
const distAssetsDir = path.join(distDir, "assets");
const appDir = path.join(root, "app");
const appAssetsDir = path.join(appDir, "assets");

if (!fs.existsSync(distDir)) {
  console.error("dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

fs.mkdirSync(appAssetsDir, { recursive: true });

for (const f of fs.readdirSync(appAssetsDir)) {
  fs.rmSync(path.join(appAssetsDir, f), { recursive: true, force: true });
}

for (const f of fs.readdirSync(distAssetsDir)) {
  fs.cpSync(
    path.join(distAssetsDir, f),
    path.join(appAssetsDir, f),
    { recursive: true }
  );
}

const distIndex = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
const jsMatch = distIndex.match(/src="\.\/assets\/([^"]+\.js)"/);
const cssMatch = distIndex.match(/href="\.\/assets\/([^"]+\.css)"/);

if (!jsMatch) {
  console.error("Could not find JS bundle in dist/index.html");
  process.exit(1);
}

const jsFile = jsMatch[1];
const cssFile = cssMatch?.[1];

const widgetHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Roof Worx — Time Entry</title>
    <script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
${cssFile ? `    <link rel="stylesheet" href="./assets/${cssFile}" />\n` : ""}  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./assets/${jsFile}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(appDir, "widget.html"), widgetHtml);
console.log("Synced dist → app/");
console.log(`  widget.html → ./assets/${jsFile}`);
