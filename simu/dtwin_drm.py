# dtwin_drm.py
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import Dict
import pandas as pd
import json

app = FastAPI(title="Digital Twin DRM API")

# -------------------------------
# 1. Input models
# -------------------------------
class MFCSpec(BaseModel):
    flow_mol_s: float
    z: Dict[str, float]

class ReactorSpec(BaseModel):
    DRM_conversion: float

class CoolerSpec(BaseModel):
    outlet_T_C: float

class SimulationInput(BaseModel):
    pressure_bar: float
    preheat_T_C: float
    mfc: Dict[str, MFCSpec]
    reactor: ReactorSpec
    cooler: CoolerSpec

# -------------------------------
# 2. Core simulation function
# -------------------------------
def simulate_drm(inputs: Dict):
    P_bar = inputs["pressure_bar"]
    T_preheat = inputs["preheat_T_C"]
    conv = inputs["reactor"]["DRM_conversion"]
    T_cool = inputs["cooler"]["outlet_T_C"]

    # Mix MFC streams
    total_flow = 0
    mix = {}
    for _, spec in inputs["mfc"].items():
        F = spec["flow_mol_s"]
        total_flow += F
        for comp, frac in spec["z"].items():
            mix[comp] = mix.get(comp, 0) + F * frac
    z_feed = {c: f / total_flow for c, f in mix.items()}

    # Reactor
    F_CH4_in = mix.get("CH4", 0.0)
    F_CO2_in = mix.get("CO2", 0.0)
    reacted = min(F_CH4_in, F_CO2_in) * conv
    F_CH4_out = F_CH4_in - reacted
    F_CO2_out = F_CO2_in - reacted
    F_CO_out = mix.get("CO", 0.0) + 2 * reacted
    F_H2_out = mix.get("H2", 0.0) + 2 * reacted
    F_other = {c: f for c, f in mix.items() if c not in ["CH4", "CO2", "CO", "H2"]}
    F_total_out = F_CH4_out + F_CO2_out + F_CO_out + F_H2_out + sum(F_other.values())
    z_reactor = {
        "CH4": F_CH4_out / F_total_out,
        "CO2": F_CO2_out / F_total_out,
        "CO": F_CO_out / F_total_out,
        "H2": F_H2_out / F_total_out,
    }
    for c, f in F_other.items():
        z_reactor[c] = f / F_total_out

    duties = {
        "preheater": 55.6 * total_flow,
        "reactor": 187.9 * reacted / max(conv, 1e-8),
        "cooler": 120.5 * reacted,
        "total": 55.6 * total_flow + 187.9 * reacted / max(conv, 1e-8) + 120.5 * reacted,
    }

    KPIs = {
        "CH4_conversion": reacted / F_CH4_in if F_CH4_in > 1e-8 else 0,
        "CO2_conversion": reacted / F_CO2_in if F_CO2_in > 1e-8 else 0,
        "H2_CO": (F_H2_out / F_CO_out) if F_CO_out > 1e-8 else None,
        "syngas_purity": (F_H2_out + F_CO_out) / F_total_out if F_total_out > 1e-8 else None,
    }

    return {
        "blocks": {
            "feed": {"F_mol_s": total_flow, "T_C": T_preheat, "P_bar": P_bar, "z": z_feed},
            "reactor": {"F_mol_s": F_total_out, "T_C": T_preheat, "P_bar": P_bar, "z": z_reactor},
            "cooler": {"F_mol_s": F_total_out, "T_C": T_cool, "P_bar": P_bar, "z": z_reactor},
        },
        "duties_kW": duties,
        "KPIs": KPIs,
    }

# -------------------------------
# 3. Endpoints
# -------------------------------
@app.post("/simulate/drm")
def simulate_single(input_data: SimulationInput):
    return simulate_drm(input_data.dict())

@app.post("/simulate/drm_timeseries")
async def simulate_timeseries(file: UploadFile = File(...)):
    print(f"📂 Received file: {file.filename} ({file.content_type})")

    if file.filename.endswith(".json"):
        raw = await file.read()
        data = json.loads(raw)
        df = pd.DataFrame(data)
    elif file.filename.endswith(".csv"):
        df = pd.read_csv(file.file)
    else:
        return {"error": "Only .json or .csv supported"}

    print("✅ Parsed DataFrame:")
    print(df.head())

    results = []
    for _, row in df.iterrows():
        input_dict = {
            "pressure_bar": row["pressure_bar"],
            "preheat_T_C": row["preheat_T_C"],
            "mfc": {
                "MFC100": {"flow_mol_s": row["MFC100_flow_mol_s"], "z": {"CO2": row["MFC100_CO2_frac"], "CO": row["MFC100_CO_frac"]}},
                "MFC200": {"flow_mol_s": row["MFC200_flow_mol_s"], "z": {"O2": row["MFC200_O2_frac"], "N2": row["MFC200_N2_frac"]}},
                "MFC300": {"flow_mol_s": row["MFC300_flow_mol_s"], "z": {"CH4": row["MFC300_CH4_frac"], "H2": row["MFC300_H2_frac"]}},
            },
            "reactor": {"DRM_conversion": row["DRM_conversion"]},
            "cooler": {"outlet_T_C": row["cooler_outlet_T_C"]},
        }
        sim = simulate_drm(input_dict)
        sim["time_s"] = row["time_s"]
        results.append(sim)

    return {"timeseries": results}
