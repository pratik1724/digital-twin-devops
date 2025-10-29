# test_request.py
import requests
import json

BASE_URL = "http://localhost:8000"

# -------------------------------
# 1. Test single-shot simulation
# -------------------------------
def test_single_json():
    url = f"{BASE_URL}/simulate/drm"
    payload = {
        "pressure_bar": 6.0,
        "preheat_T_C": 800,
        "mfc": {
            "MFC100": {"flow_mol_s": 0.2, "z": {"CO2": 0.9, "CO": 0.1}},
            "MFC200": {"flow_mol_s": 0.05, "z": {"O2": 0.21, "N2": 0.79}},
            "MFC300": {"flow_mol_s": 0.8, "z": {"CH4": 0.95, "H2": 0.05}},
        },
        "reactor": {"DRM_conversion": 0.7},
        "cooler": {"outlet_T_C": 40},
    }
    res = requests.post(url, json=payload)
    print("\n--- Single JSON Simulation ---")
    print(res.status_code, res.json())

# -------------------------------
# 2. Test timeseries CSV simulation
# -------------------------------
def test_timeseries_csv():
    url = f"{BASE_URL}/simulate/drm_timeseries"
    with open("drm_timeseries_input.csv", "rb") as f:
        res = requests.post(url, files={"file": ("drm_timeseries_input.csv", f, "text/csv")})
    print("\n--- Timeseries CSV Simulation ---")
    print("Status:", res.status_code)
    print("Raw Response:", res.text)
    try:
        print("Parsed JSON:", json.dumps(res.json(), indent=2))
    except Exception as e:
        print("⚠️ Could not parse JSON:", e)

# -------------------------------
# Run tests
# -------------------------------
if __name__ == "__main__":
    test_single_json()
    test_timeseries_csv()
