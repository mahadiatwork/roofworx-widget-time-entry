# Zoho CRM Widget — Starter Guide

A reusable, step-by-step recipe for building a **Zoho CRM Embedded App (Widget)** from scratch. This guide is framework- and business-logic-agnostic: it focuses on the plumbing that every widget needs so you can plug in your own UI and domain logic on top.

> Conventions used in this doc assume a **Vite + React** build (the most common pattern), but the SDK steps apply equally to vanilla JS, Vue, Svelte, etc.

---

## Table of Contents

1. [What a Zoho CRM widget actually is](#1-what-a-zoho-crm-widget-actually-is)
2. [Recommended project layout](#2-recommended-project-layout)
3. [Step 1 — Load the Embedded App SDK in `index.html`](#step-1--load-the-embedded-app-sdk-in-indexhtml)
4. [Step 2 — Expose `ZOHO` on `window` in your app entry](#step-2--expose-zoho-on-window-in-your-app-entry)
5. [Step 3 — Register `PageLoad` *before* `init()`](#step-3--register-pageload-before-init)
6. [Step 4 — Read context from the `PageLoad` payload](#step-4--read-context-from-the-pageload-payload)
7. [Step 5 — Resize the widget](#step-5--resize-the-widget)
8. [Step 6 — Push data back to Zoho CRM (SDK CRUD)](#step-6--push-data-back-to-zoho-crm-sdk-crud)
9. [Step 7 — Advanced: org variables, connection invoke, REST functions](#step-7--advanced-org-variables-connection-invoke-rest-functions)
10. [Step 8 — Handle standalone / dev mode gracefully](#step-8--handle-standalone--dev-mode-gracefully)
11. [Step 9 — Build, sync, and package for Zoho](#step-9--build-sync-and-package-for-zoho)
12. [Step 10 — Upload to the Zoho Developer Console](#step-10--upload-to-the-zoho-developer-console)
13. [Universal gotchas](#universal-gotchas)
14. [Troubleshooting checklist](#troubleshooting-checklist)

---

## 1. What a Zoho CRM widget actually is

A Zoho CRM widget is a **web app hosted at a URL**, embedded as an iframe inside a CRM page (a record, a web tab, a related list, etc.). It talks to the surrounding CRM through the **Zoho Embedded App SDK** — a JavaScript object injected into the iframe at `window.ZOHO`.

There are two deployment paths:

- **Internal hosting** — Zoho serves the widget from a ZIP you upload; the widget must live at `app/widget.html` inside the zip and the manifest points to `/app/widget.html`.
- **External hosting** — You host the widget on your own server (Netlify, S3, etc.) and the manifest just points to that URL.

Both paths use the same SDK and the same code. The only difference is *where the HTML comes from*.

---

## 2. Recommended project layout

A minimal, Zoho-friendly layout for a Vite + React widget:

```
my-widget/
├── index.html                  # Vite entry; loads the SDK
├── package.json
├── vite.config.js              # base: "./"  (required for sub-path hosting)
├── plugin-manifest.json        # Tells Zoho where the widget lives
├── app/                        # Built output staged for Zoho packaging
│   ├── widget.html             # Created by `zet` or manually
│   └── assets/                 # Populated by `widget:sync`
├── src/
│   ├── main.jsx                # React mount
│   ├── App.jsx                 # ZOHO init + PageLoad wiring
│   └── lib/
│       └── zohoClient.js       # Thin wrapper around window.ZOHO
└── scripts/
    └── sync-widget-dist.mjs    # Copies dist/assets → app/assets
```

Two important config details:

- **`vite.config.js`** must set `base: "./"` so the built `index.html` references its assets with **relative** paths (they need to resolve under `/app/...` once Zoho hosts them).
- **`plugin-manifest.json`** describes the widget to Zoho. At minimum, set the `service` to `CRM` and a `location` (e.g. `webtab`, `detailview`, `listview`).

```json
{
  "locale": ["en"],
  "service": "CRM",
  "modules": {
    "widgets": [
      {
        "name": "my_widget",
        "location": "webtab",
        "url": "/app/widget.html"
      }
    ]
  }
}
```

---

## Step 1 — Load the Embedded App SDK in `index.html`

The SDK is a normal `<script>` tag. The widget iframe **must** load it before your app code runs. The current canonical URL is on `zwidgets.com`; an older mirror lives on `zohocdn`.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- Zoho Embedded App SDK. Must load BEFORE your bundle. -->
    <script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>

    <title>My Widget</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

Notes:
- The `1.2` version is the current one. Some older widgets pin to `1.0.6` or `1.1`; both still work, but prefer the latest unless a feature forces you back.
- The script only does anything useful **inside a Zoho iframe**. In local dev (or external hosting pre-load), `window.ZOHO` is `undefined` — your code must guard for that.

---

## Step 2 — Expose `ZOHO` on `window` in your app entry

You have two equivalent patterns. Pick **one** and be consistent across the codebase.

**Pattern A — global constant at module top:**

```js
// src/App.jsx
const ZOHO = window.ZOHO;
```

**Pattern B — function-scoped read each time (safer if the SDK loads late):**

```js
function getZoho() {
  return typeof window !== "undefined" ? window.ZOHO : undefined;
}
```

**Pattern C — re-export the global for convenience (common in SDK wrappers):**

```js
// src/lib/zohoClient.js
export const ZOHO = (typeof window !== "undefined" ? window.ZOHO : undefined);
export const isZohoReady = () => typeof ZOHO !== "undefined" && !!ZOHO?.embeddedApp?.init;
```

Whatever you choose, **never re-import the SDK from npm**. Zoho does not publish it that way; the `<script>` tag is the only supported way to get it.

---

## Step 3 — Register `PageLoad` *before* `init()`

This is the single most common bug in Zoho widgets. The order is non-negotiable:

```jsx
// src/App.jsx
import { useEffect, useState } from "react";

const ZOHO = window.ZOHO;

export default function App() {
  const [pageLoad, setPageLoad] = useState(null);
  const [zohoReady, setZohoReady] = useState(false);

  useEffect(() => {
    if (typeof ZOHO === "undefined") {
      // Standalone dev mode — keep going, just don't talk to Zoho.
      console.warn("Running outside Zoho — SDK not present.");
      return;
    }

    // 1. Register PageLoad handler FIRST.
    ZOHO.embeddedApp.on("PageLoad", (data) => {
      // data carries the current record/Deal context. See Step 4.
      setPageLoad(data);
      setZohoReady(true);
    });

    // 2. Then init.
    ZOHO.embeddedApp.init().catch((err) => {
      console.error("ZOHO init failed:", err);
    });
  }, []);

  return /* your UI, gated on zohoReady / pageLoad */;
}
```

Why this order matters: `init()` resolves the moment Zoho injects the context. If you bind the listener after `init()` resolves, you can miss the event entirely on the first paint.

---

## Step 4 — Read context from the `PageLoad` payload

The `PageLoad` payload tells your widget **where it is** and **which record is open**. The shape varies by placement (Deal record vs Contact record vs Web Tab), but the common fields are:

```js
ZOHO.embeddedApp.on("PageLoad", (data) => {
  // data.Entity → module API name, e.g. "Deals", "Contacts", "Potentials"
  // data.EntityId → record id
  // data.RecordId → same as EntityId (older aliases exist)
  // data.InputData → for widgets opened with custom params
  // data.widgParams → placement-specific metadata
});
```

Minimal example — pull the Deal id off the payload and use it to load related records:

```js
function getDealId(pageLoadData) {
  if (!pageLoadData) return null;
  return (
    pageLoadData.EntityId ||
    pageLoadData.RecordId ||
    pageLoadData?.Entity?.[0]?.id ||
    null
  );
}

function getModuleName(pageLoadData) {
  return pageLoadData?.Entity || pageLoadData?.Module || null;
}
```

`getDealId` / `getModuleName` are typically extracted into a helper (`src/lib/zohoPageContext.js` in this repo) and passed down to the rest of the app as props or through context.

---

## Step 5 — Resize the widget

By default, an iframe-sized widget can clip content. Resize it from inside:

```js
ZOHO.CRM.UI.Resize({ height: "100%", width: "90%" }).then((res) => {
  console.log("resized", res);
});
```

Pick a strategy that matches your layout:
- `100% / 90%` — let the iframe fill the slot, with a small gutter.
- A pixel height (`{ height: 720 }`) — for fixed-size calculators.
- Listen for window resize and call `Resize` again if your layout reflows.

---

## Step 6 — Push data back to Zoho CRM (SDK CRUD)

The bulk of "React → Zoho" is plain CRUD through `ZOHO.CRM.API`. Wrap the global in a thin module so the rest of your app doesn't import `window` directly.

```js
// src/lib/zohoClient.js
const ZOHO = (typeof window !== "undefined" ? window.ZOHO : undefined);

export const isZohoReady = () =>
  typeof ZOHO !== "undefined" && !!ZOHO?.embeddedApp?.init;

export async function getRecord({ entity, recordId }) {
  if (!isZohoReady()) throw new Error("Zoho SDK not ready");
  return ZOHO.CRM.API.getRecord({ Entity: entity, RecordID: recordId });
}

export async function insertRecord({ entity, data, trigger }) {
  return ZOHO.CRM.API.insertRecord({
    Entity: entity,
    APIData: data,
    Trigger: trigger, // ["workflow"], ["approval"], etc. — optional
  });
}

export async function updateRecord({ entity, recordId, data, trigger }) {
  return ZOHO.CRM.API.updateRecord({
    Entity: entity,
    RecordID: recordId,
    APIData: data,
    Trigger: trigger,
  });
}

export async function deleteRecord({ entity, recordId }) {
  return ZOHO.CRM.API.deleteRecord({ Entity: entity, RecordID: recordId });
}

export async function searchRecords({ entity, type, searchValue, perPage = 200, page = 1 }) {
  // type: "email" | "phone" | "word" | "criteria"
  return ZOHO.CRM.API.searchRecord({
    Entity: entity,
    Type: type,
    SearchValue: searchValue,
    per_page: perPage,
    page,
  });
}

export async function getRelatedRecords({ entity, recordId, relatedList }) {
  return ZOHO.CRM.API.getRelatedRecords({
    Entity: entity,
    RecordID: recordId,
    RelatedList: relatedList,
  });
}
```

**The standard response shape from `insert` / `update` / `delete`:**

```js
{
  data: [
    {
      code: "SUCCESS",
      details: { id: "1234567890", ...createdRecord },
      message: "Record added successfully",
      status: "success"
    }
  ]
}
```

Always check `response.data[0].code === "SUCCESS"` before treating the call as done; failures come back with `code: "ERROR"` and a `message` you should surface to the user.

**A simple "save from React" example:**

```jsx
async function saveQuoteToCrm(quote) {
  const payload = {
    Subject: quote.subject,
    Stage: "Qualification",
    Amount: quote.total,
    // ...other field API names
  };

  const res = await insertRecord({
    entity: "Deals",
    data: payload,
    trigger: ["workflow"],
  });

  if (res?.data?.[0]?.code === "SUCCESS") {
    return { ok: true, id: res.data[0].details.id };
  }
  return { ok: false, error: res?.data?.[0]?.message ?? "Unknown error" };
}
```

---

## Step 7 — Advanced: org variables, connection invoke, REST functions

### Org variables (app-level config)

```js
const res = await ZOHO.CRM.API.getOrgVariable("my_widget_settings");
const settings = JSON.parse(res?.Success?.Content || "{}");
```

Useful for storing non-secret config that admins tune from Zoho Setup (e.g. pricing sheets, feature flags).

### Connection invoke (custom REST via a pre-configured OAuth connection)

```js
const req = {
  url: "https://www.zohoapis.com/crm/v3/Events/search?criteria=...",
  method: "GET",
  param_type: 1, // 1 = query/header params, 2 = body
};
const data = await ZOHO.CRM.CONNECTION.invoke("zoho_crm_conn", req);
```

The connection (`zoho_crm.conn` in this example) must exist in **Setup → Developer Space → Connections** for your org. Use this when you need endpoints the high-level `ZOHO.CRM.API` doesn't expose.

### REST functions (Deluge functions exposed as HTTP endpoints)

```js
const data = await ZOHO.CRM.FUNCTIONS.execute("my_pricing_function", {
  product: "Zips City",
});
```

This is the cleanest way to call Deluge from inside a widget. `FUNCTIONS.execute` returns the function's `return` value directly, unwrapped from the HTTP envelope.

---

## Step 8 — Handle standalone / dev mode gracefully

Your widget will be developed outside Zoho 90% of the time. Design for that from day one:

```js
// src/lib/zohoClient.js
export const isZohoReady = () =>
  typeof window !== "undefined" && !!window.ZOHO?.embeddedApp?.init;

export async function safe(fn, fallback) {
  if (!isZohoReady()) return fallback;
  try { return await fn(); }
  catch (err) { console.error(err); return fallback; }
}
```

In your UI:

```jsx
const [pricing, setPricing] = useState(null);

useEffect(() => {
  if (isZohoReady()) {
    loadZipscreenPricingViaSdk().then(setPricing);
  } else {
    // Local dev: hit the REST endpoint directly with axios, or use bundled sample data.
    axios.get("https://www.zohoapis.com/crm/v3/functions/.../actions/execute", {
      params: { auth_type: "apikey", zapikey: "<dev-key>" },
    }).then(r => setPricing(r.data.data));
  }
}, []);
```

This way the same React tree runs in dev (`npm run dev`) and inside Zoho without conditional logic scattered through your components.

---

## Step 9 — Build, sync, and package for Zoho

A typical Vite → Zoho pipeline:

```jsonc
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "widget:sync": "node scripts/sync-widget-dist.mjs"
  }
}
```

The sync script is short — it copies the Vite build output into the `app/` directory that Zoho's packaging tooling expects:

```js
// scripts/sync-widget-dist.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(importURL));
const root = path.join(__dirname, "..");

fs.mkdirSync(path.join(root, "app/assets"), { recursive: true });
for (const f of fs.readdirSync(path.join(root, "app/assets"))) {
  fs.rmSync(path.join(root, "app/assets", f), { recursive: true, force: true });
}
for (const f of fs.readdirSync(path.join(root, "dist/assets"))) {
  fs.cpSync(path.join(root, "dist/assets", f), path.join(root, "app/assets", f), { recursive: true });
}
```

Then create the Zoho entry point:

```html
<!-- app/widget.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>My Widget</title>
    <script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
    <link rel="stylesheet" href="./assets/index-[hash].css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./assets/index-[hash].js"></script>
  </body>
</html>
```

(`zet run` will create a working `widget.html` for you; you can use that as a reference for the exact hashed asset names.)

---

## Step 10 — Upload to the Zoho Developer Console

1. Install Zoho's CLI: `npm install -g zoho-extension-toolkit`
2. From the project root, run:
   - `zet run` — serve locally at `http://127.0.0.1:5000/app/widget.html` for testing in CRM
   - `zet validate` — check the manifest + zip layout
   - `zet pack` — produce a `.zip` ready to upload
3. In **Zoho CRM → Setup → Developer Space → Extensions**, create a new widget extension, upload the zip (or point to an external URL), and set the placement (`webtab`, `detailview`, etc.).
4. Install the extension into the org(s) that need it.

For external hosting, skip `zet pack` — just point the manifest's `url` at the public URL of your built `widget.html`.

---

## Universal gotchas

- **Register `PageLoad` before `init()`** — almost every "my widget does nothing in CRM" bug traces back to this.
- **Always guard `window.ZOHO`** — it's `undefined` in dev and in any iframe not loaded by Zoho.
- **Relative asset paths** — set `base: "./"` in `vite.config.js` (or the equivalent in your bundler) so assets resolve under `/app/...`.
- **Response shapes vary** — `searchRecord` sometimes returns records under `.data`, sometimes under `.details.statusMessage.data`; normalize with a helper before consuming.
- **Module name mismatches** — `Deals` and `Potentials` refer to the same module historically; use the API name your org actually has.
- **Date format** — Zoho APIs want ISO 8601 with a timezone offset (`2026-01-26T10:00:00+11:00`). Localized formats will be rejected.
- **Permissions** — if a user can't see a field/record via the CRM UI, the SDK will also be blocked. Check profile + field-level security first.
- **Workflows / approvals** — pass `Trigger: ["workflow"]` (or `["approval"]`) on `insert`/`update` to fire them, otherwise the write is silent.
- **HTTPS only** — Zoho will not load widget code from an `http://` URL.
- **CORS** — direct `fetch` from inside the iframe to third-party APIs can be blocked. Use `CONNECTION.invoke` or `FUNCTIONS.execute` (which run server-side) to side-step CORS.

---

## Troubleshooting checklist

| Symptom | First thing to check |
|---|---|
| `ZOHO is not defined` | Is the SDK `<script>` in `index.html`? Does it load before your bundle? |
| `init()` hangs forever | Are you registering `PageLoad` *after* `init()`? Flip the order. |
| `init()` rejected | Is the widget installed in this org? Is the placement valid? |
| `getRecord` returns empty | Wrong module API name, wrong record id, or no permission. |
| `insertRecord` returns 401/403 | OAuth scopes missing on the connected app, or user lacks module access. |
| `searchRecord` shape is weird | Normalize through a helper — Zoho's search returns vary by query type. |
| Widget is clipped / scrollbarred | Forgot `ZOHO.CRM.UI.Resize(...)` from Step 5. |
| `zet pack` rejects the zip | Missing `app/widget.html` or wrong `plugin-manifest.json` location. |
| Works locally, blank in CRM | `base` is absolute in the build. Use `./` for relative asset paths. |
| Updates silently ignored | Missing `Trigger: ["workflow"]` or field-level security blocking write. |

---

## Minimal end-to-end skeleton

Putting the whole guide together, the smallest possible working widget is roughly:

```html
<!-- index.html -->
<script src="https://live.zwidgets.com/js-sdk/1.2/ZohoEmbededAppSDK.min.js"></script>
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

```jsx
// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
```

```jsx
// src/App.jsx
import { useEffect, useState } from "react";
import { ZOHO, isZohoReady } from "./lib/zohoClient.js";

export default function App() {
  const [recordId, setRecordId] = useState(null);

  useEffect(() => {
    if (!isZohoReady()) return;
    ZOHO.embeddedApp.on("PageLoad", (data) => {
      setRecordId(data.EntityId || data.RecordId);
      ZOHO.CRM.UI.Resize({ height: "100%", width: "90%" });
    });
    ZOHO.embeddedApp.init();
  }, []);

  return <div>Hello from Zoho. Current record: {recordId ?? "n/a"}</div>;
}
```

From there, replace the "Hello" with your own UI, wrap your CRUD calls in the helpers from `Step 6`, and follow the build/sync flow in `Step 9`. Everything else is your product.
