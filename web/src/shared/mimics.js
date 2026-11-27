/* Process and asset views ("mimics") per solution. Plain data so the server can seed them as artefacts.
   The drawing for each id lives in web/src/mimics/<file>.jsx (see web/src/mimics/index.js).
   level: L1 area overview · L2 unit / process · L3 equipment (ISA-101 display hierarchy). */
export const MIMICS = {
  auto: [
    { id: 'cnc-twin', name: 'CNC hobber HB-04 · machine twin', level: 'L3', desc: 'Spindle, axes, coolant and tool with live loads and the bearing alarm.' },
    { id: 'ht-line', name: 'Heat treatment line · process view', level: 'L2', desc: 'Mesh belt furnace, quench and induction hardening with zone temperatures.' },
  ],
  cement: [
    { id: 'kiln-line', name: 'Pyro line · preheater, kiln and cooler', level: 'L2', desc: 'Cyclone tower, calciner, rotary kiln, grate cooler and ID fan with draft, temperatures and gas analysis.' },
    { id: 'mill-circuit', name: 'Mill circuits · raw and cement mill', level: 'L2', desc: 'Vertical roller mill and ball mill circuits with separator, bag house and fans.' },
  ],
  steel: [
    { id: 'blast-furnace', name: 'Blast furnace · process view', level: 'L2', desc: 'Stack profile, stoves, hot blast, tuyeres, top gas and cast house.' },
    { id: 'dri-kiln', name: 'DRI kiln · sponge iron', level: 'L2', desc: 'Feed, rotary kiln with axial temperature profile, cooler and waste-heat boiler.' },
    { id: 'pellet-plant', name: 'Pellet plant · induration machine', level: 'L2', desc: 'Balling discs, travelling grate zones, process fans and wind-box pressures.' },
    { id: 'induction-furnace', name: 'Induction furnace · melt shop', level: 'L3', desc: 'Crucible, power supply, cooling water and melt temperature.' },
    { id: 'rolling-mill', name: 'Bar mill · reheating to cooling bed', level: 'L2', desc: 'Reheating furnace, roughing, intermediate and finishing stands with loads.' },
  ],
  'pharma-api': [
    { id: 'reactor-train', name: 'API block · reactor train SCADA', level: 'L2', desc: 'Glass-lined reactors with jackets, condenser, receivers, centrifuge and ANFD.' },
  ],
  'pharma-formulation': [
    { id: 'osd-line', name: 'OSD line · granulation to coating SCADA', level: 'L2', desc: 'RMG, FBD, blender, tablet press and coater with critical process parameters.' },
  ],
  solar: [
    { id: 'solar-portfolio', name: 'Solar portfolio · three plants', level: 'L1', desc: 'Map of the plants with export, PR and irradiance.' },
    { id: 'solar-sld', name: 'Bhadla plant · single-line diagram', level: 'L2', desc: 'Strings and inverters to inverter-duty transformers, pooling substation and grid.' },
  ],
  wind: [
    { id: 'wind-farm', name: 'Wind farms · turbine layout', level: 'L1', desc: 'Turbines on feeders with power, wind and state.' },
    { id: 'nacelle', name: 'MP-WTG-07 · nacelle twin', level: 'L3', desc: 'Rotor, main bearing, gearbox, generator, converter and yaw with live values.' },
  ],
  ems: [
    { id: 'energy-flow', name: 'Energy flow · campus overview', level: 'L1', desc: 'Grid, solar and DG to utilities and loads.' },
    { id: 'sld', name: 'Power network · single-line diagram', level: 'L2', desc: 'Incomer, transformers, busbars, feeders, DG, APFC and solar.' },
    { id: 'busbar', name: 'Busbars and transformers · thermal view', level: 'L3', desc: 'Busbar joint temperatures and transformer oil and winding temperatures.' },
    { id: 'air-network', name: 'Compressed air network', level: 'L2', desc: 'Compressors, dryers, receivers, header and air delivery to users.' },
    { id: 'chw-circuit', name: 'Chilled water circuit', level: 'L2', desc: 'Chillers, primary and secondary pumps, cooling towers and AHUs.' },
    { id: 'steam-network', name: 'Steam network', level: 'L2', desc: 'Boilers, header, PRDS, users, traps and condensate return.' },
    { id: 'gas-network', name: 'Gas network', level: 'L2', desc: 'PNG metering skid, pressure regulation and consumers.' },
    { id: 'dg-vfd', name: 'DG sets and VFDs', level: 'L3', desc: 'Diesel generators and variable-speed drives with load and efficiency.' },
    { id: 'power-quality', name: 'Power quality', level: 'L3', desc: 'Voltage, PF, harmonics, unbalance and frequency at the incomer and busbars.' },
  ],
  pipes: [
    { id: 'extrusion-line', name: 'Extrusion line · process view', level: 'L2', desc: 'Mixer, extruder barrel zones, die, vacuum tank, haul-off, cutter and belling.' },
    { id: 'imm-cell', name: 'Injection moulding cell · fittings', level: 'L3', desc: 'Injection unit, clamp, mould temperature and cycle.' },
  ],
};
