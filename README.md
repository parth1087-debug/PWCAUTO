# PwC Connected Plant Intelligence

A working demo of an industrial intelligence app, branded PwC, with AI agents powered by Faclon Labs.
It runs several industry demos side by side, each with its own database, UNS ontology and Bruce agents.

All plant data is generated. Values are fixed by a seed, so they are the same on every run.
Timestamps are anchored to "now", so the newest point is always the current hour.

## What is in the repository

| Folder | What it is |
|---|---|
| `web/` | The app: React + Vite, white minimal design, dark mode optional |
| `web/src/shared/` | Data engine, industry demo configs, UNS, and the tools used by both the app and the MCP server |
| `mcp/` | `plantdb` MCP server: one connector for the app's databases (stdio or HTTP) |
| `bruce/` | Bruce agent definitions and UNS export per demo, and a script to push agents to a Bruce gateway |
| `legacy/` | The earlier static HTML version |

## Run the app

```bash
cd web && npm install && npm run dev
```

Build options:

```bash
cd web && npm run build
```

```bash
cd web && npm run build:single
```

`build` writes a static site to `web/dist/`. `build:single` writes one file, `web/dist-single/index.html`, that opens offline from disk or a phone.

Sign in with **pwc** / **Demo@2026**. Change it in `web/src/config.js`. This login is a demo gate in the browser, not real security.

## Users and demos

- **Master** sees every demo and switches the database from the top bar. Master can add sub users in Settings › Users.
- **Sub users** (Auto components, Cement, Steel) each see only their own demo database.
- Switch users from the user menu at the top of the sidebar. There is one login for all of them.
- The **Artefactory** is common to all users. Each artefact is tied to the demo whose data it shows.

To add an industry, copy a file in `web/src/shared/demos/`, change the plant, assets, tags, KPIs, events and agents, and list it in `web/src/shared/index.js`. It gets its own database, UNS, agents, dashboards and MCP access.

## Sidebar

| Item | What it does |
|---|---|
| Copilot | Chat with the Bruce agents. History on the left. Each answer shows the agent, the tool calls and the data it used |
| Messages | Approvals, alerts, insights and reports from agents. Approve or reject in place. Reports open inline |
| Shortcuts | Pinned dashboards: Plant KPIs, Overview, Maintenance, Cost conversion, Quality, Energy, and custom dashboards from the Artefactory. Use ＋ to change them |
| Artefactory | Dashboards, reports, workbooks, decks and documents. Mine / shared, search, versions with restore, real `.xlsx` and HTML downloads |
| Autopilot | Report schedules (run now, on/off), workflows and run history |
| Context | UNS ontology, skills, docs, connectors and policies, as configured for the demo's agents. Read only |
| Settings | Users, agent configurations, data and demo clock, usage, notifications, logs |

Other things built in: search and command palette (⌘K or Ctrl+K), date range on every dashboard (24 h to 6 months or custom), "Ask" opens the Copilot in place on any page or card, CSV export on every card, headline chart titles, deep links, and an audit log of every action.

## Demo clock

Settings › Data › Demo clock. **Live** ends the 6-month history at the current hour. **Fixed date** ends it at a date you choose. The data does not change, only the timestamps. The MCP server does the same with `PLANTDB_ANCHOR`.

## plantdb MCP server

```bash
cd mcp && npm install
```

```bash
cd mcp && npm start
```

```bash
cd mcp && npm run start:http
```

`npm start` uses stdio. `npm run start:http` serves `http://localhost:8787/mcp`. `npm test` runs a smoke test.

Tools: `list_demos`, `uns_browse`, `uns_search`, `get_tag_history`, `get_kpis`, `get_kpi_trend`, `get_asset_health`, `diagnose_asset`, `get_production`, `get_oee_losses`, `get_energy`, `get_quality`, `list_messages`, `search_docs`, `list_agents`, `get_policy`. Every data tool takes a `demo` argument.

**Live:** `https://pwc-plantdb.us.iosense.io/mcp` (Streamable HTTP, stateless, no key; health at `/`). Hosted on Faclon Forge, project `pwc-plantdb-mcp`, deployment `dep-pwc-plantdb-mcp-adf6ef`, built from `main` with `mcp/Dockerfile`. After changing the server, redeploy with Forge `fg_deploy_revision` (deployment `dep-pwc-plantdb-mcp-adf6ef`). The contract is in `mcp/forge-contract.json`.

```json
{ "mcpServers": { "plantdb": { "type": "http", "url": "https://pwc-plantdb.us.iosense.io/mcp" } } }
```

Environment: `PLANTDB_DEMOS=auto,cement` limits which databases a connector can read. `PLANTDB_ANCHOR` fixes the demo clock. `PLANTDB_TOKEN` requires a bearer token in HTTP mode.

Example client configuration:

```json
{ "mcpServers": { "plantdb": { "command": "node", "args": ["mcp/server.mjs"], "env": { "PLANTDB_DEMOS": "auto" } } } }
```

## Live in Faclon (UNS and Bruce)

These were created through the Bruce gateway MCP. IDs are in `web/src/shared/deployed.js`; the app shows them in Settings › Agents and Context › UNS ontology.

| Demo | UNS workspace | Nodes / lineage edges | Bruce agents |
|---|---|---|---|
| Auto components | [ws_ZsvYBbez4H](https://uns.us.iosense.io/uns/ws_ZsvYBbez4H) | 94 / 27 | 6 |
| Cement | [ws_MKjfM9LH3n](https://uns.us.iosense.io/uns/ws_MKjfM9LH3n) | 62 / 15 | 6 |
| Steel | [ws_TGBJVxMdCC](https://uns.us.iosense.io/uns/ws_TGBJVxMdCC) | 45 / 10 | 6 |

- UNS: Enterprise › Site › Area › Line › Machine › Variable. Tags carry unit, nominal, limits and `unsTag`. Lineage uses `rel_feeds`, `rel_supplies` and `rel_causes`.
- Bruce agents are named `PwC <Demo> · <Agent>`, use model `sarvam-105b` and two connectors: **UNS Graph** (plant model) and **Plant Data** (the hosted plantdb MCP server, for KPIs, trends, health, energy, quality and documents). They are private to the owner. Share them in Bruce before the demo if others will chat.
- Skills: 13 task skills (`pwc-<demo>-<skill>`) and 3 knowledge skills (`pwc-<demo>-plant-knowledge`) with the plant brief, documents and policies as reference files.
- Smart Context was not used: the Bruce account has no embedding model connected yet.

## Bruce agents and UNS (export)

```bash
node bruce/export.mjs
```

This writes `bruce/agents/<demo>.json` (agent definitions: model, skills, tools, triggers, autonomy, policies, data scope) and `bruce/uns/<demo>.json` (ISA-95 namespace: enterprise / site / area / work center / work unit / tag).

To create the agents in your Bruce instance through the Bruce MCP gateway:

```bash
cd bruce && npm install && BRUCE_GATEWAY_URL=https://<your-bruce>/mcp BRUCE_TOKEN=<token> node push-to-bruce.mjs auto
```

The script lists the gateway's tools and calls the one that creates agents. Set `BRUCE_AGENT_TOOL` if its name is different. Use `--dry-run` to see what would be sent.

## Live agents in the app

The Copilot talks to real Bruce agents through Bruce's **agent API** (Integrations › REST API). Each demo has a **Plant Copilot** agent on Bruce: `PwC Auto · Plant Copilot`, `PwC Cement · Plant Copilot`, `PwC Steel · Plant Copilot` (ids in `web/src/shared/deployed.js`). It has the plant knowledge skill and the Plant Data, UNS Graph and Bruce connectors, and can delegate to the six specialist agents when its Team is set in Bruce.

The app never holds a key. It calls `POST https://pwc-plantdb.us.iosense.io/api/chat`; the server (`mcp/bruce.mjs`) relays to `POST https://bruce.us.iosense.io/backend/api/agents/v1/agents/{id}/chat` with the agent's API key and streams the answer back (session, tool calls, text). Follow-up questions continue the same Bruce conversation. The app draws charts and tables from the real Plant Data tool results and offers actions (raise work order, open a dashboard).

- Keys: `BRUCE_KEY_AUTO`, `BRUCE_KEY_CEMENT`, `BRUCE_KEY_STEEL` on the server (Forge secrets). `GET /api/status` lists the demos that are live.
- Fallback runtime: with `ANTHROPIC_API_KEY` instead, `mcp/agent.mjs` runs the agents on Claude directly (`LLM_MODEL`, `LLM_EFFORT`).
- Limits: `CHAT_LIMIT` requests per IP per 10 minutes (default 30); optional `DEMO_KEY` requires the header `X-Demo-Key`.
- If live is off or unreachable, the Copilot falls back to the in-app engine. Settings › Agents › Live agents shows the status and turns it on or off.
- Requests to create reports, decks or dashboards stay on the in-app engine, because it writes them to the Artefactory.
- For local development, set `localStorage["pwc-cpi.liveBase"] = "http://localhost:8787"` in the browser.
