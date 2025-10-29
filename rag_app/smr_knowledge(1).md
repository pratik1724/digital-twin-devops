# Steam Methane Reformer (SMR) — Digital Twin Reference

## Document Meta
- version: 1.0
- updated: 2025-09-03
- domain: Process Engineering / SMR
- units:
  - flow: ml/min
  - temperature: °C
  - pressure: bar

## System Overview
The Steam Methane Reformer (SMR) mixes feed gases (H₂, CH₄, CO₂, N₂ or Air) using mass flow controllers (MFCs), pre-heats the mixture, controls pressure, and feeds a multi-zone reactor furnace. Products (H₂, CO, unreacted CH₄/CO₂) are condensed, separated, measured, and optionally analyzed via gas chromatography (GC).

## Key Rules
- N₂ and Air share **one controller** and are **mutually exclusive** (only one at a time).
- Every metric has a **Set Variable** (controller target) and a **Process Variable** (measured value).
- All flowrates are **ml/min**, temperature **°C**, pressure **bar**.

## Metrics (Canonical Keys)
- Example: `H2_Inlet_Flowrate_Set_variable`, `H2_Inlet_Flowrate_Process_variable`
- Example: `Pressure_reactor_Set_variable`, `Pressure_reactor_Process_variable`

## Process Flow (High Level)
1. Inlet & Mixing — MFCs set flows; gases mix at T-junction.
2. Pre-Heating — Mixture passes through pre-heaters (1–4).
3. Pressure Check — Pressure measured prior to reactor.
4. Reaction — Reactor furnace zones (1–3) execute SMR; bed temperature monitored.
5. Cooling & Separation — Condenser removes moisture; GLC separator downstream.
6. Measurement & Analysis — Ritter gas flow meter measures outlet flow; stream to vent or GC.
