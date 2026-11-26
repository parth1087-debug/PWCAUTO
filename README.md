# PwC Connected Plant Intelligence — demo

A clickable demo for an auto-ancillary manufacturer (sprockets, chains and components for two-wheeler OEMs).
It shows Faclon AI agents across four areas: asset maintenance, cost conversion, AI vision quality, and energy and utilities.

All data is illustrative. Nothing connects to a real plant.

## Run

Open `index.html` in a browser. No build or install needed, and it works offline.

To host it, serve the folder with any static server, for example `python3 -m http.server`.

## Rename the customer

Edit `CONFIG` at the top of `assets/js/data.js` (customer, plant, user name and role).

## Pages

| Page | What it shows |
|---|---|
| Plant overview | Live status of all 37 assets in 8 areas, 10 connected systems, KPIs and agent insights |
| Asset maintenance | Health score, remaining life, vibration trend with ISO 10816 zones, agent RCA, SAP PM work orders |
| Cost conversion | Budget-to-actual cost bridge per kg, cost by element, OEE by line, six big losses, cost per part |
| Quality · AI vision | Live camera inspection, defect Pareto, hardness SPC, defect linked back to process |
| Energy & utilities | Load vs contract demand with ToD windows, weekly heatmap, compressors and furnaces, savings |
| Plant ontology | ISA-95 hierarchy (Enterprise → Site → Area → Work Center → Work Unit → Tag), relationships, live tags |
| AI agents | 6 agents on the Bruce runtime: capabilities, skills, MCP connectors, autonomy, activity and approvals |

The **Copilot** button opens a chat that routes each question to an agent and shows its tool trace.

## Demo script (about 10 minutes)

1. **Overview.** Point at the plant map and the connected systems. Open the HB-04 insight in Copilot.
2. **Maintenance.** Ask "Why is HB-04 vibration rising and what should we do?". Select **Raise work order**. On **AI agents**, select **Approve**.
3. **Cost.** Ask "Why did OEE on Sprocket Line 2 drop this shift?", then "Why is conversion cost per kg above budget this month?".
4. **Quality.** Show live inspection. Ask "Why are tooth crack rejects up on 428-42T sprockets?". Select **Hold suspect lot** and **Draft 8D**.
5. **Energy.** Ask "How much compressed air are we losing to leaks?" and "Compare kWh per piece for sprockets across lines this week".
6. **Automation.** Ask "Write the shift report for Shift A" and "Plan maintenance for this Sunday shutdown".
7. **Guardrails.** Ask "Increase the SQF-01 furnace setpoint to 900 °C". The agent refuses and offers a change request.
8. **Ontology.** Select an asset on the overview map to open it in the ISA-95 model.

Dark mode: the moon/sun button in the top bar. Press `/` to search for an asset ID (for example `IH-02`).
