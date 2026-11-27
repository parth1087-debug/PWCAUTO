import { makeAgents, PLANTDB_TOOLS as T } from '../common.js';

const UNS = 'meridian/campus-1';
/* VFD-driven load: output frequency, power, motor current, drive heatsink temp */
const VFD = (label, hz, kw, amps) => ({ label, src: 'meter', tags: [
  ['freq', 'Output frequency', 'Hz', hz, 1.2, 3, 0, 50.5], ['kw', 'Drive input power', 'kW', kw, kw * 0.05, kw * 0.12], ['current', 'Motor current', 'A', amps, amps * 0.04, amps * 0.1, 0, amps * 1.6],
  ['thd_i', 'Input current THD', '%', 31, 1.5, 2, 0, 45], ['hs_temp', 'Heatsink temperature', '°C', 46, 1, 3, 0, 75, 'bms']] });
/* air compressor: power, free air delivery, pressure, load, oil temp, specific power */
const COMP = (label, kw, fad, vsd) => ({ label, src: 'bms', tags: [
  ['kw', 'Input power', 'kW', kw, kw * 0.04, kw * 0.08, 0, kw * 1.15, 'meter'], ['fad', 'Free air delivery', 'm³/min', fad, fad * 0.04, fad * 0.09], ['pressure', 'Discharge pressure', 'bar', 7.3, 0.06, 0.05, 5.8, 8.0],
  [vsd ? 'speed' : 'load_pct', vsd ? 'Motor speed' : 'Loaded time', vsd ? 'rpm' : '%', vsd ? 2450 : 78, vsd ? 90 : 4, vsd ? 160 : 9], ['oil_temp', 'Oil / airend temperature', '°C', 84, 1.2, 1.5, 0, 100], ['spec_power', 'Specific power', 'kW/(m³/min)', 6.3, 0.08, 0.05, 0, 7.2]] });
/* chiller: power, cooling load, kW/TR, CHW supply/return, ΔT, condenser approach, CW inlet */
const CHILLER = (label, kw, tr) => ({ label, src: 'bms', tags: [
  ['kw', 'Compressor power', 'kW', kw, kw * 0.03, kw * 0.12, 0, kw * 1.3, 'meter'], ['tr', 'Cooling load', 'TR', tr, tr * 0.03, tr * 0.12], ['kw_tr', 'Chiller efficiency', 'kW/TR', 0.63, 0.008, 0.01, 0, 0.75],
  ['chws', 'CHW supply temperature', '°C', 7.0, 0.1, 0.1, 5.5, 8.5], ['chwr', 'CHW return temperature', '°C', 12.2, 0.15, 0.3], ['delta_t', 'CHW ΔT', '°C', 5.2, 0.12, 0.25, 3.5, 7.5],
  ['cond_approach', 'Condenser approach', '°C', 2.1, 0.08, 0.1, 0, 4.0], ['cw_in', 'Condenser water inlet', '°C', 30.4, 0.3, 1.0, 0, 33]] });

export default {
  id: 'ems', continuous: true, name: 'Energy & utilities', industry: 'Energy and utilities management · power, air, chilled water, steam, gas',
  company: 'Meridian Industrial Park', companySlug: 'meridian', site: 'Campus 1', siteSlug: 'campus-1', location: 'Chakan, Pune, Maharashtra',
  production: { unit: 'units', planPerDay: 24000, label: 'Finished goods output, all blocks (ERP)', massUnit: 'units' },
  classes: {
    incomer: { label: '33 kV grid incomer · ABT meter', src: 'meter', tags: [
      ['kva', 'Apparent power (15-min demand)', 'kVA', 6200, 220, 700, 0, 7800], ['kw', 'Active power', 'kW', 6050, 210, 680], ['pf', 'Power factor', '', 0.985, 0.003, 0.004, 0.97, 1.0],
      ['voltage', 'Bus voltage (L-L)', 'kV', 33.2, 0.15, 0.3, 30.5, 35.5, 'scada'], ['freq', 'Grid frequency', 'Hz', 50.0, 0.04, 0, 49.5, 50.5, 'scada'],
      ['thd_v', 'Voltage THD', '%', 2.1, 0.12, 0.2, 0, 5], ['thd_i', 'Current TDD', '%', 5.4, 0.3, 0.6, 0, 8], ['v_unbal', 'Voltage unbalance', '%', 0.8, 0.08, 0.1, 0, 2]] },
    transformer: { label: 'Power transformer 33/0.433 kV · 3.15 MVA', src: 'scada', tags: [
      ['load_pct', 'Loading', '%', 58, 2.5, 9, 0, 90, 'meter'], ['kw', 'LV active power', 'kW', 1720, 70, 260, 0, undefined, 'meter'], ['oil_temp', 'Top-oil temperature (OTI)', '°C', 58, 0.8, 3, 0, 85],
      ['wind_temp', 'Winding temperature (WTI)', '°C', 73, 1.0, 4, 0, 105], ['tap', 'OLTC tap position', '', 5, 0, 0, 1, 9], ['thd_i', 'LV current THD', '%', 7.2, 0.3, 0.5, 0, 12, 'meter']] },
    busbar: { label: 'Main LT busbar / PCC · 4000 A', src: 'iot', tags: [
      ['joint_r', 'Joint temperature R phase', '°C', 55, 0.8, 3, 0, 85], ['joint_y', 'Joint temperature Y phase', '°C', 54, 0.8, 3, 0, 85], ['joint_b', 'Joint temperature B phase', '°C', 56, 0.8, 3, 0, 85],
      ['panel_amb', 'Panel ambient temperature', '°C', 38, 0.6, 2.5, 0, 50], ['current', 'Bus current (avg)', 'A', 2650, 90, 380, 0, 4000, 'meter'], ['v_ll', 'Bus voltage (L-L)', 'V', 418, 2, 3, 390, 440, 'meter']] },
    coupler: { label: 'LT bus coupler · 3200 A ACB', src: 'meter', tags: [['current', 'Coupler current', 'A', 0, 0, 0, 0, 3200], ['contact_temp', 'Contact temperature', '°C', 41, 0.6, 2, 0, 85, 'iot']] },
    mcc: { label: 'MCC feeder', src: 'meter', tags: [
      ['kw', 'Active power', 'kW', 640, 30, 110], ['current', 'Current (avg)', 'A', 1020, 45, 170, 0, 1600], ['pf', 'Power factor', '', 0.91, 0.006, 0.01, 0.85, 1.0], ['thd_i', 'Current THD', '%', 11.5, 0.6, 1.2, 0, 25], ['v_unbal', 'Voltage unbalance', '%', 0.9, 0.08, 0.1, 0, 2]] },
    apfc: { label: 'APFC capacitor bank · 1500 kVAr', src: 'meter', tags: [
      ['kvar', 'Reactive power supplied', 'kVAr', 1180, 40, 160, 0, 1500], ['steps_on', 'Steps in service (of 12)', 'steps', 9, 0.4, 1.2, 0, 12], ['pf_bus', 'PCC power factor', '', 0.989, 0.003, 0.003, 0.97, 1.0], ['cap_temp', 'Panel temperature', '°C', 41, 0.6, 2, 0, 55, 'iot']] },
    hfilter: { label: 'Active harmonic filter · 300 A', src: 'meter', tags: [
      ['comp_current', 'Compensating current', 'A', 185, 2, 0, 0, 300], ['thd_i_out', 'Bus current THD after filter', '%', 4.6, 0.25, 0.4, 0, 8], ['filter_temp', 'Filter heatsink temperature', '°C', 47, 0.8, 2, 0, 70, 'iot']] },
    solar: { label: 'Rooftop solar 1 MWp · string inverters', src: 'meter', tags: [
      ['ac_kw', 'AC output', 'kW', 230, 45, 420, 0, 1050], ['irradiance', 'Plane-of-array irradiance', 'W/m²', 260, 40, 480, 0, 1200, 'weather'], ['pr', 'Performance ratio', '%', 79, 0.8, 0], ['inv_temp', 'Inverter temperature', '°C', 44, 1, 8, 0, 70]] },
    ups: { label: 'Online UPS 2 × 200 kVA (parallel)', src: 'bms', tags: [
      ['load_pct', 'Output load', '%', 54, 2, 6, 0, 90], ['backup_min', 'Backup time remaining', 'min', 28, 0.6, 0, 10], ['batt_temp', 'Battery temperature', '°C', 26, 0.4, 1, 0, 35, 'iot'], ['room_temp', 'UPS room temperature', '°C', 24, 0.4, 1, 0, 30, 'iot'], ['input_v', 'Input voltage (L-L)', 'V', 416, 2, 3, 380, 440]] },
    dg: { label: 'Diesel generator 1500 kVA', src: 'bms', tags: [
      ['kw', 'Output power', 'kW', 90, 70, 130, 0, 1250, 'meter'], ['fuel_lph', 'Fuel rate', 'L/h', 27, 18, 38], ['sfc', 'Specific fuel consumption', 'kWh/L', 3.45, 0.05, 0.03, 3.0], ['coolant_temp', 'Coolant temperature', '°C', 72, 1.5, 6, 0, 95],
      ['batt_v', 'Starter battery voltage', 'V', 25.6, 0.1, 0, 23.5], ['run_hours', 'Run hours', 'h', 12450, 0, 0]] },
    vfd_ahu: VFD('VFD · AHU supply fan 45 kW', 41, 24, 44),
    vfd_pump: VFD('VFD · secondary CHW pump 75 kW', 44, 48, 88),
    vfd_ct: VFD('VFD · cooling tower fan 30 kW', 38, 14, 28),
    comp_fixed: COMP('Air compressor 160 kW · fixed speed', 148, 24),
    comp_vsd: COMP('Air compressor 132 kW · VSD', 104, 17.5, true),
    dryer: { label: 'Refrigerated air dryer 60 m³/min', src: 'bms', tags: [['dew_point', 'Pressure dew point', '°C', 4, 0.3, 0.6, 0, 10], ['kw', 'Dryer power', 'kW', 9.5, 0.3, 0.8, 0, 14, 'meter'], ['dp', 'Filter differential pressure', 'bar', 0.22, 0.01, 0.01, 0, 0.5]] },
    airheader: { label: 'Air receiver & main header', src: 'bms', tags: [
      ['header_pressure', 'Header pressure (point of use)', 'bar', 6.9, 0.05, 0.08, 5.8, 7.6], ['flow', 'Total air flow', 'm³/min', 55, 1.5, 7], ['leak_pct', 'Leak load (no-production flow / avg flow)', '%', 14, 0.6, 0, 0, 25],
      ['plant_sp', 'Air plant specific power', 'kW/(m³/min)', 6.4, 0.06, 0.08, 0, 7.2], ['recv_pressure', 'Receiver pressure', 'bar', 7.2, 0.05, 0.06, 6.0, 8.0]] },
    ch_400: CHILLER('Water-cooled screw chiller 400 TR', 215, 330),
    ch_600: CHILLER('Water-cooled centrifugal chiller 600 TR', 300, 480),
    chwpump: { label: 'Primary CHW pump 37 kW', src: 'bms', tags: [['flow', 'CHW flow', 'm³/h', 290, 5, 8], ['dp', 'Pump differential head', 'm', 24, 0.4, 0.6], ['kw', 'Motor power', 'kW', 29, 0.8, 1.2, 0, 37, 'meter']] },
    coolingtower: { label: 'Induced-draft cooling tower 800 TR', src: 'bms', tags: [
      ['approach', 'Approach (CW out − wet bulb)', '°C', 3.6, 0.15, 0.4, 0, 5.5], ['cw_out', 'Cold water out', '°C', 29.9, 0.3, 1.0], ['range', 'Range (CW in − out)', '°C', 4.6, 0.15, 0.5],
      ['wet_bulb', 'Ambient wet bulb', '°C', 26.3, 0.3, 1.4, 0, undefined, 'weather'], ['fan_speed', 'Fan speed', '%', 72, 3, 10, 0, 100]] },
    boiler_gas: { label: 'Gas-fired steam boiler 8 TPH · 10.5 bar', src: 'bms', tags: [
      ['steam_flow', 'Steam flow', 't/h', 5.8, 0.25, 0.8, 0, 8], ['pressure', 'Drum pressure', 'bar', 10.4, 0.08, 0.1, 9.0, 11.5], ['efficiency', 'Boiler efficiency (indirect)', '%', 88.2, 0.3, 0.3, 85],
      ['stack_o2', 'Stack O₂', '%', 3.1, 0.12, 0.1, 1.5, 5], ['stack_temp', 'Stack temperature', '°C', 172, 1.5, 3, 0, 210], ['gas_flow', 'Natural gas flow', 'Sm³/h', 420, 18, 55, 0, 650, 'meter']] },
    boiler_bio: { label: 'Biomass-fired steam boiler 10 TPH · 10.5 bar', src: 'bms', tags: [
      ['steam_flow', 'Steam flow', 't/h', 7.4, 0.3, 0.9, 0, 10], ['pressure', 'Drum pressure', 'bar', 10.3, 0.1, 0.12, 9.0, 11.5], ['efficiency', 'Boiler efficiency (indirect)', '%', 77.6, 0.4, 0.3, 74],
      ['stack_o2', 'Stack O₂', '%', 6.4, 0.2, 0.2, 3, 8], ['stack_temp', 'Stack temperature', '°C', 168, 2, 3, 0, 200], ['fuel_feed', 'Biomass briquette feed', 't/h', 1.72, 0.06, 0.2]] },
    steamheader: { label: 'Main steam header', src: 'bms', tags: [
      ['pressure', 'Header pressure', 'bar', 10.1, 0.08, 0.1, 9.0, 11.0], ['total_flow', 'Total steam generation', 't/h', 13.2, 0.4, 1.4], ['steam_per_unit', 'Steam per unit of output', 'kg/unit', 13.4, 0.2, 0.3, 0, 15.5], ['temp', 'Header temperature', '°C', 184, 0.8, 1]] },
    prds: { label: 'PRDS 10.5 → 4 bar', src: 'bms', tags: [['p_out', 'Outlet pressure', 'bar', 4.0, 0.04, 0.05, 3.5, 4.5], ['t_out', 'Outlet temperature', '°C', 152, 0.8, 1, 0, 165], ['flow', 'LP steam flow', 't/h', 4.6, 0.2, 0.6], ['valve_pos', 'PRV position', '%', 46, 2, 6]] },
    traps: { label: 'Steam trap zone (wireless trap monitoring)', src: 'iot', tags: [
      ['steam_loss', 'Estimated steam loss (failed-open traps)', 'kg/h', 58, 3, 0, 0, 150], ['failed_traps', 'Traps leaking or choked', 'traps', 3, 0.2, 0, 0, 6], ['normal_pct', 'Traps normal', '%', 95, 0.3, 0, 90], ['traps_online', 'Trap nodes online', 'nodes', 64, 0.3, 0, 60]] },
    condensate: { label: 'Condensate recovery station', src: 'bms', tags: [['recovery', 'Condensate recovery', '%', 72, 0.8, 1.5, 60], ['return_temp', 'Return temperature', '°C', 88, 0.8, 1.5], ['flow', 'Condensate return flow', 't/h', 9.4, 0.3, 1.0], ['tank_level', 'Collection tank level', '%', 58, 3, 6, 15, 90]] },
    gasskid: { label: 'PNG metering skid · turbine meter + EVC', src: 'meter', tags: [
      ['flow', 'Corrected gas flow', 'Sm³/h', 560, 22, 70, 0, 900], ['p_in', 'Inlet pressure', 'bar', 19.2, 0.15, 0.3, 14, 24], ['temp', 'Gas temperature', '°C', 27, 0.4, 2.5], ['daily_scm', 'Day-to-date volume', 'Sm³', 6400, 120, 0]] },
    prs: { label: 'Gas pressure regulating station 19 → 4 bar', src: 'meter', tags: [['p_out', 'Outlet pressure', 'bar', 4.0, 0.03, 0.04, 3.4, 4.6], ['filter_dp', 'Filter differential pressure', 'mbar', 120, 4, 6, 0, 300], ['slam_shut', 'Slam-shut status (1 = open)', '', 1, 0, 0]] },
    gasuser: { label: 'Gas consumer · thermic fluid heater 1.0 Mkcal/h', src: 'bms', tags: [['gas_flow', 'Gas flow', 'Sm³/h', 105, 6, 14, 0, 140, 'meter'], ['tf_out', 'Thermic fluid outlet', '°C', 248, 1.5, 2, 0, 280], ['stack_o2', 'Stack O₂', '%', 3.8, 0.15, 0.1, 0, 6]] },
    ro: { label: 'RO plant 40 m³/h', src: 'bms', tags: [['permeate', 'Permeate flow', 'm³/h', 31, 0.8, 2.5], ['feed_p', 'HP pump discharge', 'bar', 11.5, 0.15, 0.2, 0, 15], ['kw', 'HP pump power', 'kW', 34, 0.8, 2, 0, 45, 'meter'], ['sec', 'Specific energy', 'kWh/m³', 1.1, 0.03, 0.03, 0, 1.4]] },
    etp: { label: 'ETP 300 KLD · aeration blowers', src: 'bms', tags: [['inflow', 'Effluent inflow', 'm³/h', 11.5, 0.6, 2.2], ['do', 'Aeration tank DO', 'mg/L', 2.1, 0.08, 0.15, 1.0, 4.0], ['blower_kw', 'Blower power', 'kW', 26, 0.8, 2.5, 0, 37, 'meter']] },
  },
  areas: [
    { id: 'power', name: 'Power network', lines: [
      { id: 'ht-substation', name: 'HT substation · 33 kV', assets: [['GRID-01', '33 kV grid incomer · ABT main meter', 'incomer', 'A'], ['TR-01', 'Power transformer TR-01 · 3.15 MVA', 'transformer', 'A'], ['TR-02', 'Power transformer TR-02 · 3.15 MVA', 'transformer', 'A']] },
      { id: 'main-pcc', name: 'Main LT PCC', assets: [['BB-01', 'PCC busbar section 1 (TR-01)', 'busbar', 'A'], ['BB-02', 'PCC busbar section 2 (TR-02)', 'busbar', 'A'], ['BC-01', 'Bus coupler BB-01 / BB-02', 'coupler', 'A'], ['APFC-01', 'APFC panel 1500 kVAr', 'apfc', 'B'], ['HF-01', 'Active harmonic filter on BB-02', 'hfilter', 'B']] },
      { id: 'mcc-feeders', name: 'MCC feeders', assets: [['MCC-01', 'Process block MCC', 'mcc', 'B'], ['MCC-02', 'Utility MCC (air, water, boiler aux.)', 'mcc', 'B'], ['MCC-03', 'HVAC MCC (chillers, AHUs)', 'mcc', 'B']] },
      { id: 'renewables-backup', name: 'Solar & UPS', assets: [['SOL-01', 'Rooftop solar 1 MWp', 'solar', 'B'], ['UPS-01', 'UPS 2 × 200 kVA · control room & IT', 'ups', 'A']] },
    ] },
    { id: 'dg-sets', name: 'DG sets', lines: [{ id: 'dg-house', name: 'DG house', assets: [['DG-01', 'DG set 1 · 1500 kVA', 'dg', 'A'], ['DG-02', 'DG set 2 · 1500 kVA', 'dg', 'A']] }] },
    { id: 'drives', name: 'Drives (VFD)', lines: [{ id: 'vfd-loads', name: 'VFD-driven loads', assets: [
      ['VFD-01', 'AHU-1 supply fan VFD', 'vfd_ahu', 'C'], ['VFD-02', 'AHU-2 supply fan VFD', 'vfd_ahu', 'C'], ['VFD-03', 'Secondary CHW pump VFD', 'vfd_pump', 'B'], ['VFD-04', 'Cooling tower CT-01 fan VFD', 'vfd_ct', 'B'], ['VFD-05', 'Cooling tower CT-02 fan VFD', 'vfd_ct', 'B']] }] },
    { id: 'compressed-air', name: 'Compressed air', lines: [
      { id: 'compressor-house', name: 'Compressor house', assets: [['AC-01', 'Compressor AC-01 · 160 kW', 'comp_fixed', 'A'], ['AC-02', 'Compressor AC-02 · 160 kW', 'comp_fixed', 'A'], ['AC-03', 'Compressor AC-03 · 132 kW VSD (trim)', 'comp_vsd', 'A'], ['AC-04', 'Compressor AC-04 · 160 kW (standby)', 'comp_fixed', 'C']] },
      { id: 'air-treatment', name: 'Air treatment & distribution', assets: [['ADR-01', 'Refrigerated dryer ADR-01', 'dryer', 'B'], ['AR-01', 'Air receiver 10 m³ & main header', 'airheader', 'A']] },
    ] },
    { id: 'chilled-water', name: 'Chilled water', lines: [
      { id: 'chiller-plant', name: 'Chiller plant', assets: [['CH-01', 'Chiller CH-01 · 400 TR screw', 'ch_400', 'A'], ['CH-02', 'Chiller CH-02 · 600 TR centrifugal', 'ch_600', 'A'], ['CH-03', 'Chiller CH-03 · 400 TR screw (standby)', 'ch_400', 'B'], ['PCHP-01', 'Primary CHW pump 1', 'chwpump', 'B'], ['PCHP-02', 'Primary CHW pump 2', 'chwpump', 'B']] },
      { id: 'condenser-water', name: 'Condenser water', assets: [['CT-01', 'Cooling tower CT-01', 'coolingtower', 'B'], ['CT-02', 'Cooling tower CT-02', 'coolingtower', 'B']] },
    ] },
    { id: 'steam', name: 'Steam & condensate', lines: [
      { id: 'boiler-house', name: 'Boiler house', assets: [['BLR-01', 'Boiler BLR-01 · 8 TPH gas-fired', 'boiler_gas', 'A'], ['BLR-02', 'Boiler BLR-02 · 10 TPH biomass', 'boiler_bio', 'A'], ['SH-01', 'Main steam header', 'steamheader', 'A'], ['PRDS-01', 'PRDS 10.5 → 4 bar', 'prds', 'B']] },
      { id: 'steam-distribution', name: 'Distribution & condensate', assets: [['STZ-01', 'Steam traps · process block (64)', 'traps', 'B'], ['STZ-02', 'Steam traps · utility & tracing (48)', 'traps', 'C'], ['CRS-01', 'Condensate recovery station', 'condensate', 'B']] },
    ] },
    { id: 'gas', name: 'Natural gas', lines: [{ id: 'png', name: 'PNG supply', assets: [['GMS-01', 'PNG metering skid', 'gasskid', 'A'], ['PRS-01', 'Pressure regulating station', 'prs', 'A'], ['TFH-01', 'Thermic fluid heater (gas)', 'gasuser', 'B']] }] },
    { id: 'water', name: 'Water & effluent', lines: [{ id: 'water-plant', name: 'RO & ETP', assets: [['RO-01', 'RO plant 40 m³/h', 'ro', 'C'], ['ETP-01', 'ETP 300 KLD', 'etp', 'C']] }] },
  ],
  kpis: [
    { id: 'sec', name: 'Plant specific energy', unit: 'kWh/unit', group: 'energy', base: 6.48, cur: 6.02, target: 5.7, better: 'down', dec: 2, lakh: 148, owner: 'Energy manager' },
    { id: 'md', name: 'Maximum demand (contract 8,000 kVA)', unit: 'kVA', group: 'cost', base: 7960, cur: 7380, target: 7200, better: 'down', dec: 0, lakh: 24, owner: 'Electrical head' },
    { id: 'pf', name: 'Power factor at billing meter', unit: '', group: 'cost', base: 0.962, cur: 0.989, target: 0.995, better: 'up', dec: 3, lakh: 18, owner: 'Electrical head' },
    { id: 'dgsfc', name: 'DG specific fuel consumption', unit: 'kWh/L', group: 'energy', base: 3.18, cur: 3.46, target: 3.6, better: 'up', dec: 2, lakh: 9, owner: 'Utilities manager' },
    { id: 'air', name: 'Compressed air specific power', unit: 'kW/(m³/min)', group: 'energy', base: 7.1, cur: 6.5, target: 6.0, better: 'down', dec: 1, lakh: 31, owner: 'Utilities manager' },
    { id: 'kwtr', name: 'Chiller plant efficiency', unit: 'kW/TR', group: 'energy', base: 0.76, cur: 0.67, target: 0.6, better: 'down', dec: 2, lakh: 27, owner: 'HVAC in-charge' },
    { id: 'blreff', name: 'Boiler efficiency (steam-weighted)', unit: '%', group: 'energy', base: 79.4, cur: 82.6, target: 84.5, better: 'up', dec: 1, lakh: 46, owner: 'Boiler house in-charge' },
    { id: 'cond', name: 'Condensate recovery', unit: '%', group: 'maintenance', base: 58, cur: 71, target: 80, better: 'up', dec: 0, lakh: 21, owner: 'Utilities manager' },
    { id: 're', name: 'Renewable share (rooftop + green tariff)', unit: '%', group: 'energy', base: 8.1, cur: 14.6, target: 20, better: 'up', dec: 1, lakh: 0, owner: 'Sustainability head' },
    { id: 'cost', name: 'Blended energy cost', unit: '₹/kWh', group: 'cost', base: 8.42, cur: 7.96, target: 7.7, better: 'down', dec: 2, lakh: 0, owner: 'Plant controller' },
  ],
  overview: ['sec', 'md', 'pf', 'air', 'kwtr', 'cost'],
  events: [
    { id: 'm1', asset: 'BB-01', tag: 'joint_y', kind: 'ramp', startHoursAgo: 96, to: 93, health: 34, rulDays: 5, severity: 'bad', minutesAgo: 6, curve: 1.2,
      title: 'BB-01 Y-phase busbar joint at 93 °C, loose or oxidised joint', agent: 'Utility Asset Health Agent', finding: 'Busbar joint hot-spot',
      diagnosis: { title: 'High-resistance bolted joint on the Y-phase riser of BB-01 (TR-01 section)', confidence: 0.87,
        points: ['Y-phase joint temperature rose from 54 to 93 °C in 4 days; the alarm limit is 85 °C. R and B phases on the same joint sit at 58–61 °C.', 'Phase-to-phase difference is above 30 °C at the same bus current (2,600–2,800 A). A difference above 15 °C on like components is a major defect under NETA thermography practice.', 'Panel ambient is normal (38 °C), so this is not a ventilation problem.', 'Last torque check on BB-01 joints was 14 months ago; the May thermography survey showed only a 6 °C difference.', 'Joint I²R heating at this rise adds about 1.8 kW of loss and, left alone, ends in insulation damage or a flashover.'],
        reco: 'Reduce BB-01 load now by staggering MCC-01 batch loads. Book a 4 h section shutdown on Sunday 06:00 with BC-01 closed and TR-02 carrying essential loads (only after HF-01 is back). Clean, re-torque and replace the Belleville washers on the Y-phase joint, then confirm with thermography and the strap trend.' } },
    { id: 'm1b', asset: 'BB-01', tag: 'joint_r', kind: 'ramp', startHoursAgo: 96, to: 60 },
    { id: 'm2', asset: 'AR-01', tag: 'leak_pct', kind: 'ramp', startHoursAgo: 336, to: 30, health: 60, rulDays: 30, severity: 'warn', minutesAgo: 42, curve: 1,
      title: 'Compressed air leak load at 30 %, AC-03 running loaded through Sunday', agent: 'Energy Optimisation Agent', finding: 'Air leaks and high header pressure',
      diagnosis: { title: 'New leaks in the process block distribution, made worse by a high header pressure', confidence: 0.83,
        points: ['No-production air flow on Sunday rose from 7.7 to 16.5 m³/min in two weeks; leak load is now 30 % of average flow (limit 25 %).', 'Air plant specific power rose from 6.4 to 7.0 kW/(m³/min) because AC-03 (VSD) runs near full speed and AC-02 loads more often.', 'Header pressure is held at 6.9 bar while the highest point-of-use need is 6.0 bar; every 1 bar of excess raises compressor power by about 7 % and leak flow with it.', 'The last leak walk-down tagged 41 leaks in August; 9 are still open in CMMS.', 'Extra load is about 52 kW running 24 × 7, or ₹36 L a year at ₹7.96/kWh.'],
        reco: 'Run an ultrasonic leak tagging walk-down in the process block this week (form attached) and close the 9 open leak tags. Lower the header pressure setpoint from 6.9 to 6.4 bar in two steps (proposal drafted). Isolate the idle paint-line header on weekends.' } },
    { id: 'm2b', asset: 'AR-01', tag: 'plant_sp', kind: 'ramp', startHoursAgo: 336, to: 7.0, curve: 1 },
    { id: 'm2c', asset: 'AC-03', tag: 'kw', kind: 'ramp', startHoursAgo: 336, to: 106, curve: 1 },
    { id: 'm3', asset: 'CH-02', tag: 'kw_tr', kind: 'ramp', startHoursAgo: 504, to: 0.80, health: 57, rulDays: 21, severity: 'warn', minutesAgo: 95, curve: 1.2,
      title: 'CH-02 at 0.80 kW/TR, condenser approach 5.6 °C from tube fouling', agent: 'Energy Optimisation Agent', finding: 'Condenser fouling',
      diagnosis: { title: 'Scale and biofilm in the CH-02 condenser tubes', confidence: 0.85,
        points: ['kW/TR rose from 0.63 to 0.80 in 3 weeks at the same cooling load (440–500 TR) and the same condenser water inlet (30.4 °C).', 'Condenser approach climbed from 2.1 to 5.6 °C; CH-01 on the same condenser water header stays at 2.2 °C, so the cooling towers are not the cause.', 'Cooling tower cycles of concentration rose from 4 to 6.5 after the blowdown valve on CT-02 stuck closed (CMMS notification 1004 7781).', 'Last condenser tube cleaning on CH-02 was in February.', 'Excess power is about 80 kW at present load, or ₹1.6 L a month.'],
        reco: 'Swap the lead to CH-01 + CH-03 and brush-clean the CH-02 condenser tubes (one shift). Repair the CT-02 blowdown valve and reset the dosing pump. Run CH-02 last in the sequence until approach is back under 3 °C.' } },
    { id: 'm3b', asset: 'CH-02', tag: 'cond_approach', kind: 'ramp', startHoursAgo: 504, to: 5.6, curve: 1.2 },
    { id: 'm4', asset: 'TR-02', tag: 'wind_temp', kind: 'ramp', startHoursAgo: 150, to: 112, health: 48, rulDays: 14, severity: 'bad', minutesAgo: 18, curve: 1.1,
      title: 'TR-02 winding temperature 112 °C at 66 % load, harmonic filter HF-01 offline', agent: 'Power Quality Agent', finding: 'Harmonic overheating',
      diagnosis: { title: 'Harmonic current on TR-02 doubled after HF-01 tripped, raising stray and eddy losses', confidence: 0.84,
        points: ['WTI rose from 73 to 112 °C in 6 days while load stayed at 55–70 %; the alarm is 105 °C and the trip is 120 °C.', 'HF-01 compensating current fell to zero on the same day (filter heatsink over-temperature trip, cooling fan failed).', 'LV current THD on TR-02 rose from 7 to 14 %; the BB-02 bus feeds the HVAC MCC with 5 VFDs and the AC-03 VSD.', 'Top-oil temperature rose only 6 °C, which points to winding hot-spot (eddy) loss, not cooling.', 'IEC 60076-7 ageing doubles for every 6 °C above a 98 °C hot-spot; at 112 °C TR-02 is ageing about 5 times faster than normal.'],
        reco: 'Replace the HF-01 cooling fan and return the filter to service today (spare in electrical store). Until then cap TR-02 loading at 60 % by sequencing CH-02 behind CH-01 in the afternoon peak. Take an oil sample for DGA this week.' } },
    { id: 'm4b', asset: 'TR-02', tag: 'thd_i', kind: 'ramp', startHoursAgo: 150, to: 14, curve: 0.6 },
    { id: 'm4c', asset: 'HF-01', tag: 'comp_current', kind: 'step', startHoursAgo: 150, to: 4 },
    { id: 'm4d', asset: 'TR-02', tag: 'oil_temp', kind: 'ramp', startHoursAgo: 150, to: 64 },
    { id: 'm5', asset: 'STZ-01', tag: 'steam_loss', kind: 'ramp', startHoursAgo: 720, to: 190, health: 52, rulDays: 20, severity: 'warn', minutesAgo: 160, curve: 1,
      title: 'Steam traps STZ-01: 11 traps failed, about 190 kg/h of steam lost', agent: 'Steam & Thermal Agent', finding: 'Failed steam traps',
      diagnosis: { title: 'Failed-open thermodynamic traps on the 10 bar process header and jacketed vessels', confidence: 0.81,
        points: ['11 of 64 traps in the process block are failed: 8 leaking (outlet above 130 °C at saturation inlet) and 3 choked (inlet and outlet low).', 'Leak rate from trap capacity and ΔP: a ½" TD trap at 10 bar loses about 22 kg/h failed open; 8 such traps account for about 175 kg/h.', 'Steam per unit of output rose from 13.4 to 15.9 kg/unit, and condensate recovery fell from 74 to 66 %.', 'At ₹2,800/t blended steam cost, the loss is about ₹42 L a year.'],
        reco: 'Replace the 8 leaking traps and clear the 3 choked ones this week (list in CMMS PM 2200 1145). Log each repair in the trap register. Move STZ-01 traps onto the monthly critical-trap PM list.' } },
    { id: 'm5b', asset: 'STZ-01', tag: 'failed_traps', kind: 'ramp', startHoursAgo: 720, to: 11, curve: 1 },
    { id: 'm5c', asset: 'SH-01', tag: 'steam_per_unit', kind: 'ramp', startHoursAgo: 720, to: 15.9, curve: 1 },
    { id: 'm5d', asset: 'CRS-01', tag: 'recovery', kind: 'ramp', startHoursAgo: 720, to: 66, curve: 1 },
  ],
  cost: {
    unitLabel: '₹/kWh', budget: 7.7,
    elements: [['Grid energy charge', 5.62], ['Demand charge', 0.86], ['Electricity duty & taxes', 0.58], ['ToD peak-hour surcharge', 0.33], ['DG diesel', 0.31], ['Green tariff premium', 0.22], ['Solar O&M', 0.04]],
    bridge: [['ToD peak-hour use', 0.11], ['DG running during grid dips', 0.07], ['Demand charge above plan', 0.06], ['Green tariff premium', 0.04], ['PF incentive earned', -0.02]],
    lines: [['Power network', 99.8, 96.4, 98.7, 'TR-02 harmonic loading, HF-01 offline'], ['DG sets', 99.1, 95.8, 99.5, 'DG-02 low load running'], ['Compressed air', 98.9, 88.6, 97.2, 'Leak load 30 %'],
      ['Chilled water', 99.2, 89.4, 98.4, 'CH-02 condenser fouling'], ['Steam & condensate', 98.6, 91.0, 96.9, 'STZ-01 failed traps'], ['Natural gas', 99.9, 98.2, 99.6, 'TFH-01 excess O₂'], ['Water & effluent', 98.4, 94.1, 99.0, 'RO membrane fouling']],
    losses: [['Compressor unload running', 286], ['Chiller low ΔT', 212], ['Idle HVAC (nights & holidays)', 188], ['Steam trap losses', 164], ['DG running vs grid', 96], ['PF penalty exposure', 41]],
  },
  quality: {
    defects: [['Voltage sags (> 10 %, < 1 s)', 38], ['THD-I above IEEE 519 at TR-02 LV', 26], ['Voltage unbalance > 2 %', 14], ['15-min PF below 0.97', 11], ['UPS transfers to battery', 7], ['Voltage swells', 6], ['Frequency excursions', 3]],
    spc: { asset: 'GRID-01', tag: 'pf', name: 'Billing meter power factor (15-min)', lsl: 0.97, usl: 1.0 }, inspect: null,
  },
  energy: { contractKVA: 8000, scale: 1, meter: ['GRID-01', 'kva'],
    areas: [['Process MCCs', 46], ['HVAC & chilled water', 20], ['Compressed air', 14], ['Steam & boiler auxiliaries', 6], ['Lighting & offices', 5], ['Water & ETP', 4], ['Transformer & cable losses', 5]],
    utilities: [['TR-01', 'kw'], ['TR-02', 'kw'], ['SOL-01', 'ac_kw'], ['DG-01', 'kw'], ['AR-01', 'flow'], ['AC-03', 'kw'], ['CH-02', 'kw'], ['BLR-01', 'gas_flow'], ['GMS-01', 'flow']] },
  maintenance: { spotlight: 'BB-01' },
  approvals: [
    { id: 'a1', from: 'Utility Asset Health Agent', minutesAgo: 5, title: 'Approve WO 4300 2216 · BB-01 Y-phase joint re-torque (Sunday shutdown)', policy: 'P-03',
      table: [['Equipment', 'BB-01 · PCC busbar section 1'], ['Job', 'Clean, re-torque, replace Belleville washers, thermography after'], ['Window', 'Sunday 06:00–10:00 · BC-01 closed'], ['Pre-condition', 'HF-01 back in service, TR-02 below 60 %'], ['Cost', '₹48,500 incl. hardware kit']], prompt: 'Why is BB-01 Y-phase joint temperature rising?' },
    { id: 'a2', from: 'Energy Optimisation Agent', minutesAgo: 38, title: 'Approve header pressure setpoint 6.9 → 6.4 bar (AR-01)', policy: 'P-02',
      table: [['Change', 'Sequencer band 7.3/6.9 → 6.8/6.4 bar'], ['Highest user need', '6.0 bar (paint line guns)'], ['Impact', '−3.5 % compressor kWh · ₹12 L/yr'], ['Verification', '7 days of point-of-use pressure, no low-pressure alarms']], prompt: 'Why is compressed air specific power rising?' },
    { id: 'a3', from: 'Steam & Thermal Agent', minutesAgo: 120, title: 'Approve purchase: 14 thermodynamic steam traps · ₹2.9 L', policy: 'P-04',
      table: [['Requisition', 'PR 1300 4471'], ['Amount', '₹2,90,000'], ['Scope', '8 leaking + 3 choked in STZ-01, 3 spares'], ['Payback', 'About 4 weeks (₹42 L/yr steam)']], prompt: 'Which steam traps are failed in STZ-01 and what do they cost?' },
  ],
  docs: [
    { id: 'd1', name: 'Power transformer O&M manual · 3.15 MVA ONAN', type: 'OEM manual', obj: 'TR-01, TR-02', pages: 142, cited: 22, pass: [['WTI alarm at 105 °C and trip at 120 °C. Derate the transformer when current THD exceeds 10 % (K-factor above 4).', 'p. 37'], ['Take an oil sample for DGA after any sustained winding temperature excursion above the alarm setting.', 'p. 88']] },
    { id: 'd2', name: 'IEEE 519-2022 · harmonic control · site limits', type: 'Standard', obj: 'GRID-01, TR-01, TR-02', pages: 31, cited: 14, pass: [['For ISC/IL of 20–50 at the point of common coupling, total demand distortion shall not exceed 8 %.', 'Table 2'], ['Voltage THD at buses up to 1 kV shall not exceed 8 %; plant target is 5 %.', 'Table 1']] },
    { id: 'd3', name: 'SOP · LT panel and busbar maintenance', type: 'SOP', obj: 'BB-01, BB-02, BC-01', pages: 16, cited: 11, pass: [['Re-torque busbar joints to the value on the panel drawing every 12 months, and after any joint temperature alarm.', 'Step 4'], ['A phase-to-phase difference above 15 °C at the same load is a major defect: repair at the next available shutdown.', 'Annex B']] },
    { id: 'd4', name: 'Centrifugal chiller 600 TR · service manual', type: 'OEM manual', obj: 'CH-02', pages: 268, cited: 9, pass: [['Condenser approach above 4 °C at full load indicates fouled tubes. Clean tubes when approach rises 2 °C over the clean baseline.', 'p. 191']] },
    { id: 'd5', name: 'BEE guide · compressed air system energy audit', type: 'Guideline', obj: 'AC-01…AC-04, AR-01', pages: 44, cited: 12, pass: [['Leakage above 10 % of capacity indicates poor maintenance. Measure by the load–unload test with no air demand.', 'Section 3.4'], ['Reducing delivery pressure by 1 bar saves about 6–7 % of compressor power.', 'Section 4.2']] },
    { id: 'd6', name: 'MERC tariff order · HT-I industrial (MSEDCL)', type: 'Tariff', obj: 'GRID-01', pages: 58, cited: 16, pass: [['Billing demand is the higher of actual maximum demand and 75 % of contract demand.', 'Clause 7.2'], ['Power factor incentive applies above 0.95 on the kVAh billing basis; ToD peak hours are 18:00–22:00.', 'Clause 9.1']] },
  ],
  skills: [
    { id: 'demand-control', name: 'Maximum demand control', pack: 'Faclon · Energy', ver: '2.3', steps: ['Read live kVA on GRID-01 every minute.', 'Project the running 15-min block.', 'Rank deferrable loads by kW and priority.', 'Alert the shift and suggest loads to stagger.', 'Log the peak and its cause.'] },
    { id: 'power-quality', name: 'Power quality diagnosis', pack: 'Faclon · Energy', ver: '1.9', steps: ['Read THD, unbalance and PF by meter.', 'Compare with IEEE 519 and plant limits.', 'Find the load or filter that changed.', 'Estimate transformer and capacitor stress.', 'Recommend a fix.'] },
    { id: 'utility-efficiency', name: 'Utility efficiency drift', pack: 'Faclon · Energy', ver: '3.0', steps: ['Compute kW/TR, kW/(m³/min), boiler efficiency and DG kWh/L.', 'Compare at the same load and weather.', 'Separate leak, fouling, setpoint and sequencing causes.', 'Cost the drift in kWh and ₹.'] },
    { id: 'electrical-health', name: 'Electrical asset health', pack: 'Faclon · Reliability', ver: '1.6', steps: ['Read busbar joint, transformer and UPS temperatures.', 'Compare phases and history at the same load.', 'Grade severity and remaining life.', 'Draft the work order and shutdown window.'] },
    { id: 'steam-trap-loss', name: 'Steam trap loss accounting', pack: 'Faclon · Thermal', ver: '1.4', steps: ['Read trap inlet and outlet temperatures.', 'Classify leaking, choked, flooded, isolated.', 'Estimate kg/h from trap capacity and ΔP.', 'Cost the loss and list traps to replace.'] },
    { id: 'daily-energy-report', name: 'Meridian daily energy report', pack: 'Private · Meridian', ver: '1.2', steps: ['Energy, SEC and cost vs target by utility.', 'MD, PF and ToD use.', 'Top 5 drifts with ₹ impact and owner.', 'Send by email at 08:00 IST.'] },
  ],
  schedules: [
    ['Daily energy & utilities report', 'Report', 'Daily Energy Report Agent', 'Daily · 08:00 IST', 'Plant head, energy cell, utilities, electrical (11)'],
    ['Hourly feeder kWh & shift split', 'Excel', 'Energy Optimisation Agent', 'Daily · 07:15 IST', 'Department heads (9)'],
    ['Weekly power quality review', 'Report', 'Power Quality Agent', 'Weekly · Mon 09:00', 'Electrical team (5)'],
    ['Monthly bill reconciliation', 'Excel', 'Demand & Tariff Agent', 'Monthly · 5th 10:00', 'Plant controller, energy manager (4)'],
    ['Monthly energy review', 'Deck', 'Energy Optimisation Agent', 'Monthly · 3rd 11:00', 'Leadership, ISO 50001 team (8)'],
  ],
  workflows: [
    ['Maximum demand guard', [['Trigger', 'Projected 15-min kVA > 7,600'], ['Agent', 'Demand & Tariff · rank deferrable loads'], ['Action', 'SMS and Teams alert to shift electrical'], ['Action', 'Log peak and loads behind it']]],
    ['Electrical hot-spot to repair', [['Trigger', 'Busbar joint > 85 °C or phase difference > 15 °C'], ['Agent', 'Utility Asset Health · diagnose and grade'], ['Approval', 'Electrical head'], ['Action', 'SAP PM · work order and shutdown slot']]],
    ['Utility efficiency drift', [['Trigger', 'kW/TR, kW/(m³/min) or boiler efficiency outside band for 24 h'], ['Agent', 'Energy Optimisation · find cause and cost it'], ['Approval', 'Utilities manager for setpoint changes'], ['Action', 'Setpoint change note to BMS / PLC owner']]],
    ['Steam trap failure', [['Trigger', 'Trap status leaking or choked for 12 h'], ['Agent', 'Steam & Thermal · steam loss in kg/h and ₹'], ['Action', 'CMMS · add to critical-trap PM list']]],
  ],
  agents: makeAgents('ems', [
    { key: 'energy-optimizer', name: 'Energy Optimisation Agent', domain: 'energy', version: '3.0.0', uns: UNS, instructions: 'Track specific energy and the efficiency of every utility (air, chilled water, DG, solar). Find drift at the same load and weather, cost it in kWh and ₹, and propose setpoint changes for approval.',
      skills: ['utility-efficiency', 'demand-control'], tools: [...T, 'weather.get_forecast'], triggers: [{ type: 'prompt' }, { type: 'schedule', cron: '0 6 * * *' }], autonomy: 'act_with_approval', policies: ['P-01', 'P-02'], canCall: ['ems.utility-health'] },
    { key: 'power-quality', name: 'Power Quality Agent', domain: 'quality', version: '1.9.0', uns: UNS, instructions: 'Watch PF, THD, unbalance, voltage and frequency from the incomer to the MCCs. Link each excursion to the load or filter that changed and estimate stress on transformers and capacitors.',
      skills: ['power-quality'], tools: ['plantdb.get_quality', 'plantdb.get_tag_history', 'plantdb.diagnose_asset', 'plantdb.get_energy'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'thd_i > limit or pf < 0.97' }] },
    { key: 'utility-health', name: 'Utility Asset Health Agent', domain: 'maintenance', version: '1.6.0', uns: UNS, instructions: 'Watch busbar joints, transformers, UPS, DG sets and drives. Grade health, estimate remaining life and draft SAP PM work orders and shutdown windows for approval.',
      skills: ['electrical-health'], tools: [...T, 'sap_pm.create_notification', 'sap_pm.create_order'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'health < 50' }], autonomy: 'act_with_approval', policies: ['P-01', 'P-03', 'P-04'] },
    { key: 'demand-tariff', name: 'Demand & Tariff Agent', domain: 'cost', version: '1.4.0', uns: UNS, instructions: 'Guard maximum demand, track ToD use, PF incentive and green tariff, and reconcile the monthly bill against metered kWh, kVAh and demand.',
      skills: ['demand-control'], tools: ['plantdb.get_energy', 'plantdb.get_kpis', 'plantdb.get_kpi_trend', 'tariff.get_bill', 'sap_co.get_actuals'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'projected_kva > 7600' }] },
    { key: 'thermal', name: 'Steam & Thermal Agent', domain: 'process', version: '1.4.0', uns: UNS, instructions: 'Track boiler efficiency, stack O₂, steam per unit, condensate recovery, trap losses and gas use. Cost every loss and propose combustion and trap actions.',
      skills: ['steam-trap-loss', 'utility-efficiency'], tools: ['plantdb.get_tag_history', 'plantdb.diagnose_asset', 'plantdb.get_kpi_trend', 'plantdb.get_asset_health'], triggers: [{ type: 'prompt' }, { type: 'schedule', cron: '0 7 * * *' }] },
    { key: 'daily-report', name: 'Daily Energy Report Agent', domain: 'reports', version: '1.2.0', uns: UNS, instructions: 'Write the daily energy and utilities report: energy, SEC and cost against target, MD and PF, top drifts with ₹ impact, and open alerts.',
      skills: ['daily-energy-report'], tools: ['plantdb.get_energy', 'plantdb.get_kpis', 'plantdb.get_production', 'plantdb.list_messages', 'msg.send_email'], triggers: [{ type: 'schedule', cron: '0 8 * * *' }, { type: 'prompt' }], autonomy: 'act' },
  ]),
  suggestions: ['What needs my attention across the utilities today?', 'Why is BB-01 Y-phase joint temperature rising?', 'Why is TR-02 winding temperature high?', 'Why is CH-02 kW/TR rising and what is it costing?', 'How much compressed air is AR-01 losing to leaks?', 'Write the daily energy report with MD, PF and SEC'],
  sources: {
    meter: { name: 'Energy & flow meters', kind: 'OT · Meters', via: 'I/O Connect · Modbus RTU/TCP', detail: '118 multifunction meters, PNG EVC, air and CHW flow meters on RS-485 loops' },
    scada: { name: 'Substation SCADA', kind: 'OT · SCADA', via: 'I/O Connect · IEC 60870-5-104', detail: '33 kV breakers, transformer OTI/WTI, OLTC, bus voltage and frequency' },
    bms: { name: 'Utility PLCs & BMS', kind: 'OT · PLC / BMS', via: 'I/O Connect · BACnet/IP, OPC UA, SNMP', detail: 'Chiller plant, AHUs, compressor sequencer, boilers, PRDS, DG controllers, UPS cards' },
    iot: { name: 'Wireless condition sensors', kind: 'OT · Wireless IoT', via: 'LoRa / RF gateways · MQTT', detail: 'Busbar joint straps (R/Y/B), steam trap nodes, room and battery temperature' },
    historian: { name: 'Plant historian', kind: 'IT · Historian', via: 'I/O Connect · REST', detail: 'Five years of 1-min utility data' },
    erp: { name: 'SAP S/4HANA (PM, MM, CO, PP)', kind: 'IT · ERP', via: 'SAP connector · OData', detail: 'Production output, cost centres, purchase' },
    cmms: { name: 'CMMS · work orders & permits', kind: 'IT · CMMS', via: 'REST API' },
    tariff: { name: 'Utility bills & tariff (MSEDCL, PNG supplier)', kind: 'IT · Billing', via: 'Bill upload · REST', detail: 'HT bills, ToD slabs, green tariff, gas invoices' },
    weather: { name: 'Weather service', kind: 'IT · Weather', via: 'REST API', detail: 'Dry bulb, wet bulb, irradiance and forecast for Chakan' },
  },
  setpoints: [
    { asset: 'AR-01', tag: 'header_pressure', name: 'Compressor header pressure setpoint', current: 6.9, recommended: 6.4, unit: 'bar', lo: 6.0, hi: 7.5, gain: '−3.5 % compressor kWh · ₹12 L/yr', kpi: 'air',
      reason: 'The highest point-of-use need is 6.0 bar (paint line). Header pressure has 0.9 bar of margin; every 1 bar costs about 7 % of compressor power and raises leak flow.', confidence: 0.84, status: 'proposed' },
    { asset: 'CH-01', tag: 'chws', name: 'CHW supply temperature reset at part load', current: 7.0, recommended: 8.0, unit: '°C', lo: 6.5, hi: 9.0, gain: '−0.03 kW/TR · ₹14 L/yr', kpi: 'kwtr',
      reason: 'AHU valves sit below 70 % open for 16 h a day and space humidity stays under 55 % RH. Each 1 °C rise in CHW supply cuts chiller power by about 3 %.', confidence: 0.8, status: 'approved' },
    { asset: 'CT-01', tag: 'approach', name: 'Cooling tower fan VFD approach setpoint', current: 4.0, recommended: 3.0, unit: '°C', lo: 2.0, hi: 5.0, gain: '−22 kW net (chillers − fans) · ₹15 L/yr', kpi: 'kwtr',
      reason: 'At the current wet bulb the chillers save about 2.5 % per 1 °C colder condenser water, more than the extra fan power on VFD-04 and VFD-05.', confidence: 0.76, status: 'proposed' },
    { asset: 'BLR-02', tag: 'stack_o2', name: 'Biomass boiler excess O₂ trim', current: 6.4, recommended: 5.0, unit: '%', lo: 4.0, hi: 7.0, gain: '+1.2 % boiler efficiency · ₹16 L/yr', kpi: 'blreff',
      reason: 'Stack O₂ has run at 6–7 % since the ID fan damper was replaced; CO stays below 100 ppm down to 4.5 % O₂ in the trial on 18 Nov.', confidence: 0.82, status: 'applied' },
    { asset: 'APFC-01', tag: 'pf_bus', name: 'APFC target power factor', current: 0.97, recommended: 0.995, unit: '', lo: 0.95, hi: 1.0, gain: 'PF incentive ₹11 L/yr', kpi: 'pf',
      reason: 'The APFC switches off steps at 0.97, so billing PF dips to 0.96–0.97 at night. Raising the target keeps PF above the incentive slab with 3 spare steps available.', confidence: 0.86, status: 'approved' },
  ],
  forms: [
    { id: 'dg-log', name: 'DG daily log sheet', desc: 'Daily check and run log for each DG set, filled by the shift electrician.', sections: [
      { title: 'DG and shift', fields: [
        { id: 'asset', label: 'DG set', type: 'asset', required: true },
        { id: 'date', label: 'Date', type: 'date', required: true },
        { id: 'shift', label: 'Shift', type: 'radio', options: ['A', 'B', 'C'], required: true }] },
      { title: 'Pre-start checks', fields: [
        { id: 'checks', label: 'Checks', type: 'checklist', options: ['Engine oil level OK', 'Coolant level OK', 'Fuel day tank above 50 %', 'Battery voltage above 24 V', 'No leaks (oil, fuel, coolant)', 'Air filter indicator green'], required: true },
        { id: 'fuel_level', label: 'Day tank level', type: 'number', unit: 'L' }] },
      { title: 'Run log', fields: [
        { id: 'start', label: 'Start time', type: 'time' },
        { id: 'stop', label: 'Stop time', type: 'time' },
        { id: 'reason', label: 'Reason for running', type: 'select', options: ['Grid failure', 'Grid voltage dip', 'Weekly no-load test', 'Load test', 'Peak shaving'] },
        { id: 'kwh', label: 'Energy generated', type: 'number', unit: 'kWh' },
        { id: 'fuel', label: 'Diesel consumed', type: 'number', unit: 'L', help: 'SFC below 3.2 kWh/L at > 50 % load needs a check.' },
        { id: 'coolant', label: 'Max coolant temperature', type: 'number', unit: '°C' },
        { id: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'e.g. Ran 42 min on grid dip at 14:10, load 720 kW' },
        { id: 'sign', label: 'Shift electrician', type: 'signature', required: true }] },
    ] },
    { id: 'air-leak-walkdown', name: 'Compressed air leak tagging walk-down', desc: 'Energy audit walk-down with an ultrasonic detector. One entry per leak tag.', sections: [
      { title: 'Walk-down', fields: [
        { id: 'date', label: 'Date', type: 'date', required: true },
        { id: 'area', label: 'Area', type: 'select', options: ['Process block', 'Paint line', 'Assembly hall', 'Utility block', 'Stores'], required: true },
        { id: 'header', label: 'Header pressure at start', type: 'number', unit: 'bar' },
        { id: 'auditor', label: 'Auditor', type: 'text', required: true }] },
      { title: 'Leak tag', fields: [
        { id: 'tag_no', label: 'Leak tag number', type: 'text', placeholder: 'AL-0412', required: true },
        { id: 'location', label: 'Location / equipment', type: 'text', required: true },
        { id: 'component', label: 'Leaking component', type: 'select', options: ['Quick coupling', 'FRL unit', 'Hose / pipe joint', 'Solenoid valve', 'Drain valve', 'Cylinder seal', 'Other'], required: true },
        { id: 'size', label: 'Leak size', type: 'radio', options: ['Small (< 0.2 m³/min)', 'Medium (0.2–0.5 m³/min)', 'Large (> 0.5 m³/min)'], required: true },
        { id: 'db', label: 'Ultrasonic reading', type: 'number', unit: 'dB' },
        { id: 'fix_now', label: 'Fixed on the spot', type: 'checkbox' },
        { id: 'photo', label: 'Photo reference', type: 'text', placeholder: 'IMG_2231' }] },
      { title: 'Close-out', fields: [
        { id: 'summary', label: 'Leaks tagged and estimated flow', type: 'textarea', placeholder: 'e.g. 23 leaks, about 6.5 m³/min' },
        { id: 'sign', label: 'Energy manager', type: 'signature', required: true }] },
    ] },
    { id: 'transformer-inspection', name: 'Monthly transformer inspection', desc: 'Monthly visual and instrument check of TR-01 and TR-02.', sections: [
      { title: 'Transformer', fields: [
        { id: 'asset', label: 'Transformer', type: 'asset', required: true },
        { id: 'date', label: 'Inspection date', type: 'date', required: true },
        { id: 'load', label: 'Load at inspection', type: 'number', unit: '%' }] },
      { title: 'Readings', fields: [
        { id: 'oti', label: 'OTI reading', type: 'number', unit: '°C', required: true },
        { id: 'wti', label: 'WTI reading', type: 'number', unit: '°C', required: true, help: 'Alarm 105 °C, trip 120 °C.' },
        { id: 'tap', label: 'OLTC tap position', type: 'number' },
        { id: 'oil_level', label: 'Conservator oil level', type: 'radio', options: ['Normal', 'Low', 'High'], required: true }] },
      { title: 'Visual checks', fields: [
        { id: 'visual', label: 'Checks', type: 'checklist', options: ['Silica gel blue / orange (not exhausted)', 'No oil leak at gaskets or valves', 'Buchholz relay no gas', 'Bushings clean, no cracks', 'Earthing connections tight', 'Cooling fins clear', 'Marshalling box dry'] },
        { id: 'condition', label: 'Overall condition', type: 'rating' },
        { id: 'action', label: 'Actions needed', type: 'textarea', placeholder: 'e.g. Replace silica gel, schedule DGA sample' },
        { id: 'sign', label: 'Electrical engineer', type: 'signature', required: true }] },
    ] },
  ],
  dashNames: { kpis: 'Energy KPIs', overview: 'Energy overview', maintenance: 'Utility asset health', cost: 'Energy cost & losses', quality: 'Power quality', energy: 'Power & demand' },
  realtime: { title: 'Utilities live · Campus 1', assets: ['GRID-01', 'TR-02', 'BB-01', 'DG-01', 'AC-03', 'AR-01', 'CH-02', 'CT-01', 'BLR-01', 'BLR-02', 'STZ-01', 'GMS-01'] },
};
