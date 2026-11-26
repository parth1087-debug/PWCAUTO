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
| Copilot | Landing page. Chat history, chat screen with tool trace, session panel (agent, tools, sources, approvals) and a briefing of approvals, alerts and KPIs |
| Shortcuts | Pinned dashboards. Select ＋ to pin or unpin Plant KPIs, the 5 standard dashboards and custom dashboards (saved in the browser) |
| Artefactory | Versioned library of dashboards (HTML), reports, workbooks, presentations and documents. "Mine" and "Shared with me", preview, version view and restore |
| Messages | Insights, alerts, workflow approvals and reports from the agents. Approve, reject, acknowledge or open in Copilot. Unread count in the sidebar and bell |
| Autopilot | Report schedules, event-driven workflows and run history |
| Context (read only) | Ontology (ISA-95), Skills (versioned agent procedures), Docs (indexed manuals, SOPs, RCAs with cited passages), Connectors (data connections and MCP tools) |
| Settings | Usage (sessions, tokens, cost, model mix), Agents, Users & roles, Guardrails, Notifications, Logs |

## Demo script (about 10 minutes)

1. **Plant KPIs.** Show value realised against the baseline. Select a KPI row, then **Ask Copilot** why it changed.
2. **Dashboards › Plant overview.** Point at the plant map and the connected systems. Open the HB-04 insight in Copilot.
3. **Maintenance.** Ask "Why is HB-04 vibration rising and what should we do?". Select **Raise work order**. On **AI agents**, select **Approve**.
4. **Cost.** Ask "Why did OEE on Sprocket Line 2 drop this shift?", then "Why is conversion cost per kg above budget this month?".
5. **Quality.** Show live inspection. Ask "Why are tooth crack rejects up on 428-42T sprockets?". Select **Hold suspect lot** and **Draft 8D**.
6. **Energy.** Ask "How much compressed air are we losing to leaks?" and "Compare kWh per piece for sprockets across lines this week".
7. **Autopilot.** Show report schedules and workflows. Select **New schedule by chat** and confirm it, then see it in the schedule list.
8. **Artefactory.** Open the deck, a document, a report and a workbook. On **Versions**, view an older version and restore it. Switch to **Shared with me**.
9. **Shortcuts.** Select ＋ next to Dashboards and pin "Heat treatment cell". Open it from the sidebar.
10. **Copilot builds artefacts.** Ask "Build a dashboard for compressor specific power" and pin it. Ask "Create a presentation for the energy cell review of compressed air" and open it.
11. **Logs.** Filter to WARN, expand the blocked setpoint write, and watch the live tail.
12. **Guardrails.** Ask "Increase the SQF-01 furnace setpoint to 900 °C". The agent refuses and offers a change request.
13. **Configs.** Show the ontology, agents and tools as read only, managed by Faclon.

Dark mode: the moon/sun button in the top bar. Press `/` to search for an asset ID (for example `IH-02`).
