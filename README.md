# PwC Connected Plant Intelligence — demo

A clickable demo for an auto-ancillary manufacturer (sprockets, chains and components for two-wheeler OEMs).
It shows Faclon AI agents across four areas: asset maintenance, cost conversion, AI vision quality, and energy and utilities.

All data is illustrative. Nothing connects to a real plant.

## Run

Open `index.html` in a browser. No build or install needed, and it works offline.

To host it, serve the folder with any static server, for example `python3 -m http.server`.

## Rename the customer

Edit `CONFIG` at the top of `assets/js/data.js` (customer, plant, user name and role).

## Structure

| Sidebar | What it shows |
|---|---|
| User | Signed-in user, role and plant |
| Plant KPIs | 21 KPIs against the locked pre-go-live baseline (Jun–Aug 2026), with target, progress, trend and ₹ value realised |
| Configs (read only) | **Ontology** (ISA-95 model, links, live tags), **Agents** (6 agents on Bruce), **Tools** (MCP Gateway connectors and approval rules) |
| Copilot | Chat history, chat screen with tool trace, and a session panel (agent, tools called, sources, approvals) |
| Autopilot | Report schedules, event-driven workflows (trigger → agent → approval → action) and run history |
| Dashboards | Live dashboards: plant overview, asset maintenance, cost conversion, quality · AI vision, energy & utilities |
| Reports | HTML and Excel artefacts written by the agents, with in-app preview and download |

## Demo script (about 10 minutes)

1. **Plant KPIs.** Show value realised against the baseline. Select a KPI row, then **Ask Copilot** why it changed.
2. **Dashboards › Plant overview.** Point at the plant map and the connected systems. Open the HB-04 insight in Copilot.
3. **Maintenance.** Ask "Why is HB-04 vibration rising and what should we do?". Select **Raise work order**. On **AI agents**, select **Approve**.
4. **Cost.** Ask "Why did OEE on Sprocket Line 2 drop this shift?", then "Why is conversion cost per kg above budget this month?".
5. **Quality.** Show live inspection. Ask "Why are tooth crack rejects up on 428-42T sprockets?". Select **Hold suspect lot** and **Draft 8D**.
6. **Energy.** Ask "How much compressed air are we losing to leaks?" and "Compare kWh per piece for sprockets across lines this week".
7. **Autopilot.** Show report schedules and workflows. Select **New schedule by chat** and confirm it, then see it in the schedule list.
8. **Reports.** Open an HTML report and an Excel workbook (select a cell to see its formula). Download one.
9. **Guardrails.** Ask "Increase the SQF-01 furnace setpoint to 900 °C". The agent refuses and offers a change request.
10. **Configs.** Show the ontology, agents and tools as read only, managed by Faclon.

Dark mode: the moon/sun button in the top bar. Press `/` to search for an asset ID (for example `IH-02`).
