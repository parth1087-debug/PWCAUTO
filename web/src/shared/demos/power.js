import { makeAgents, PLANTDB_TOOLS as T } from '../common.js';

const UNS = 'vindhya/cpp-unit-1';
/* boiler heat-transfer section for soot blowing: cleanliness, absorption, gas ΔT, metal temp, hours since last blow */
const SECTION = (label, cf, cfLo, mwth, gasDt, metal, metalHi, sbH) => ({ label, src: 'dcs', tags: [
  ['cf', 'Cleanliness factor', '%', cf, 0.7, 0, cfLo, undefined, 'perf'], ['absorption', 'Heat absorption', 'MWth', mwth, mwth * 0.015, mwth * 0.04],
  ['gas_dt', 'Flue gas ΔT across section', '°C', gasDt, 2.5, 4], ['metal_temp', 'Tube metal temperature (max)', '°C', metal, 2.5, 2, 0, metalHi],
  ['sb_hours', 'Hours since last soot blow', 'h', sbH, 1.2, 0]] });
/* rotating drive: motor current, power, vane / pitch / scoop position, vibration, bearing temperature */
const FAN = (label, amps, kw, posName, pos) => ({ label, src: 'dcs', tags: [
  ['current', 'Motor current', 'A', amps, amps * 0.02, amps * 0.05, 0, amps * 1.35], ['kw', 'Motor power', 'kW', kw, kw * 0.02, kw * 0.05],
  ['igv', posName, '%', pos, 1.2, 3, 0, 95], ['vib', 'Bearing vibration (NDE, velocity)', 'mm/s', 2.6, 0.15, 0, 0, 7.1, 'cms'],
  ['brg_temp', 'Bearing temperature', '°C', 56, 0.6, 1.5, 0, 85]] });
const MILL = (label, run) => ({ label, src: 'dcs', tags: [
  ['coal_flow', 'Coal flow (feeder)', 't/h', run ? 15.2 : 0, run ? 0.35 : 0, run ? 0.9 : 0, 0, 18], ['outlet_temp', 'Mill outlet temperature', '°C', run ? 76 : 38, run ? 0.8 : 0.3, run ? 1 : 2, run ? 65 : 0, 90],
  ['current', 'Motor current', 'A', run ? 24 : 0, run ? 0.5 : 0, run ? 1 : 0, 0, 32], ['kw', 'Motor power', 'kW', run ? 215 : 0, run ? 5 : 0, run ? 10 : 0],
  ['dp', 'Mill differential pressure', 'mmWC', run ? 285 : 0, run ? 5 : 0, run ? 8 : 0, 0, 340], ['pa_flow', 'Primary air flow', 't/h', run ? 30 : 0, run ? 0.6 : 0, run ? 1.2 : 0, run ? 24 : 0, 40]] });
const BFP = (label, run) => ({ label, src: 'dcs', tags: [
  ['current', 'Motor current', 'A', run ? 112 : 0, run ? 1.5 : 0, run ? 5 : 0, 0, 130], ['kw', 'Motor power', 'kW', run ? 1050 : 0, run ? 14 : 0, run ? 45 : 0],
  ['flow', 'Feed water flow', 't/h', run ? 166 : 0, run ? 2.5 : 0, run ? 7 : 0], ['dis_press', 'Discharge pressure', 'bar', run ? 162 : 0, run ? 0.8 : 0, run ? 2 : 0],
  ['scoop', 'Hydraulic coupling scoop position', '%', run ? 64 : 0, run ? 1 : 0, run ? 3 : 0, 0, 92], ['recirc_flow', 'Recirculation (ARC) flow', 't/h', run ? 3 : 0, run ? 0.4 : 0, 0, 0, 12],
  ['vib', 'Pump bearing vibration', 'mm/s', run ? 2.4 : 0.3, run ? 0.12 : 0.05, 0, 0, 7.1, 'cms']] });
const CEP = (label, run) => ({ label, src: 'dcs', tags: [
  ['current', 'Motor current', 'A', run ? 18 : 0, run ? 0.3 : 0, run ? 0.8 : 0, 0, 24], ['kw', 'Motor power', 'kW', run ? 165 : 0, run ? 3 : 0, run ? 7 : 0],
  ['dis_press', 'Discharge pressure', 'bar', run ? 22 : 0, run ? 0.2 : 0, run ? 0.4 : 0], ['flow', 'Condensate flow', 't/h', run ? 265 : 0, run ? 3 : 0, run ? 10 : 0],
  ['vib', 'Pump vibration', 'mm/s', run ? 1.8 : 0.2, run ? 0.1 : 0.03, 0, 0, 7.1, 'cms']] });
const HEATER = (label, ttd, dca, ext, fwOut) => ({ label, src: 'dcs', tags: [
  ['ttd', 'Terminal temperature difference', '°C', ttd, 0.15, 0, 0, ttd + 2.5], ['dca', 'Drain cooler approach', '°C', dca, 0.25, 0, 0, dca + 4],
  ['ext_flow', 'Extraction steam flow', 't/h', ext, ext * 0.02, ext * 0.05], ['fw_out', 'Feed water outlet temperature', '°C', fwOut, 0.6, 2, fwOut - 8, undefined],
  ['level', 'Shell drain level', 'mm', 300, 8, 0, 150, 450]] });

export default {
  id: 'power', continuous: true, name: 'Power plant', industry: 'Thermal power · 100 MW pulverised-coal unit with captive load',
  company: 'Vindhya Power & Metals', companySlug: 'vindhya', site: 'Captive Power Plant · Unit 1', siteSlug: 'cpp-unit-1', location: 'Katni, Madhya Pradesh',
  production: { unit: 'MWh', planPerDay: 2200, label: 'Gross generation at GEN-01 terminals', massUnit: 'MWh' },
  classes: {
    boiler: { label: 'Boiler 330 t/h · 130 bar · 540/540 °C (PF, tangential)', src: 'dcs', tags: [
      ['ms_flow', 'Main steam flow', 't/h', 318, 4, 14, 0, 345], ['ms_press', 'Main steam pressure (SH outlet)', 'bar', 128, 0.6, 1.5, 118, 136],
      ['ms_temp', 'Main steam temperature', '°C', 538, 1.2, 0, 528, 545], ['rh_temp', 'Hot reheat temperature', '°C', 536, 1.5, 0, 525, 545],
      ['drum_level', 'Drum level', 'mm', -10, 6, 0, -100, 100], ['furnace_draft', 'Furnace draft', 'mmWC', -8, 0.8, 0, -20, -3],
      ['o2', 'Excess O₂ (economiser outlet)', '%', 3.4, 0.12, 0.1, 2.5, 4.5], ['eff', 'Boiler efficiency (heat-loss method)', '%', 86.4, 0.25, 0, 84.5, undefined, 'perf']] },
    furnace: { label: 'Furnace and burners · 5 elevations', src: 'dcs', tags: [
      ['fegt', 'Furnace exit gas temperature', '°C', 1085, 8, 10, 0, 1150], ['flame', 'Flame scanner intensity (average)', '%', 88, 1.5, 0, 70, undefined],
      ['tilt', 'Burner tilt', '°', 2, 0.4, 0, -30, 30], ['sadc', 'SADC auxiliary air damper position (average)', '%', 46, 1.5, 2, 0, 90],
      ['windbox_dp', 'Windbox to furnace ΔP', 'mmWC', 125, 2, 2, 100, 140]] },
    ww: SECTION('Water walls (furnace)', 90, 78, 148, 780, 395, 430, 6),
    sh: SECTION('Platen and final superheater', 84, 76, 64, 230, 568, 590, 14),
    rh: SECTION('Reheater', 86, 76, 46, 160, 578, 600, 18),
    eco: { label: 'Economiser', src: 'dcs', tags: [
      ['cf', 'Cleanliness factor', '%', 85, 0.7, 0, 75, undefined, 'perf'], ['absorption', 'Heat absorption', 'MWth', 30, 0.5, 1.2],
      ['gas_in', 'Flue gas inlet temperature', '°C', 478, 2.5, 6], ['gas_out', 'Flue gas outlet temperature', '°C', 362, 2, 5, 0, 385],
      ['fw_out', 'Feed water outlet temperature', '°C', 282, 1, 2], ['sb_hours', 'Hours since last soot blow', 'h', 20, 1.5, 0]] },
    aph: { label: 'Rotary air preheater (bi-sector)', src: 'dcs', tags: [
      ['gas_in', 'Flue gas inlet temperature', '°C', 362, 2, 5], ['gas_out', 'Flue gas exit temperature (corrected)', '°C', 138, 1.2, 3, 0, 150],
      ['air_out', 'Secondary air outlet temperature', '°C', 318, 2, 4], ['dp', 'Gas-side differential pressure', 'mmWC', 115, 2, 4, 0, 150],
      ['leakage', 'Air-in leakage', '%', 8.5, 0.2, 0, 0, 12, 'perf']] },
    att: { label: 'Attemperation (SH and RH spray)', src: 'dcs', tags: [
      ['sh_spray', 'SH spray flow', 't/h', 8, 0.6, 1.5, 0, 15], ['rh_spray', 'RH spray flow', 't/h', 1.2, 0.2, 0.3, 0, 4],
      ['sh_valve', 'SH spray control valve opening', '%', 34, 2, 4, 0, 80]] },
    esp: { label: 'Electrostatic precipitator · 2 passes × 3 fields', src: 'dcs', tags: [
      ['f1_current', 'Field 1 secondary current', 'mA', 620, 15, 20, 300, undefined], ['f2_current', 'Field 2 secondary current', 'mA', 680, 15, 20, 300, undefined],
      ['f3_current', 'Field 3 secondary current', 'mA', 720, 15, 20, 300, undefined], ['spm', 'Outlet dust (opacity)', 'mg/Nm³', 38, 1.5, 2, 0, 50],
      ['kw', 'TR-set power', 'kW', 310, 8, 12], ['gas_dt', 'Gas temperature drop across ESP', '°C', 6, 0.3, 0, 0, 8]] },
    stack: { label: 'Stack · CEMS', src: 'dcs', tags: [
      ['co', 'CO', 'ppm', 70, 6, 8, 0, 200], ['nox', 'NOx', 'mg/Nm³', 245, 6, 10, 0, 300], ['sox', 'SO₂', 'mg/Nm³', 480, 10, 15, 0, 600],
      ['temp', 'Stack gas temperature', '°C', 132, 1, 3], ['o2', 'Stack O₂', '%', 5.2, 0.15, 0.1]] },
    mill: MILL('Bowl mill · XRP type, 17 t/h', true),
    millsb: MILL('Bowl mill · XRP type, 17 t/h (standby)', false),
    idfan: FAN('ID fan · radial, IGV control', 47, 430, 'Inlet guide vane position', 62),
    fdfan: FAN('FD fan · axial, blade pitch control', 21, 190, 'Blade pitch position', 48),
    pafan: FAN('PA fan · radial, IGV control', 36, 330, 'Inlet guide vane position', 58),
    tg: { label: 'Steam turbine · 100 MW reheat, condensing (HP/IP/LP)', src: 'dcs', tags: [
      ['load', 'Turbine load', 'MW', 91.7, 0.8, 5, 0, 105], ['thr', 'Turbine heat rate', 'kcal/kWh', 2075, 5, 4, 0, 2120, 'perf'],
      ['hp_ext', 'HP extraction pressure (HPH-6)', 'bar', 42, 0.5, 1.5], ['crh_press', 'Cold reheat pressure (HPH-5)', 'bar', 28, 0.4, 1],
      ['ip_ext', 'IP extraction pressure (deaerator)', 'bar', 7.2, 0.1, 0.25], ['lp_ext', 'LP extraction pressure (LPH-2)', 'bar', 1.1, 0.03, 0.05],
      ['vib', 'Shaft vibration (max bearing)', 'µm', 42, 2, 0, 0, 125], ['thrust_temp', 'Thrust bearing pad temperature', '°C', 78, 0.8, 1, 0, 105]] },
    cond: { label: 'Surface condenser · twin pass', src: 'dcs', tags: [
      ['back_pressure', 'Condenser back pressure', 'kPa(a)', 9.6, 0.12, 0.5, 0, 11], ['ttd', 'Terminal temperature difference', '°C', 3.6, 0.15, 0.2, 0, 5.5],
      ['hotwell', 'Hotwell level', 'mm', 620, 10, 0, 450, 800], ['cw_in', 'CW inlet temperature', '°C', 31.5, 0.3, 1.5, 0, 34],
      ['cw_out', 'CW outlet temperature', '°C', 40.5, 0.3, 1.5], ['do', 'Condensate dissolved O₂', 'ppb', 14, 1, 0, 0, 30]] },
    hph6: HEATER('HP heater 6', 1.8, 6.5, 19, 246),
    hph5: HEATER('HP heater 5', 2.2, 7, 15, 212),
    lph: HEATER('LP heater', 3, 6, 9, 118),
    dea: { label: 'Deaerator and feed storage tank', src: 'dcs', tags: [
      ['pressure', 'Deaerator pressure', 'bar', 6.4, 0.06, 0.15, 5.0, 7.5], ['level', 'Storage tank level', 'mm', 1850, 25, 0, 1500, 2200],
      ['temp', 'Feed water temperature', '°C', 160, 0.6, 1], ['do', 'Outlet dissolved O₂', 'ppb', 5, 0.4, 0, 0, 7, 'lims']] },
    bfp: BFP('Boiler feed pump · 50 %, hydraulic coupling', true),
    bfpsb: BFP('Boiler feed pump · 50 %, hydraulic coupling (standby)', false),
    cep: CEP('Condensate extraction pump · 100 %', true),
    cepsb: CEP('Condensate extraction pump · 100 % (standby)', false),
    cwp: { label: 'Cooling water pump · vertical, 60 %', src: 'dcs', tags: [
      ['current', 'Motor current', 'A', 54, 0.8, 1.5, 0, 68], ['kw', 'Motor power', 'kW', 500, 7, 14], ['flow', 'CW flow', 'm³/h', 10800, 120, 250],
      ['dis_press', 'Discharge pressure', 'bar', 2.4, 0.03, 0.05], ['vib', 'Pump bearing vibration', 'mm/s', 2.1, 0.12, 0, 0, 7.1, 'cms']] },
    ct: { label: 'Induced-draught cooling tower · 6 cells', src: 'dcs', tags: [
      ['fans_on', 'Cells in service (of 6)', 'cells', 6, 0, 0, 4, 6], ['approach', 'Approach to wet bulb', '°C', 4.8, 0.2, 0.6, 0, 6.5],
      ['range', 'Range (hot − cold water)', '°C', 9, 0.2, 0.5], ['cold_water', 'Cold water temperature', '°C', 31.5, 0.3, 1.5, 0, 34],
      ['wet_bulb', 'Ambient wet bulb', '°C', 26.5, 0.5, 3, undefined, undefined, 'weather'], ['fan_kw', 'Total CT fan power', 'kW', 450, 6, 10]] },
    ctfan: { label: 'CT fan · 75 kW, gearbox drive', src: 'dcs', tags: [
      ['kw', 'Motor power', 'kW', 75, 1.5, 2], ['current', 'Motor current', 'A', 132, 2.5, 3, 0, 160],
      ['vib', 'Gearbox vibration', 'mm/s', 2.6, 0.15, 0, 0, 7.1, 'cms'], ['gb_oil', 'Gearbox oil temperature', '°C', 62, 0.8, 2, 0, 85, 'cms']] },
    chp: { label: 'Coal handling plant and bunkers', src: 'dcs', tags: [
      ['bunker', 'Bunker level (average)', '%', 68, 2, 6, 30, 95], ['conveyor', 'Conveyor feed rate', 't/h', 220, 30, 70, 0, 400],
      ['gcv', 'Coal GCV (as fired)', 'kcal/kg', 3850, 40, 0, 3500, undefined, 'lims'], ['moisture', 'Total moisture', '%', 11.5, 0.4, 0, 0, 14, 'lims'],
      ['ash', 'Ash', '%', 36, 0.6, 0, 0, 42, 'lims'], ['vm', 'Volatile matter', '%', 24, 0.4, 0, 20, undefined, 'lims']] },
    ash: { label: 'Ash handling and unburnt carbon (lab)', src: 'lims', tags: [
      ['ubc_fly', 'Unburnt carbon in fly ash', '%', 1.5, 0.08, 0, 0, 2.0], ['ubc_bottom', 'Unburnt carbon in bottom ash', '%', 4.2, 0.2, 0, 0, 6],
      ['fineness', 'PF fineness (passing 200 mesh)', '%', 71, 0.6, 0, 65, undefined], ['silo', 'Fly ash silo level', '%', 55, 2, 5, 0, 90, 'dcs']] },
    gen: { label: 'Generator · 125 MVA, air-cooled (TEWAC)', src: 'dcs', tags: [
      ['mw', 'Gross active power', 'MW', 91.7, 0.8, 5, 0, 105], ['mvar', 'Reactive power', 'MVAr', 26, 1.2, 3, -20, 60],
      ['pf', 'Power factor', '', 0.96, 0.005, 0.005, 0.85, 1.0], ['stator_temp', 'Stator winding temperature (max RTD)', '°C', 86, 0.8, 2, 0, 120],
      ['hot_air', 'Hot air temperature', '°C', 62, 0.5, 1, 0, 75], ['freq', 'Frequency', 'Hz', 50.0, 0.03, 0, 49.5, 50.5]] },
    gt: { label: 'Generator transformer · 11/132 kV, 125 MVA', src: 'dcs', tags: [
      ['mw_export', 'Net export to smelter and grid', 'MW', 84.7, 0.8, 5], ['oil_temp', 'Top-oil temperature', '°C', 62, 0.8, 2, 0, 90],
      ['wind_temp', 'Winding temperature', '°C', 74, 1, 3, 0, 105], ['tap', 'OLTC tap position', '', 9, 0, 0, 1, 17]] },
    uat: { label: 'Unit auxiliary transformer · 11/6.6 kV, 12.5 MVA', src: 'dcs', tags: [
      ['kw', 'Auxiliary load', 'kW', 7020, 60, 260, 0, 8200], ['apc', 'Auxiliary power consumption', '%', 7.65, 0.06, 0.12, 0, 8.5, 'perf'],
      ['kva', 'Apparent power', 'kVA', 7650, 65, 280, 0, 11000], ['load_pct', 'Loading', '%', 61, 0.6, 2, 0, 90],
      ['oil_temp', 'Top-oil temperature', '°C', 58, 0.8, 2, 0, 85], ['wind_temp', 'Winding temperature', '°C', 70, 1, 3, 0, 100]] },
    bus: { label: '6.6 kV unit switchboard', src: 'dcs', tags: [
      ['voltage', 'Bus voltage', 'kV', 6.62, 0.02, 0.03, 6.27, 6.93], ['current', 'Incomer current', 'A', 640, 6, 24, 0, 1100], ['thd_v', 'Voltage THD', '%', 2.1, 0.1, 0.15, 0, 5]] },
    dm: { label: 'DM plant · 2 × 25 m³/h streams', src: 'dcs', tags: [
      ['output', 'DM water output', 'm³/h', 18, 0.6, 2], ['cond', 'Mixed-bed outlet conductivity', 'µS/cm', 0.12, 0.01, 0, 0, 0.2],
      ['silica', 'Mixed-bed outlet silica', 'ppb', 8, 0.6, 0, 0, 20, 'lims'], ['tank', 'DM storage tank level', '%', 72, 2, 4, 30, 100]] },
    makeup: { label: 'Cycle make-up and blowdown', src: 'dcs', tags: [
      ['flow', 'Make-up flow to condenser', 't/h', 4.3, 0.2, 0.3, 0, 6.5], ['makeup_pct', 'DM make-up (% of MS flow)', '%', 1.35, 0.06, 0.08, 0, 2.0, 'perf'],
      ['cst', 'Condensate storage tank level', '%', 68, 2, 3, 30, 100], ['cbd', 'Continuous blowdown flow', 't/h', 1.5, 0.08, 0]] },
    chem: { label: 'Steam and water chemistry (SWAS)', src: 'dcs', tags: [
      ['fw_ph', 'Feed water pH', '', 9.0, 0.04, 0, 8.8, 9.2], ['cation_cond', 'Feed water cation conductivity', 'µS/cm', 0.15, 0.01, 0, 0, 0.3],
      ['drum_ph', 'Drum water pH', '', 9.5, 0.05, 0, 9.0, 10.0], ['steam_silica', 'Main steam silica', 'ppb', 10, 0.8, 0, 0, 20, 'lims']] },
  },
  areas: [
    { id: 'boiler', name: 'Boiler', lines: [
      { id: 'combustion', name: 'Combustion and steam', assets: [['BLR-01', 'Boiler 330 t/h · overall', 'boiler', 'A'], ['FUR-01', 'Furnace and burners', 'furnace', 'A'], ['ATT-01', 'SH and RH attemperation', 'att', 'A']] },
      { id: 'heat-transfer', name: 'Heat-transfer sections (soot blowing)', assets: [['WW-01', 'Water walls', 'ww', 'A'], ['SH-01', 'Platen and final superheater', 'sh', 'A'], ['RH-01', 'Reheater', 'rh', 'A'], ['ECO-01', 'Economiser', 'eco', 'A'], ['APH-01', 'Air preheater', 'aph', 'A']] },
      { id: 'flue-gas', name: 'Flue gas path', assets: [['ESP-01', 'Electrostatic precipitator', 'esp', 'B'], ['STK-01', 'Stack and CEMS', 'stack', 'B']] } ] },
    { id: 'turbine-cycle', name: 'Turbine & cycle', lines: [
      { id: 'tg', name: 'Turbine and condenser', assets: [['TG-01', 'Steam turbine 100 MW', 'tg', 'A'], ['COND-01', 'Condenser', 'cond', 'A']] },
      { id: 'feed-heating', name: 'Feed heating', assets: [['HPH-6', 'HP heater 6', 'hph6', 'A'], ['HPH-5', 'HP heater 5', 'hph5', 'A'], ['DEA-01', 'Deaerator', 'dea', 'A'], ['LPH-3', 'LP heater 3', 'lph', 'B'], ['LPH-2', 'LP heater 2', 'lph', 'B'], ['LPH-1', 'LP heater 1', 'lph', 'B']] },
      { id: 'feed-condensate', name: 'Feed and condensate pumps', assets: [['BFP-A', 'Boiler feed pump A', 'bfp', 'A'], ['BFP-B', 'Boiler feed pump B', 'bfp', 'A'], ['BFP-C', 'Boiler feed pump C (standby)', 'bfpsb', 'A'], ['CEP-A', 'Condensate extraction pump A', 'cep', 'A'], ['CEP-B', 'Condensate extraction pump B (standby)', 'cepsb', 'B']] },
      { id: 'cooling', name: 'CW and cooling tower', assets: [['CWP-A', 'CW pump A', 'cwp', 'A'], ['CWP-B', 'CW pump B', 'cwp', 'A'], ['CT-01', 'Cooling tower', 'ct', 'A'],
        ['CTF-1', 'CT fan 1', 'ctfan', 'C'], ['CTF-2', 'CT fan 2', 'ctfan', 'C'], ['CTF-3', 'CT fan 3', 'ctfan', 'C'], ['CTF-4', 'CT fan 4', 'ctfan', 'C'], ['CTF-5', 'CT fan 5', 'ctfan', 'C'], ['CTF-6', 'CT fan 6', 'ctfan', 'C']] } ] },
    { id: 'auxiliaries', name: 'Auxiliaries', lines: [
      { id: 'mills', name: 'Coal mills (4 + 1)', assets: [['MILL-A', 'Bowl mill A', 'mill', 'A'], ['MILL-B', 'Bowl mill B', 'mill', 'A'], ['MILL-C', 'Bowl mill C', 'mill', 'A'], ['MILL-D', 'Bowl mill D', 'mill', 'A'], ['MILL-E', 'Bowl mill E (standby)', 'millsb', 'B']] },
      { id: 'draught', name: 'Draught fans', assets: [['ID-A', 'ID fan A', 'idfan', 'A'], ['ID-B', 'ID fan B', 'idfan', 'A'], ['FD-A', 'FD fan A', 'fdfan', 'A'], ['FD-B', 'FD fan B', 'fdfan', 'A'], ['PA-A', 'PA fan A', 'pafan', 'A'], ['PA-B', 'PA fan B', 'pafan', 'A']] } ] },
    { id: 'coal-ash', name: 'Coal & ash', lines: [
      { id: 'coal-ash-handling', name: 'Coal and ash handling', assets: [['CHP-01', 'Coal handling plant and bunkers', 'chp', 'B'], ['ASH-01', 'Ash handling and unburnt carbon', 'ash', 'B']] } ] },
    { id: 'electrical', name: 'Electrical', lines: [
      { id: 'generation', name: 'Generator and transformers', assets: [['GEN-01', 'Generator 125 MVA', 'gen', 'A'], ['GT-01', 'Generator transformer', 'gt', 'A'], ['UAT-01', 'Unit auxiliary transformer', 'uat', 'A'], ['BUS-01', '6.6 kV unit bus', 'bus', 'B']] } ] },
    { id: 'water', name: 'Water', lines: [
      { id: 'water-systems', name: 'DM, make-up and chemistry', assets: [['DM-01', 'DM plant', 'dm', 'B'], ['MKU-01', 'Cycle make-up', 'makeup', 'B'], ['CHEM-01', 'Steam and water chemistry', 'chem', 'B']] } ] },
  ],
  kpis: [
    { id: 'nhr', name: 'Net heat rate', unit: 'kcal/kWh', group: 'cost', base: 2640, cur: 2601, target: 2550, better: 'down', dec: 0, lakh: 242, owner: 'Performance head' },
    { id: 'apc', name: 'Auxiliary power consumption', unit: '% of generation', group: 'energy', base: 8.10, cur: 7.65, target: 7.05, better: 'down', dec: 2, lakh: 186, owner: 'Plant head' },
    { id: 'beff', name: 'Boiler efficiency', unit: '%', group: 'energy', base: 85.6, cur: 86.4, target: 87.5, better: 'up', dec: 1, lakh: 0, owner: 'Boiler in-charge' },
    { id: 'scc', name: 'Specific coal consumption', unit: 'kg/kWh', group: 'cost', base: 0.630, cur: 0.624, target: 0.616, better: 'down', dec: 3, lakh: 0, owner: 'Performance head' },
    { id: 'plf', name: 'Plant load factor', unit: '%', group: 'cost', base: 88.2, cur: 91.7, target: 93.0, better: 'up', dec: 1, lakh: 0, owner: 'Plant head' },
    { id: 'foh', name: 'Forced outage hours (rolling 12 months)', unit: 'h', group: 'maintenance', base: 150, cur: 64, target: 40, better: 'down', dec: 0, lakh: 204, owner: 'Maintenance head' },
    { id: 'ubc', name: 'Unburnt carbon in fly ash', unit: '%', group: 'quality', base: 2.1, cur: 1.5, target: 1.2, better: 'down', dec: 1, lakh: 0, owner: 'Boiler in-charge' },
    { id: 'cbp', name: 'Condenser back pressure deviation', unit: 'kPa', group: 'energy', base: 1.6, cur: 0.9, target: 0.5, better: 'down', dec: 1, lakh: 0, owner: 'Turbine in-charge' },
    { id: 'spray', name: 'SH + RH spray flow', unit: 't/h', group: 'energy', base: 18, cur: 11, target: 8, better: 'down', dec: 1, lakh: 0, owner: 'Boiler in-charge' },
    { id: 'dm', name: 'DM make-up', unit: '% of MS flow', group: 'quality', base: 1.8, cur: 1.35, target: 1.0, better: 'down', dec: 2, lakh: 18, owner: 'Chemist' },
  ],
  overview: ['nhr', 'apc', 'beff', 'plf', 'scc', 'foh'],
  events: [
    { id: 'p1', asset: 'APH-01', tag: 'gas_out', kind: 'ramp', startHoursAgo: 30, to: 158, health: 61, rulDays: 20, severity: 'warn', minutesAgo: 14,
      title: 'APH flue gas exit temperature at 158 °C: economiser and APH fouling', agent: 'Combustion & Soot Blowing Agent', finding: 'ECO and APH fouling',
      diagnosis: { title: 'Ash deposit on economiser and APH baskets; blowing by timer missed them', confidence: 0.86, points: [
        'APH gas exit rose from 138 to 158 °C in 30 hours at the same load (91–93 MW) and coal (GCV 3,850 kcal/kg).',
        'Economiser cleanliness factor fell from 85 to 73 % and its gas outlet is 392 °C against 362 °C; heat absorption is down 9 %.',
        'APH gas-side ΔP rose from 115 to 142 mmWC; leakage is steady at 8.5 %, so this is deposit, not seal wear.',
        'The economiser LRSBs last ran 34 hours ago; the timer sequence spent steam on water walls that were at 90 % cleanliness.',
        'Dry flue gas loss is up about 1 % of boiler efficiency, about 24 kcal/kWh on net heat rate, near ₹2.6 L per day.'],
      reco: 'Blow economiser LRSBs and APH rotary blowers now, then hold water-wall blowing until cleanliness falls below 85 %. Expect gas exit back to 140 °C within 2 hours; if APH ΔP stays above 130 mmWC, plan a water wash at the next shutdown.' } },
    { id: 'p1b', asset: 'ECO-01', tag: 'gas_out', kind: 'ramp', startHoursAgo: 30, to: 392 },
    { id: 'p1c', asset: 'ECO-01', tag: 'cf', kind: 'ramp', startHoursAgo: 30, to: 73 },
    { id: 'p1d', asset: 'APH-01', tag: 'dp', kind: 'ramp', startHoursAgo: 30, to: 142 },
    { id: 'p2', asset: 'ATT-01', tag: 'sh_spray', kind: 'ramp', startHoursAgo: 18, to: 17, severity: 'warn', minutesAgo: 35,
      title: 'SH spray at 17 t/h: platen SH fouled and burner tilt raised', agent: 'Combustion & Soot Blowing Agent', finding: 'High SH spray',
      diagnosis: { title: 'Platen SH heat absorption down after 30 h without a blow; burner tilt pushed up to compensate', confidence: 0.82, points: [
        'SH spray averaged 17 t/h this shift against 8 t/h normal; the SH spray valve is 71 % open.',
        'Platen and final SH cleanliness fell from 84 to 75 % since the last soot blow 30 hours ago.',
        'Burner tilt was raised from +2° to +8° to hold reheat temperature, which pushes more heat into the SH and needs more spray.',
        'Main steam temperature overshoots to 544 °C on load ramps; tube metal temperature is 581 °C against a 590 °C limit.',
        'Spray bypasses the HP heaters, which costs about 5 kcal/kWh on net heat rate at this flow.'],
      reco: 'Blow the platen and final SH sections first, then lower burner tilt by 2° at a time to +3°. SH spray should fall by about a third within the shift; use RH spray last.' } },
    { id: 'p2b', asset: 'SH-01', tag: 'cf', kind: 'ramp', startHoursAgo: 30, to: 75 },
    { id: 'p2c', asset: 'FUR-01', tag: 'tilt', kind: 'step', startHoursAgo: 16, to: 8 },
    { id: 'p3', asset: 'COND-01', tag: 'back_pressure', kind: 'ramp', startHoursAgo: 72, to: 11.7, health: 58, rulDays: 14, severity: 'bad', minutesAgo: 22,
      title: 'Condenser back pressure 11.7 kPa: air ingress, not CW or cooling tower', agent: 'Performance Agent', finding: 'Air ingress',
      diagnosis: { title: 'Air in-leakage on the LP side (LP gland or vacuum breaker)', confidence: 0.81, points: [
        'Back pressure rose from 9.6 to 11.7 kPa in 3 days; expected value at this load, CW flow and 31.5 °C CW inlet is 9.7 kPa.',
        'Condensate dissolved O₂ rose from 14 to 38 ppb and the condenser TTD rose from 3.6 to 6.4 °C, the signature of air blanketing.',
        'CW temperature rise (9 °C) and CW pump currents are normal, so CW flow and tube fouling are not the cause.',
        'Cooling tower approach is 4.8 °C with all 6 cells in service, in line with design at this wet bulb.',
        'Every 1 kPa of back pressure costs about 1.2 % of turbine heat rate: about 60 kcal/kWh now, near ₹6.5 L per day.'],
      reco: 'Raise LP gland steam pressure to the upper band, check the vacuum breaker seal water and run a helium leak test on the LP turbine glands and expansion joint. Start the standby vacuum pump until the leak is found.' } },
    { id: 'p3b', asset: 'COND-01', tag: 'do', kind: 'ramp', startHoursAgo: 72, to: 38 },
    { id: 'p3c', asset: 'COND-01', tag: 'ttd', kind: 'ramp', startHoursAgo: 72, to: 6.4 },
    { id: 'p4', asset: 'ID-B', tag: 'vib', kind: 'ramp', startHoursAgo: 240, to: 7.8, health: 41, rulDays: 9, severity: 'bad', minutesAgo: 48, curve: 1.6,
      title: 'ID fan B NDE vibration 7.8 mm/s: bearing looseness', agent: 'Equipment Health Agent', finding: 'NDE bearing looseness',
      diagnosis: { title: 'Looseness at the NDE bearing outer race / plummer block', confidence: 0.84, points: [
        'NDE velocity rose from 2.8 to 7.8 mm/s in 10 days, above the 7.1 mm/s alarm (ISO 10816-3, group 1).',
        'Spectrum shows 1× with 2× and 3× harmonics and a raised noise floor, typical of looseness; no blade-pass change.',
        'NDE bearing temperature rose from 56 to 74 °C at the same IGV position and load.',
        'The same pattern on an ID fan at a sister plant was traced to looseness on the bearing outer diameter; after the fix vibration fell close to zero.',
        'Losing ID-B forces a run-back to about 60 MW: about ₹14 L of lost generation per day.'],
      reco: 'Check plummer block hold-down bolts and the bearing housing fit at the next load reduction, and move load from ID-B to ID-A in small steps. If velocity passes 9 mm/s, plan a 6-hour run-back and replace the NDE bearing.' } },
    { id: 'p4b', asset: 'ID-B', tag: 'brg_temp', kind: 'ramp', startHoursAgo: 240, to: 74 },
    { id: 'p5', asset: 'BFP-A', tag: 'recirc_flow', kind: 'step', startHoursAgo: 40, to: 14, severity: 'warn', minutesAgo: 95,
      title: 'BFP-A recirculation valve passing: 14 t/h back to the deaerator', agent: 'Auxiliary Power Agent', finding: 'ARC valve passing',
      diagnosis: { title: 'Automatic recirculation (ARC) valve of BFP-A not seating; pump also throttled against the feed control valve', confidence: 0.79, points: [
        'BFP-A recirculation flow stepped from 3 to 14 t/h at 22:40 two days ago and has not come back; BFP-B is at 3 t/h.',
        'BFP-A current rose from 112 to 121 A and power from 1,050 to 1,130 kW, while feed flow to the boiler is unchanged.',
        'Feed control valve ΔP is 21.9 bar with the main valve 71 % open, so both pumps run with more head than the boiler needs.',
        'The ARC valve was last overhauled 26 months ago (CMMS); the OEM interval is 24 months.',
        'Together the passing valve and the excess head cost about 190 kW: 0.2 percentage points of APC, near ₹23 L a year.'],
      reco: 'Raise a work order to overhaul the BFP-A ARC valve in the next BFP changeover window and run BFP-C meanwhile. Lower the BFP scoop / differential-pressure setpoint in 1 bar steps, stopping before feed control valve ΔP falls below 4 bar.' } },
    { id: 'p5b', asset: 'BFP-A', tag: 'current', kind: 'step', startHoursAgo: 40, to: 121 },
    { id: 'p5c', asset: 'BFP-A', tag: 'kw', kind: 'step', startHoursAgo: 40, to: 1130 },
  ],
  cost: { unitLabel: '₹/MWh', budget: 4250,
    elements: [['Coal (landed)', 3245], ['Secondary oil (LDO / HFO)', 45], ['Maintenance', 310], ['Manpower', 220], ['Water & chemicals', 38], ['Ash disposal', 60], ['Other', 180]],
    bridge: [['Heat rate', 26], ['Auxiliary power', 22], ['Forced outages', 15], ['Coal GCV slippage', -12]],
    lines: [['Boiler', 97.8, 95.4, 98.2, 'ECO and APH fouling'], ['Turbine & condenser', 98.6, 96.1, 98.9, 'Condenser vacuum'], ['Coal mills', 96.2, 93.8, 97.5, 'Wet coal, low outlet temperature'],
      ['Draught fans', 97.1, 94.2, 99.0, 'ID-B vibration'], ['Feed & condensate', 98.9, 92.5, 99.3, 'BFP-A recirculation passing'], ['CW & cooling tower', 99.2, 94.8, 99.1, 'CT cells running by habit']],
    losses: [['Condenser vacuum (≈16 kcal/kWh)', 27], ['Aux power excess (≈16 kcal/kWh)', 27], ['Dry flue gas loss (≈14 kcal/kWh)', 24], ['Unburnt carbon (≈9 kcal/kWh)', 15], ['SH/RH spray (≈6 kcal/kWh)', 10], ['Make-up water & blowdown (≈3 kcal/kWh)', 5]] },
  quality: {
    defects: [['Excess O₂ out of band (2.8–4.0 %)', 31], ['UBC in fly ash > 2 %', 23], ['Mill outlet temperature < 65 °C', 18], ['Coal moisture > 14 %', 15], ['Coal GCV below grade (slippage)', 12], ['CO > 200 ppm', 6], ['NOx > 300 mg/Nm³', 4]],
    spc: { asset: 'BLR-01', tag: 'o2', name: 'Excess O₂ at economiser outlet', lsl: 2.8, usl: 4.0 }, inspect: null },
  energy: { contractKVA: 12500, scale: 1, meter: ['UAT-01', 'kw'],
    areas: [['Boiler feed pumps', 28], ['CW pumps', 14], ['ID fans', 12], ['Coal mills', 11], ['PA fans', 9], ['CT fans', 6], ['CHP & ash handling', 6], ['FD fans', 5], ['ESP', 4], ['CEP, DM & misc', 5]],
    utilities: [['BFP-A', 'kw'], ['BFP-B', 'kw'], ['CWP-A', 'kw'], ['CWP-B', 'kw'], ['ID-A', 'kw'], ['ID-B', 'kw'], ['PA-A', 'kw'], ['MILL-A', 'kw'], ['CT-01', 'fan_kw'], ['ESP-01', 'kw']] },
  maintenance: { spotlight: 'ID-B' },
  approvals: [
    { id: 'a1', from: 'Equipment Health Agent', minutesAgo: 20, title: 'Approve WO 4100 3381 · ID-B NDE bearing check and re-fit', policy: 'P-03',
      table: [['Equipment', 'ID-B · ID fan B (430 kW)'], ['Job', 'Check plummer block bolts and housing fit; replace NDE bearing if outer race is loose'], ['Window', 'Night load reduction to 60 MW · 6 h'], ['Cost', '₹1,85,000 incl. bearing 22322'], ['Risk if deferred', 'Forced run-back, about ₹14 L/day']], prompt: 'Why is ID-B vibration rising?' },
    { id: 'a2', from: 'Combustion & Soot Blowing Agent', minutesAgo: 45, title: 'Approve excess O₂ setpoint 3.4 → 3.0 % (BLR-01)', policy: 'P-02',
      table: [['Change', 'O₂ trim setpoint 3.4 → 3.0 % at loads above 80 MW'], ['Evidence', 'CO below 100 ppm down to 2.9 % O₂ in the 21 Nov trial'], ['Impact', '−5 kcal/kWh, −40 kW fan power · ₹72 L/yr'], ['Stop condition', 'Back off if CO > 200 ppm or UBC > 2 %']], prompt: 'How much is excess O₂ costing on heat rate?' },
    { id: 'a3', from: 'Auxiliary Power Agent', minutesAgo: 110, title: 'Approve purchase: BFP ARC valve overhaul kit · ₹3.4 L', policy: 'P-04',
      table: [['Requisition', 'PR 1200 7714'], ['Amount', '₹3,40,000'], ['Scope', 'Trim, seat and pilot assembly for BFP-A ARC valve, one spare set'], ['Payback', 'About 2 months (≈190 kW, ₹23 L/yr)']], prompt: 'Why is BFP-A drawing more power than BFP-B?' },
  ],
  docs: [
    { id: 'd1', name: 'Boiler O&M manual · 330 t/h PF, tangential firing', type: 'OEM manual', obj: 'BLR-01, FUR-01, SH-01, RH-01, ECO-01, APH-01', pages: 612, cited: 41, pass: [['Use burner tilt and soot blowing to correct steam temperature; spray is a trim and should not exceed 10 t/h in steady operation.', 'p. 214'], ['APH gas outlet temperature rising more than 15 °C above clean value indicates basket fouling; blow the APH before increasing air flow.', 'p. 388']] },
    { id: 'd2', name: 'Heat and mass balance diagram · 100 MW, VWO / 100 % / 80 % / 60 %', type: 'Design data', obj: 'TG-01, COND-01, HPH-5, HPH-6, DEA-01', pages: 14, cited: 36, pass: [['At 100 % MCR: turbine heat rate 2,060 kcal/kWh, condenser pressure 9.5 kPa(a) at 32 °C CW inlet.', 'Sheet 2'], ['Final feed water temperature 246 °C with both HP heaters in service.', 'Sheet 2']] },
    { id: 'd3', name: 'SOP-OP-117 · BFP start-up and changeover', type: 'SOP', obj: 'BFP-A, BFP-B, BFP-C', pages: 18, cited: 12, pass: [['Before changeover, confirm the standby pump ARC valve opens on minimum flow and the balancing line vent is clear.', 'Step 4'], ['Do not run two pumps below 40 % flow each; take one pump off and carry load on the other two.', 'Step 11']] },
    { id: 'd4', name: 'RCA-2026-019 · ID fan B NDE bearing looseness', type: 'Past RCA', obj: 'ID-B', pages: 9, cited: 15, pass: [['Velocity rose to 12.1 mm/s axial; looseness was found on the bearing outer diameter. After the re-fit, vibration fell close to zero.', 'D4'], ['Root cause: housing bore worn after two bearing changes without line-boring.', 'D5']] },
    { id: 'd5', name: 'Soot blowing philosophy and interlocks', type: 'SOP', obj: 'WW-01, SH-01, RH-01, ECO-01, APH-01', pages: 22, cited: 19, pass: [['Blow a section when its cleanliness factor falls below the trigger, not by timer. Interlocks: header drain above 250 °C, drum pressure above 110 bar, furnace draft normal.', 'Section 3'], ['Each LRSB blow uses about 0.7 t of steam; avoid blowing clean surfaces.', 'Section 5']] },
    { id: 'd6', name: 'MoEFCC emission norms for thermal power plants (2015, amended)', type: 'Regulation', obj: 'STK-01, ESP-01', pages: 12, cited: 8, pass: [['Units installed 2003–2016: particulate matter 50 mg/Nm³, SO₂ 600 mg/Nm³ (below 500 MW), NOx 300 mg/Nm³.', 'Table 1']] },
  ],
  skills: [
    { id: 'heat-rate-gap', name: 'Net heat rate gap split', pack: 'Faclon · Power', ver: '2.4', steps: ['Compute boiler efficiency by the heat-loss method and turbine heat rate against the HMBD.', 'Split the NHR gap into named losses (dry gas, UBC, vacuum, spray, make-up, aux power) in kcal/kWh.', 'Cost each loss at landed coal cost and value of power.', 'Rank actions by ₹ impact.'] },
    { id: 'soot-blow-advisor', name: 'Soot blowing advisor', pack: 'Faclon · Power', ver: '3.1', steps: ['Estimate cleanliness factor per section from gas ΔT, absorption and steam temperatures.', 'Pick sections where heat recovered beats steam used.', 'Check interlocks: header drain, drum pressure, draft.', 'Recommend the next blow and log the response.'] },
    { id: 'apc-best-day', name: 'APC best-day benchmark', pack: 'Faclon · Power', ver: '2.0', steps: ['Compute kW and kWh per drive and system.', 'Compare with the best day at the same load band, season and coal persona.', 'Trace excess kW to valves, pressures and gas temperatures.', 'Give a stepwise action with stop conditions and kW saving.'] },
    { id: 'condenser-diagnosis', name: 'Condenser vacuum diagnosis', pack: 'Faclon · Power', ver: '1.7', steps: ['Compare back pressure with the expected value at load, CW flow and CW inlet.', 'Separate air ingress (DO, TTD), CW flow, tube fouling and CT performance.', 'Cost the deviation in kcal/kWh.', 'Recommend the check or test.'] },
    { id: 'rotating-health', name: 'Rotating equipment health', pack: 'Faclon · Reliability', ver: '3.2', steps: ['Read vibration velocity, acceleration and bearing temperature.', 'Classify bearing, coupling, misalignment or looseness from the spectrum.', 'Estimate remaining life.', 'Draft the work order and the outage window.'] },
    { id: 'shift-report', name: 'Vindhya CPP shift report', pack: 'Private · Vindhya', ver: '1.3', steps: ['Generation, PLF, NHR, APC and SCC against target.', 'Top deviations with cause, duration and action.', 'Soot blows, changeovers and open permits.', 'Send to the plant head at shift end.'] },
  ],
  schedules: [
    ['Shift performance report', 'Report', 'Shift Report Agent', 'Every shift · 06:00, 14:00, 22:00 IST', 'Plant head, shift in-charges (9)'],
    ['Daily heat rate and loss breakdown', 'Excel', 'Performance Agent', 'Daily · 07:30 IST', 'Performance cell, O&M head (6)'],
    ['Day-ahead fan, pump, mill and CT plan', 'Excel', 'Auxiliary Power Agent', 'Daily · 18:00 IST', 'Shift in-charges, control room (8)'],
    ['Weekly equipment health review', 'Report', 'Equipment Health Agent', 'Weekly · Mon 09:00', 'Maintenance, electrical, C&I (10)'],
    ['Monthly coal quality and GCV reconciliation', 'Deck', 'Coal & Combustion Agent', 'Monthly · 3rd 11:00', 'CFO, procurement, plant head (7)'],
  ],
  workflows: [
    ['Soot blowing on need', [['Trigger', 'Section cleanliness below trigger or APH gas exit > 150 °C'], ['Agent', 'Combustion & Soot Blowing · pick sections and check interlocks'], ['Action', 'Advice to control room with blow sequence'], ['Action', 'Log blow and heat-transfer response']]],
    ['Condenser vacuum drop', [['Trigger', 'Back pressure > expected + 1 kPa for 2 h'], ['Agent', 'Performance · separate air ingress, CW and CT causes'], ['Approval', 'Turbine in-charge for vacuum pump changeover'], ['Action', 'Helium leak test request to CMMS']]],
    ['Auxiliary power excess', [['Trigger', 'APC above best day at same load band by 0.2 pp for 1 h'], ['Agent', 'Auxiliary Power · rank drives by excess kW'], ['Action', 'Card to shift in-charge with action and stop condition']]],
    ['Rotating fault to work order', [['Trigger', 'Vibration above ISO alarm or health < 50'], ['Agent', 'Equipment Health · spectrum diagnosis and remaining life'], ['Approval', 'Maintenance head (P-03)'], ['Action', 'SAP PM work order in the next load reduction window']]],
  ],
  agents: makeAgents('power', [
    { key: 'performance', name: 'Performance Agent', domain: 'cost', version: '2.6.0', uns: UNS, instructions: 'Track net heat rate, boiler efficiency and turbine heat rate against the HMBD. Split the gap into named losses in kcal/kWh and ₹, find the cause of each and give the action.',
      skills: ['heat-rate-gap', 'condenser-diagnosis'], tools: [...T, 'perf.get_heat_balance', 'weather.get_forecast'], triggers: [{ type: 'prompt' }, { type: 'schedule', cron: '0 * * * *' }, { type: 'event', on: 'back_pressure > expected + 1 kPa' }], canCall: ['power.combustion'] },
    { key: 'combustion', name: 'Combustion & Soot Blowing Agent', domain: 'process', version: '3.1.0', uns: UNS, instructions: 'Hold excess O₂, steam temperatures and spray at their best values for the coal being fired. Advise soot blowing by section cleanliness, never by timer, inside the interlocks.',
      skills: ['soot-blow-advisor', 'heat-rate-gap'], tools: [...T, 'deepsense.forecast'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'cleanliness < trigger or sh_spray > 15 t/h' }], autonomy: 'act_with_approval', policies: ['P-01', 'P-02', 'P-10'] },
    { key: 'aux-power', name: 'Auxiliary Power Agent', domain: 'energy', version: '2.0.0', uns: UNS, instructions: 'Benchmark every drive against the best day at the same load, season and coal. Explain excess kW and plan which BFPs, fans, mills and CT cells to run in each 15-minute slot.',
      skills: ['apc-best-day'], tools: ['plantdb.get_energy', 'plantdb.get_tag_history', 'plantdb.get_kpi_trend', 'plantdb.diagnose_asset'], triggers: [{ type: 'prompt' }, { type: 'schedule', cron: '5 * * * *' }] },
    { key: 'equipment-health', name: 'Equipment Health Agent', domain: 'maintenance', version: '2.3.0', uns: UNS, instructions: 'Watch fans, pumps, mills, turbine and generator. Diagnose vibration and temperature faults, estimate remaining life and draft SAP PM work orders into load-reduction windows.',
      skills: ['rotating-health'], tools: [...T, 'apm.get_alerts', 'deepsense.rul_predict', 'sap_pm.create_notification', 'sap_pm.create_order'], triggers: [{ type: 'prompt' }, { type: 'event', on: 'health < 50' }], autonomy: 'act_with_approval', policies: ['P-01', 'P-03', 'P-04'] },
    { key: 'coal', name: 'Coal & Combustion Agent', domain: 'quality', version: '1.5.0', uns: UNS, instructions: 'Track coal GCV, moisture and ash from the lab, mill fineness and unburnt carbon. Link coal quality to mill, combustion and heat-rate effects and flag grade slippage against the supply contract.',
      skills: ['heat-rate-gap'], tools: ['plantdb.get_quality', 'plantdb.get_tag_history', 'plantdb.diagnose_asset', 'sap_mm.get_coal_receipts'] },
    { key: 'shift-report', name: 'Shift Report Agent', domain: 'reports', version: '1.3.0', uns: UNS, instructions: 'Write the shift and daily performance report: generation, PLF, NHR, APC and SCC against target, top deviations with cause and action, soot blows and changeovers.',
      skills: ['shift-report'], tools: ['plantdb.get_production', 'plantdb.get_kpis', 'plantdb.list_messages', 'msg.send_email'], triggers: [{ type: 'schedule', cron: '0 6,14,22 * * *' }, { type: 'prompt' }], autonomy: 'act' },
  ]),
  suggestions: ['What needs my attention on Unit 1 right now?', 'Why is net heat rate 50 kcal/kWh above design?', 'Why is COND-01 back pressure rising?', 'Which sections should I soot blow next?', 'Why is ID-B vibration rising and when must we stop it?', 'Where is auxiliary power going above the best day?'],
  sources: {
    dcs: { name: 'Emerson Ovation DCS', kind: 'OT · DCS', via: 'I/O Connect · OPC UA (read-only, DMZ)', detail: 'Boiler, turbine, BOP, TSI, SWAS and CEMS; about 4,200 I/O; 1 s scan' },
    historian: { name: 'OSIsoft PI historian', kind: 'Data · Historian', via: 'PI Web API', detail: '6 years of unit history at 5 s; source for best-day and golden-period benchmarks' },
    perf: { name: 'Performance and heat rate software', kind: 'IT · Performance', via: 'REST · calculated tags', detail: 'Boiler efficiency (heat-loss method), turbine heat rate, cleanliness factors, APC by system, against the HMBD' },
    lims: { name: 'Plant laboratory (LIMS)', kind: 'IT · Lab', via: 'SQL read replica · Excel upload', detail: 'Coal proximate analysis and GCV per rake and shift, UBC in fly and bottom ash, PF fineness, water chemistry' },
    apm: { name: 'GE APM (Meridium)', kind: 'IT · Asset performance', via: 'REST API', detail: 'Asset criticality, health scores, reliability strategies and SmartSignal-type alerts' },
    cms: { name: 'Wireless vibration sensors', kind: 'OT · Condition monitoring', via: 'Gateway · MQTT', detail: '64 tri-axial sensors on fans, pumps, mills and CT gearboxes; spectrum on alert' },
    cmms: { name: 'SAP PM', kind: 'IT · CMMS', via: 'OData · BAPI', detail: 'Notifications, work orders, permits, shutdown job lists, spares' },
    erp: { name: 'SAP S/4HANA (MM, FI)', kind: 'IT · ERP', via: 'OData · BAPI', detail: 'Coal purchase orders and rake receipts, landed cost, GCV grade settlement, power cost' },
    weather: { name: 'Weather service', kind: 'IT · Weather', via: 'REST API', detail: 'Dry bulb, wet bulb and forecast for Katni' },
  },
  setpoints: [
    { asset: 'BLR-01', tag: 'o2', name: 'Excess O₂ trim setpoint (loads above 80 MW)', current: 3.4, recommended: 3.0, unit: '%', lo: 2.8, hi: 4.0, gain: '−5 kcal/kWh, −40 kW fans · ₹72 L/yr', kpi: 'nhr',
      reason: 'O₂ has run 0.4–0.8 % above the band since the coal source changed. In the 21 Nov trial CO stayed below 100 ppm down to 2.9 % O₂ and UBC in fly ash did not rise.', confidence: 0.82, status: 'proposed' },
    { asset: 'FUR-01', tag: 'tilt', name: 'Burner tilt (after platen SH blow)', current: 8, recommended: 3, unit: '°', lo: -10, hi: 15, gain: '−5 t/h SH spray · −3 kcal/kWh · ₹33 L/yr', kpi: 'spray',
      reason: 'Tilt was raised to +8° to hold reheat temperature while the platen SH was fouled. Once the SH is blown, the same reheat temperature held at +3° in the 14 Oct case, with spray a third lower.', confidence: 0.77, status: 'proposed' },
    { asset: 'MILL-B', tag: 'outlet_temp', name: 'Mill outlet temperature setpoint (all running mills)', current: 76, recommended: 82, unit: '°C', lo: 70, hi: 88, gain: '−0.3 pp UBC · −4 kcal/kWh · ₹44 L/yr', kpi: 'ubc',
      reason: 'Coal moisture is 11.5–14 % this month and PF fineness is 71 % passing 200 mesh. Less tempering air dries the coal better and lowers APH gas exit; the mill fire limit is 90 °C.', confidence: 0.74, status: 'approved' },
    { asset: 'FUR-01', tag: 'windbox_dp', name: 'Windbox ΔP setpoint (SADC control)', current: 125, recommended: 118, unit: 'mmWC', lo: 110, hi: 140, gain: '−60 kW FD fan power · ₹26 L/yr', kpi: 'apc',
      reason: 'FD fans run at 37–39 % efficiency against 62 % design because SADCs throttle a high windbox pressure. Lower the setpoint 2 mmWC at a time and stop before 117 mmWC; flame scanners stayed above 80 % in the trial.', confidence: 0.8, status: 'applied' },
    { asset: 'CT-01', tag: 'fans_on', name: 'Cooling tower cells in service at night (wet bulb < 21 °C)', current: 6, recommended: 5, unit: 'cells', lo: 4, hi: 6, gain: 'Net +55 kW (fan −75 kW, vacuum −20 kW) · ₹24 L/yr', kpi: 'apc',
      reason: 'Between 23:00 and 07:00 in winter the sixth cell gains only 0.1 kPa of vacuum, worth about 20 kW of turbine output, while the fan draws 75 kW. Apply after the condenser air leak is fixed.', confidence: 0.72, status: 'proposed' },
  ],
  forms: [
    { id: 'shift-log', name: 'Control room shift log', desc: 'Kept by the unit control desk engineer every shift. Feeds the shift performance report.',
      sections: [
        { title: 'Shift', fields: [
          { id: 'date', label: 'Date', type: 'date', required: true },
          { id: 'shift', label: 'Shift', type: 'radio', options: ['A · 06:00–14:00', 'B · 14:00–22:00', 'C · 22:00–06:00'], required: true },
          { id: 'engineer', label: 'Unit control desk engineer', type: 'text', required: true } ] },
        { title: 'Unit condition', fields: [
          { id: 'gen_mwh', label: 'Gross generation this shift', type: 'number', unit: 'MWh', required: true },
          { id: 'avg_load', label: 'Average load', type: 'number', unit: 'MW' },
          { id: 'ms_temp', label: 'MS / HRH temperature (average)', type: 'text', placeholder: 'e.g. 538 / 536 °C' },
          { id: 'vacuum', label: 'Condenser back pressure (average)', type: 'number', unit: 'kPa(a)' },
          { id: 'mills', label: 'Mills in service', type: 'checklist', options: ['MILL-A', 'MILL-B', 'MILL-C', 'MILL-D', 'MILL-E'] },
          { id: 'oil_support', label: 'Oil support used', type: 'select', options: ['None', 'LDO for flame support', 'HFO for flame support', 'Start-up'] } ] },
        { title: 'Events and handover', fields: [
          { id: 'events', label: 'Trips, run-backs and load changes', type: 'textarea', placeholder: 'Time, load, cause, action' },
          { id: 'abnormal', label: 'Abnormal parameters', type: 'textarea', placeholder: 'e.g. ID-B NDE vibration 7.8 mm/s' },
          { id: 'handover', label: 'Notes for next shift', type: 'textarea', required: true },
          { id: 'sign', label: 'Shift in-charge', type: 'signature', required: true } ] },
      ] },
    { id: 'soot-blow-log', name: 'Soot blower operation log', desc: 'One entry per soot-blowing batch. Results flow to the Combustion & Soot Blowing Agent to learn each section’s response.',
      sections: [
        { title: 'Batch', fields: [
          { id: 'time', label: 'Start time', type: 'datetime', required: true },
          { id: 'trigger', label: 'Reason for blowing', type: 'radio', options: ['Agent advice (cleanliness)', 'High APH gas exit', 'High SH spray', 'Timer / routine', 'Operator judgement'], required: true },
          { id: 'sections', label: 'Sections blown', type: 'checklist', options: ['Water walls (wall blowers)', 'Platen SH (LRSB)', 'Final SH (LRSB)', 'Reheater (LRSB)', 'Economiser (LRSB)', 'APH (rotary)'], required: true } ] },
        { title: 'Interlocks', fields: [
          { id: 'interlocks', label: 'Checks before blowing', type: 'checklist', options: ['Header drain temperature above 250 °C', 'Drum pressure above 110 bar', 'Furnace draft normal', 'All lances home before start', 'No mill changeover in progress'], required: true },
          { id: 'stuck', label: 'Lances stuck or not retracted', type: 'text', placeholder: 'e.g. LRSB-14 retracted manually' } ] },
        { title: 'Response', fields: [
          { id: 'aph_before', label: 'APH gas exit before', type: 'number', unit: '°C' },
          { id: 'aph_after', label: 'APH gas exit 1 h after', type: 'number', unit: '°C' },
          { id: 'spray_after', label: 'SH spray 1 h after', type: 'number', unit: 't/h' },
          { id: 'remarks', label: 'Remarks', type: 'textarea' },
          { id: 'sign', label: 'Boiler desk operator', type: 'signature', required: true } ] },
      ] },
    { id: 'changeover-permit', name: 'BFP / mill changeover permit', desc: 'Permit for planned changeover of a boiler feed pump or coal mill. Needs shift in-charge approval before the standby is started.',
      sections: [
        { title: 'Changeover', fields: [
          { id: 'from', label: 'Equipment to stop', type: 'asset', required: true },
          { id: 'to', label: 'Equipment to start', type: 'asset', required: true },
          { id: 'reason', label: 'Reason', type: 'select', options: ['Planned rotation', 'Defect on running unit', 'Auxiliary power plan (load change)', 'Maintenance work order'], required: true },
          { id: 'wo', label: 'Work order (if any)', type: 'text', placeholder: '4100 3381' },
          { id: 'load', label: 'Unit load at changeover', type: 'number', unit: 'MW' } ] },
        { title: 'Pre-start checks', fields: [
          { id: 'checks', label: 'Checks on the standby unit', type: 'checklist', options: ['Lube oil pressure and level normal', 'Suction valve open, vents clear (balancing line for BFP)', 'Recirculation (ARC) valve operation confirmed', 'Mill inerting and outlet temperature below 60 °C (mills)', 'Motor IR value checked', 'Protections and interlocks healthy'], required: true },
          { id: 'risk', label: 'Load restriction during changeover', type: 'radio', options: ['None', 'Reduce to 80 MW', 'Reduce to 60 MW'] } ] },
        { title: 'Approval', fields: [
          { id: 'done', label: 'Completed at', type: 'datetime' },
          { id: 'remarks', label: 'Observations', type: 'textarea' },
          { id: 'issuer', label: 'Shift in-charge', type: 'signature', required: true } ] },
      ] },
  ],
  dashNames: { kpis: 'Performance KPIs', overview: 'Unit overview', maintenance: 'Equipment health (APM)', cost: 'Heat rate & losses', quality: 'Coal & combustion', energy: 'Auxiliary power' },
  realtime: { title: 'Unit 1 live · boiler, turbine and auxiliaries', assets: ['BLR-01', 'FUR-01', 'ATT-01', 'APH-01', 'TG-01', 'COND-01', 'GEN-01', 'UAT-01', 'BFP-A', 'ID-B', 'MILL-B', 'CT-01'] },
};
