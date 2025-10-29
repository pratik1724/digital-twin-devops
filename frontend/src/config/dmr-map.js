// Env-driven mapping for SMR dashboard (DEV mock friendly)
export const APP_REGION = process.env.REACT_APP_AWS_REGION || "us-east-1";
export const WORKSPACE_ID = process.env.REACT_APP_TWINMAKER_WORKSPACE_ID || "SMR";
export const SCENE_ID = process.env.REACT_APP_TWINMAKER_SCENE_ID || "smr";

const DEFAULT_ASSET = process.env.REACT_APP_SITEWISE_ASSET_ID || "ae84ad81-684a-43c0-8c15-577c69552433";

export const blocks = [
  {
    id: "inlet-h2",
    label: "H₂ Inlet",
    assetId: DEFAULT_ASSET,
    propertyId: process.env.REACT_APP_H2_PROP_ID || "",
    unit: "ml/min",
    type: "inlet",
    svgSelector: "#block-h2",
  },
  { id: "inlet-ch4", label: "CH₄", propertyId: "", type: "inlet", svgSelector: "#block-ch4" },
  { id: "inlet-co2", label: "CO₂", propertyId: "", type: "inlet", svgSelector: "#block-co2" },
  { id: "inlet-n2", label: "N₂", propertyId: "", type: "inlet", svgSelector: "#block-n2" },
  { id: "inlet-air", label: "Air", propertyId: "", type: "inlet", svgSelector: "#block-air" },
];

// Metrics organized by Inlet and Outlet sections with corrected spelling
export const inletMetrics = [
  // Inlet flowrates
  { id: 'h2_inlet_pv', label: 'H2 Inlet Flowrate', setId: 'h2_inlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'H2_Inlet_Flowrate_Process_value' },
  { id: 'ch4_inlet_pv', label: 'CH4 Inlet Flowrate', setId: 'ch4_inlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CH4_Inlet_Flowrate_Process_value' },
  { id: 'co2_inlet_pv', label: 'CO2 Inlet Flowrate', setId: 'co2_inlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CO2_Inlet_Flowrate_Process_value' },
  { id: 'n_inlet_pv', label: 'N2 Inlet Flowrate', setId: 'n_inlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'N2_Inlet_Flowrate_Process_value' },
  { id: 'air_inlet_pv', label: 'Air Inlet Flowrate', setId: 'air_inlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Air_Inlet_Flowrate_Process_value' },
  { id: 'water_inlet_pv', label: 'Water Inlet Flowrate', setId: 'water_inlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Water_Inlet_Flowrate_Process_value' },

  // Pre-heater temperatures (before reaction)
  { id: 'preheater1_pv', label: 'Pre-heater 1 Temperature', setId: 'preheater1_set', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_1_Process_value' },
  { id: 'preheater2_pv', label: 'Pre-heater 2 Temperature', setId: 'preheater2_set', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_2_Process_value' },
  { id: 'preheater3_pv', label: 'Pre-heater 3 Temperature', setId: 'preheater3_set', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_3_Process_value' },
  { id: 'preheater4_pv', label: 'Pre-heater 4 Temperature', setId: 'preheater4_set', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_4_Process_value' },

  // Reactor furnace temperatures (before reaction)
  { id: 'furnace1_temp_pv', label: 'Reactor Furnace 1 Temperature', setId: 'furnace1_temp_set', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_reactor_furnace_1_Process_value' },
  { id: 'furnace2_temp_pv', label: 'Reactor Furnace 2 Temperature', setId: 'furnace2_temp_set', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_reactor_furnace_2_Process_value' },
  { id: 'furnace3_temp_pv', label: 'Reactor Furnace 3 Temperature', setId: 'furnace3_temp_set', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_reactor_furnace_3_Process_value' },

  // Reactor pressure (inlet side)
  { id: 'pressure_reactor_pv', label: 'Reactor Pressure', setId: 'pressure_reactor_set', unit: 'Bar', assetId: DEFAULT_ASSET, propertyId: 'Pressure_reactor_Process_value' },
];

export const outletMetrics = [
  // Outlet flowrates
  { id: 'h2_outlet_pv', label: 'H2 Outlet Flowrate', setId: 'h2_outlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'H2_outlet_Flowrate_Process_value' },
  { id: 'ch4_outlet_pv', label: 'CH4 Outlet Flowrate', setId: 'ch4_outlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CH4_outlet_Flowrate_Process_value' },
  { id: 'co2_outlet_pv', label: 'CO2 Outlet Flowrate', setId: 'co2_outlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CO2_outlet_Flowrate_Process_value' },
  { id: 'co_outlet_pv', label: 'CO Outlet Flowrate', setId: 'co_outlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CO_outlet_Flowrate_Process_value' },
  { id: 'n_outlet_pv', label: 'N2 Outlet Flowrate', setId: 'n_outlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'N2_outlet_Flowrate_Process_value' },
  { id: 'air_outlet_pv', label: 'Air Outlet Flowrate', setId: 'air_outlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Air_outlet_Flowrate_Process_value' },
  { id: 'water_outlet_pv', label: 'Water Outlet Flowrate', setId: 'water_outlet_set', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Water_outlet_Flowrate_Process_value' },

  // Post-reaction temperatures
  { id: 'reactor_bed_temp_pv', label: 'Reactor Bed Temperature', setId: null, unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_reactor_bed_Process_value' },
];

// Combined metrics for backward compatibility
export const metrics = [...inletMetrics, ...outletMetrics];

// Set values mapping for detail modal (with corrected spelling)
export const setValues = {
  'h2_inlet_set': { label: 'H2 Inlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'H2_Inlet_Flowrate_Set_value' },
  'ch4_inlet_set': { label: 'CH4 Inlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CH4_Inlet_Flowrate_Set_value' },
  'co2_inlet_set': { label: 'CO2 Inlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CO2_Inlet_Flowrate_Set_value' },
  'n_inlet_set': { label: 'N2 Inlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'N2_Inlet_Flowrate_Set_value' },
  'air_inlet_set': { label: 'Air Inlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Air_Inlet_Flowrate_Set_value' },
  'water_inlet_set': { label: 'Water Inlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Water_Inlet_Flowrate_Set_value' },
  'preheater1_set': { label: 'Pre-heater 1 Temperature Set Variable', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_1_Set_value' },
  'preheater2_set': { label: 'Pre-heater 2 Temperature Set Variable', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_2_Set_value' },
  'preheater3_set': { label: 'Pre-heater 3 Temperature Set Variable', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_3_Set_value' },
  'preheater4_set': { label: 'Pre-heater 4 Temperature Set Variable', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_preheater_4_Set_value' },
  'furnace1_temp_set': { label: 'Reactor Furnace 1 Temperature Set Variable', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_reactor_furnace_1_Set_value' },
  'furnace2_temp_set': { label: 'Reactor Furnace 2 Temperature Set Variable', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_reactor_furnace_2_Set_value' },
  'furnace3_temp_set': { label: 'Reactor Furnace 3 Temperature Set Variable', unit: '°C', assetId: DEFAULT_ASSET, propertyId: 'Temp_reactor_furnace_3_Set_value' },
  'pressure_reactor_set': { label: 'Reactor Pressure Set Variable', unit: 'Bar', assetId: DEFAULT_ASSET, propertyId: 'Pressure_reactor_Set_value' },
  'h2_outlet_set': { label: 'H2 Outlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'H2_outlet_Flowrate_Set_value' },
  'ch4_outlet_set': { label: 'CH4 Outlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CH4_outlet_Flowrate_Set_value' },
  'co2_outlet_set': { label: 'CO2 Outlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CO2_outlet_Flowrate_Set_value' },
  'co_outlet_set': { label: 'CO Outlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'CO_outlet_Flowrate_Set_value' },
  'n_outlet_set': { label: 'N2 Outlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'N2_outlet_Flowrate_Set_value' },
  'air_outlet_set': { label: 'Air Outlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Air_outlet_Flowrate_Set_value' },
  'water_outlet_set': { label: 'Water Outlet Flowrate Set Variable', unit: 'ml/min', assetId: DEFAULT_ASSET, propertyId: 'Water_outlet_Flowrate_Set_value' },
};