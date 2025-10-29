# DRM Simulation Flow - Complete Technical Documentation

## Overview
This document explains the complete flow when a user clicks the "RUN SIMULATION" button on the First Order Principle Simulation page.

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: FRONTEND - User Clicks "RUN SIMULATION"                │
│ File: IndustrialDRMSimulation.jsx                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: FRONTEND - Prepare Payload                             │
│ - Collect simulationParams (inlet temperatures, pressures)      │
│ - Create JSON payload with inlet_modifications                  │
│ - Send POST request to backend                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: BACKEND - Receive Request                              │
│ File: server.py - Endpoint: /api/dwsim/simulation/run          │
│ - Generate unique simulation_id (UUID)                          │
│ - Create temporary config file with parameters                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: BACKEND - Execute Python Script                        │
│ File: simulation_script.py                                      │
│ - Run via subprocess with config file path                      │
│ - Script starts execution                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5: SCRIPT - Check DWSIM API Health                        │
│ - Call http://65.0.119.135:5000/api/health                     │
│ - Verify DWSIM service is running                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6: SCRIPT - Load Configuration                            │
│ - Read JSON config file from /tmp/dwsim_config_{id}.json       │
│ - Extract inlet_modifications, output_streams                   │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 7: SCRIPT - Call DWSIM API                                │
│ - POST to http://65.0.119.135:5000/api/simulation/run          │
│ - Send inlet modifications (stream temps, pressures, flows)     │
│ - DWSIM runs physical simulation                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 8: DWSIM API - Process Simulation                         │
│ External Service: http://65.0.119.135:5000                     │
│ - Load .dwxmz flowsheet file                                   │
│ - Apply inlet modifications to streams                          │
│ - Run thermodynamic calculations                               │
│ - Calculate all stream properties                              │
│ - Return JSON with all_streams data                            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 9: SCRIPT - Process DWSIM Response                        │
│ - Parse JSON response from DWSIM                                │
│ - Extract all_streams data (temp, pressure, flow, etc.)        │
│ - Format stream information                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 10: SCRIPT - Save to Database                             │
│ File: database.py                                               │
│ - Generate new simulation_id                                    │
│ - Save to SQLite: dwsim_simulation_results.db                  │
│ - Tables: simulation_metadata, streams, modifications          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 11: SCRIPT - Save Results to JSON File                    │
│ - Write results to /tmp/dwsim_results_{id}.json                │
│ - Include all stream data and metadata                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 12: BACKEND - Read Results                                │
│ File: server.py                                                 │
│ - Check script return code (0 = success)                        │
│ - Read JSON results file                                        │
│ - Query database for latest simulation summary                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 13: BACKEND - Build Response                              │
│ - Create DWSIMSimulationResponse object                         │
│ - Include: success, simulation_id, timestamp                    │
│ - Include: results (all_streams data)                          │
│ - Include: database_summary (total/active streams)             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 14: BACKEND - Cleanup                                     │
│ - Delete temporary config file                                  │
│ - Delete temporary results file                                │
│ - Return JSON response to frontend                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 15: FRONTEND - Process Response                           │
│ File: IndustrialDRMSimulation.jsx                              │
│ - Receive JSON response                                         │
│ - Check data.success and data.database_summary                  │
│ - Extract stream counts and names                              │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 16: FRONTEND - Update UI                                  │
│ - Set simulationData state                                      │
│ - Display: "Active Streams: 6, Total Streams: 7"              │
│ - Show detailed stream data in logs                            │
│ - Calculate and display KPIs                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 File-by-File Breakdown

### 1️⃣ **Frontend: `/app/frontend/src/components/simulation/IndustrialDRMSimulation.jsx`**

**Function: `handleRunSimulation()`** (Lines 389-580)

**What it does:**
1. **Sets loading state**: `setIsRunning(true)` - shows spinner
2. **Prepares payload**: Uses `simulationParams` state which contains:
   ```javascript
   {
     inlet_modifications: {
       stream_3: { temperature_C: 25, pressure_bar: 1.0, mass_flow_mg_s: 30 },
       stream_4: { temperature_C: 25, pressure_bar: 1.0, mass_flow_mg_s: 11 }
     },
     output_streams: [1, 2, 6, 7],
     include_all_streams: true
   }
   ```
3. **Makes API call**: 
   - URL: `${DEFAULT_API_BASE_URL}/api/dwsim/simulation/run`
   - Method: POST
   - Headers: JSON content type
4. **Handles response**: Checks for `data.database_summary` (the fix we made!)
5. **Updates UI**: Sets `simulationData` state with processed results
6. **Builds detailed logs**: Formats stream data for display

**Key Variables:**
- `simulationParams` - Input parameters for simulation
- `simulationData` - Results from simulation
- `isRunning` - Loading state
- `logs` - Array of log entries

---

### 2️⃣ **Backend: `/app/backend/server.py`**

**Endpoint: `POST /api/dwsim/simulation/run`** (Lines 402-509)

**What it does:**
1. **Generate IDs**: Creates unique `simulation_id` (UUID) and timestamp
2. **Create temp files**:
   ```python
   config_file = f"/tmp/dwsim_config_{simulation_id}.json"
   output_file = f"/tmp/dwsim_results_{simulation_id}.json"
   ```
3. **Write config**: Saves request parameters to JSON file
4. **Execute script**: Runs simulation_script.py via subprocess:
   ```python
   cmd = [python_path, str(script_path), config_file, output_file]
   result = subprocess.run(cmd, capture_output=True, timeout=300)
   ```
5. **Read results**: Loads JSON from output_file if script succeeds
6. **Query database**: Gets latest simulation summary using `simulation_db`
7. **Build response**: Returns DWSIMSimulationResponse with:
   - `success`: True/False
   - `simulation_id`: UUID
   - `timestamp`: ISO format
   - `output`: Script stdout
   - `results`: All streams data
   - `database_summary`: Stream counts and names
8. **Cleanup**: Deletes temporary files

**Key Objects:**
- `DWSIMSimulationRequest` - Pydantic model for request
- `DWSIMSimulationResponse` - Pydantic model for response
- `simulation_db` - Database instance (imported from database.py)

---

### 3️⃣ **Script: `/app/backend/simulation_script.py`**

**Main Flow** (Lines 310-346)

**What it does:**
1. **Parse arguments**: Gets config_file and output_file paths from sys.argv
2. **Check health**: Calls DWSIM API `/api/health` endpoint
3. **Load config**: Reads JSON file with `load_simulation_config()`
4. **Run simulation**: Calls `run_simulation_from_json(config)`
   - Prepares payload with inlet_modifications
   - POSTs to `http://65.0.119.135:5000/api/simulation/run`
   - Receives all_streams data from DWSIM
5. **Parse response**: Extracts stream data for each stream:
   ```python
   {
     'stream_1': {
       'stream_number': 1,
       'custom_name': '6',
       'temperature_C': 850.0,
       'pressure_bar': 1.0129,
       'mass_flow_mg_s': 41.0991,
       'active': True,
       # ... more properties
     }
   }
   ```
6. **Save to file**: Writes results to output JSON file
7. **Save to database**: Calls `db.save_simulation_result()`
8. **Print output**: Shows results on stdout

**Key Functions:**
- `check_api_health()` - Verifies DWSIM is running
- `load_simulation_config()` - Reads JSON config
- `run_simulation_from_json()` - Main simulation logic
- `save_results()` - Writes JSON file
- `parse_stream_data()` - Extracts stream properties

**DWSIM API Call:**
```python
response = requests.post(
    f"{API_BASE_URL}/api/simulation/run",
    json={
        "inlet_modifications": {...},
        "output_streams": [1,2,6,7],
        "include_all_streams": True
    }
)
```

---

### 4️⃣ **Database: `/app/backend/database.py`**

**Class: `SimulationDatabase`**

**What it does:**
1. **Initialize**: Creates SQLite database at `/app/backend/dwsim_simulation_results.db`
2. **Create tables**:
   - `simulation_metadata` - Stores run info (id, status, timestamps)
   - `streams` - Stores all stream properties (temp, pressure, flow, etc.)
   - `modifications` - Tracks parameter changes
3. **Save simulation**: `save_simulation_result()` method
   - Generates new simulation_id
   - Inserts metadata row
   - Inserts one row per stream (7 streams = 7 rows)
   - Inserts modification records
4. **Query methods**:
   - `get_latest_simulation()` - Gets most recent run
   - `get_simulation_summary()` - Returns counts and stream names
   - `get_simulation_by_id()` - Gets specific run
   - `get_recent_simulations()` - Lists history

**Database Schema:**

**simulation_metadata table:**
```sql
- simulation_id (PRIMARY KEY)
- flowsheet_name
- simulation_status (success/failure)
- start_timestamp
- end_timestamp
- user_id
- config_file_name
- output_file_name
- raw_response (full JSON)
- created_at
```

**streams table:**
```sql
- stream_id (PRIMARY KEY)
- simulation_id (FOREIGN KEY)
- stream_number (1-7)
- custom_name ('6', 'CO2 Inlet', 'CH4 Inlet', etc.)
- display_name
- temperature_K, temperature_C
- pressure_Pa, pressure_bar
- mass_flow_kg_s, mass_flow_mg_s
- molar_flow_mol_s
- volumetric_flow_m3_s
- density_kg_m3
- molecular_weight_kg_mol
- enthalpy_kJ_kg
- entropy_kJ_kg_K
- active (BOOLEAN)
- timestamp
- created_at
```

**modifications table:**
```sql
- modification_id (PRIMARY KEY)
- simulation_id (FOREIGN KEY)
- stream_number
- parameter_changed ('temperature_C', 'pressure_bar', etc.)
- old_value
- new_value
- applied_status
- created_at
```

---

## 📊 Data Flow - Example

### Input (Frontend → Backend):
```json
{
  "inlet_modifications": {
    "stream_3": {
      "temperature_C": 25,
      "pressure_bar": 1.0,
      "mass_flow_mg_s": 30
    },
    "stream_4": {
      "temperature_C": 25,
      "pressure_bar": 1.0,
      "mass_flow_mg_s": 11
    }
  },
  "output_streams": [1, 2, 6, 7],
  "include_all_streams": true
}
```

### DWSIM API Response (Script → Backend):
```json
{
  "success": true,
  "timestamp": "2024-10-03T10:30:45Z",
  "flowsheet_name": "dmr.dwxmz",
  "modifications_applied": [
    "stream_3: Temperature: 25 °C",
    "stream_3: Pressure: 1.0 bar"
  ],
  "all_streams": {
    "stream_1": {
      "stream_number": 1,
      "custom_name": "6",
      "temperature_C": 850.0,
      "temperature_K": 1123.15,
      "pressure_bar": 1.0129,
      "pressure_Pa": 101290.49,
      "mass_flow_mg_s": 41.0991,
      "mass_flow_kg_s": 0.000041,
      "molar_flow_mol_s": 0.002665,
      "density_kg_m3": 0.1673,
      "molecular_weight_kg_mol": 15.4229,
      "enthalpy_kJ_kg": 1661.69,
      "entropy_kJ_kg_K": 4.2242,
      "active": true
    },
    "stream_2": { /* ... */ },
    "stream_3": { /* ... */ },
    "stream_4": { /* ... */ },
    "stream_5": { /* ... */ },
    "stream_6": { /* ... */ },
    "stream_7": { /* ... */ }
  },
  "summary": {
    "total_streams": 7,
    "active_streams": 6,
    "active_stream_names": ["stream_1", "stream_2", ...]
  }
}
```

### Database Summary (Backend → Frontend):
```json
{
  "simulation_id": "abc-123-def-456",
  "flowsheet_name": "dmr.dwxmz",
  "status": "success",
  "timestamp": "2024-10-03T10:30:45Z",
  "total_streams": 7,
  "active_streams": 6,
  "active_stream_names": ["6", "CO2 Inlet", "CO2 Sink", "CH4 Inlet", "CH4 Sink", "R-Inlet"],
  "stream_mapping": {
    "1": {"custom_name": "6", "display_name": "6"},
    "2": {"custom_name": "CO2 Inlet", "display_name": "CO2 Inlet"},
    "3": {"custom_name": "CO2 Sink", "display_name": "CO2 Sink"},
    "4": {"custom_name": "CH4 Inlet", "display_name": "CH4 Inlet"},
    "5": {"custom_name": "CH4 Sink", "display_name": "CH4 Sink"},
    "6": {"custom_name": "R-Inlet", "display_name": "R-Inlet"},
    "7": {"custom_name": "7", "display_name": "7"}
  },
  "modifications_count": 8
}
```

### Final Response (Backend → Frontend):
```json
{
  "success": true,
  "simulation_id": "abc-123-def-456",
  "timestamp": "2024-10-03T10:30:45.123Z",
  "output": "✓ Simulation completed successfully...",
  "results": {
    "all_streams": { /* Full DWSIM data */ }
  },
  "database_summary": {
    "total_streams": 7,
    "active_streams": 6,
    "active_stream_names": [...],
    "stream_mapping": {...}
  },
  "error": null
}
```

---

## 🔧 Key Technologies

1. **Frontend**: React.js with hooks (useState, useEffect)
2. **Backend**: FastAPI (Python) with async/await
3. **Subprocess**: Python subprocess module for script execution
4. **External API**: DWSIM simulation engine (http://65.0.119.135:5000)
5. **Database**: SQLite3 with foreign keys
6. **Data Format**: JSON for all API communication
7. **File System**: Temporary files in /tmp for config and results

---

## ⏱️ Timing Breakdown

| Step | Component | Approx Time |
|------|-----------|-------------|
| 1-2 | Frontend preparation | < 100ms |
| 3-4 | Backend setup | < 200ms |
| 5-6 | Script initialization | < 500ms |
| 7-8 | DWSIM API simulation | 2-10 seconds |
| 9-11 | Data processing & DB save | < 1 second |
| 12-14 | Backend response building | < 500ms |
| 15-16 | Frontend UI update | < 100ms |
| **Total** | **Full flow** | **3-15 seconds** |

---

## 🐛 The Bug We Fixed

**Problem**: Frontend showed "Unknown" for stream counts

**Root Cause**: Frontend was looking for `data.summary` but backend returns `data.database_summary`

**Fix Location**: Line 534 in `IndustrialDRMSimulation.jsx`

```javascript
// BEFORE (Wrong):
Active Streams: ${data.summary?.active_streams || 'Unknown'}
Total Streams: ${data.summary?.total_streams || 'Unknown'}

// AFTER (Fixed):
Active Streams: ${data.database_summary?.active_streams || 'Unknown'}
Total Streams: ${data.database_summary?.total_streams || 'Unknown'}
```

---

## 📝 Summary

The simulation flow is a **multi-layer architecture** with clear separation of concerns:

1. **Frontend** handles user interaction and display
2. **Backend API** orchestrates the process
3. **Python Script** communicates with DWSIM
4. **DWSIM API** performs physical calculations
5. **Database** stores results for history and analysis

Each layer has a specific job, making the system maintainable and debuggable.
