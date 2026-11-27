/* Energy & utilities ontology: how assets relate, on top of the ISA-95 tree.
   [from, relation, to, note]. Relations: feeds (electrical power), supplies (air, water, steam, gas, condensate),
   drives (a drive runs a load), compensates (power factor / harmonics), backs_up, causes (confirmed by an open RCA). */
export const RELATIONS = [
  // power network
  ['GRID-01', 'feeds', 'TR-01', '33 kV feeder'], ['GRID-01', 'feeds', 'TR-02', '33 kV feeder'],
  ['TR-01', 'feeds', 'BB-01', '415 V incomer ACB'], ['TR-02', 'feeds', 'BB-02', '415 V incomer ACB'],
  ['BB-01', 'feeds', 'BC-01', 'bus coupler, normally open'], ['BC-01', 'feeds', 'BB-02', 'bus coupler, normally open'],
  ['SOL-01', 'feeds', 'BB-01', '1 MWp rooftop solar'], ['DG-01', 'feeds', 'BB-02', 'DG bus'], ['DG-02', 'feeds', 'BB-02', 'DG bus'],
  ['BB-01', 'feeds', 'MCC-01', 'process block'], ['BB-01', 'feeds', 'MCC-02', 'utility block'], ['BB-01', 'feeds', 'UPS-01', 'critical loads'],
  ['BB-02', 'feeds', 'MCC-03', 'HVAC'], ['BB-02', 'feeds', 'VFD-01', 'VFD panel'], ['BB-02', 'feeds', 'VFD-02', 'VFD panel'], ['BB-02', 'feeds', 'VFD-03', 'VFD panel'], ['BB-02', 'feeds', 'VFD-04', 'VFD panel'], ['BB-02', 'feeds', 'VFD-05', 'VFD panel'],
  ['APFC-01', 'compensates', 'BB-01', 'reactive power, target PF 0.99'], ['HF-01', 'compensates', 'BB-02', '5th and 7th harmonics from the drives'],
  ['DG-01', 'backs_up', 'GRID-01', 'grid outage'], ['DG-02', 'backs_up', 'GRID-01', 'grid outage'], ['UPS-01', 'backs_up', 'MCC-01', 'ride-through for controls'],
  ['MCC-02', 'feeds', 'AC-01', ''], ['MCC-02', 'feeds', 'AC-02', ''], ['MCC-02', 'feeds', 'AC-03', ''], ['MCC-02', 'feeds', 'AC-04', ''], ['MCC-02', 'feeds', 'ADR-01', ''], ['MCC-02', 'feeds', 'RO-01', ''], ['MCC-02', 'feeds', 'ETP-01', ''], ['MCC-02', 'feeds', 'BLR-02', 'fans and feeders'],
  ['MCC-03', 'feeds', 'CH-01', ''], ['MCC-03', 'feeds', 'CH-02', ''], ['MCC-03', 'feeds', 'CH-03', ''], ['MCC-03', 'feeds', 'PCHP-01', ''], ['MCC-03', 'feeds', 'PCHP-02', ''],
  // compressed air
  ['AC-01', 'supplies', 'ADR-01', 'wet air'], ['AC-02', 'supplies', 'ADR-01', 'wet air'], ['AC-03', 'supplies', 'ADR-01', 'wet air, VSD trim'], ['AC-04', 'supplies', 'ADR-01', 'wet air'],
  ['ADR-01', 'supplies', 'AR-01', 'dry air'], ['AR-01', 'supplies', 'MCC-01', 'plant air header to the process block'],
  // chilled water and condenser water
  ['CH-01', 'supplies', 'PCHP-01', 'chilled water'], ['CH-02', 'supplies', 'PCHP-01', 'chilled water'], ['CH-03', 'supplies', 'PCHP-02', 'chilled water'],
  ['PCHP-01', 'supplies', 'VFD-03', 'primary to secondary loop'], ['PCHP-02', 'supplies', 'VFD-03', 'primary to secondary loop'],
  ['VFD-03', 'drives', 'PCHP-01', 'secondary CHW pump speed'],
  ['CT-01', 'supplies', 'CH-01', 'condenser water'], ['CT-02', 'supplies', 'CH-02', 'condenser water'], ['CT-02', 'supplies', 'CH-03', 'condenser water'],
  ['VFD-04', 'drives', 'CT-01', 'tower fan'], ['VFD-05', 'drives', 'CT-02', 'tower fan'], ['RO-01', 'supplies', 'CT-01', 'make-up water'], ['RO-01', 'supplies', 'CT-02', 'make-up water'],
  // gas, steam and condensate
  ['GMS-01', 'supplies', 'PRS-01', 'PNG at line pressure'], ['PRS-01', 'supplies', 'BLR-01', 'PNG at burner pressure'], ['PRS-01', 'supplies', 'TFH-01', 'PNG at burner pressure'],
  ['BLR-01', 'supplies', 'SH-01', 'steam 10.5 bar'], ['BLR-02', 'supplies', 'SH-01', 'steam 10.5 bar'], ['SH-01', 'supplies', 'PRDS-01', 'HP steam'],
  ['PRDS-01', 'supplies', 'STZ-01', 'LP steam, process block'], ['PRDS-01', 'supplies', 'STZ-02', 'LP steam, utility block'],
  ['STZ-01', 'supplies', 'CRS-01', 'condensate'], ['STZ-02', 'supplies', 'CRS-01', 'condensate'], ['CRS-01', 'supplies', 'BLR-01', 'feed water'], ['CRS-01', 'supplies', 'BLR-02', 'feed water'], ['RO-01', 'supplies', 'CRS-01', 'make-up water'],
  ['ETP-01', 'supplies', 'RO-01', 'treated water for reuse'],
  // causes confirmed by open RCAs
  ['HF-01', 'causes', 'TR-02', 'filter offline → harmonic heating of the winding'], ['VFD-03', 'causes', 'TR-02', 'drive harmonics (THD-I) on BB-02'],
  ['AR-01', 'causes', 'AC-03', 'air leaks keep the VSD compressor loaded'], ['CT-02', 'causes', 'CH-02', 'high condenser water temperature and fouling raise kW/TR'],
  ['STZ-01', 'causes', 'BLR-01', 'failed traps raise steam and gas demand'], ['BB-01', 'causes', 'MCC-01', 'hot Y-phase joint is a trip risk for the process block'],
];
export const REL_LABEL = { feeds: 'feeds power to', supplies: 'supplies', drives: 'drives', compensates: 'compensates', backs_up: 'backs up', causes: 'affects' };
