# pfr_drm_cantera.py
# ------------------------------------------------------------
# Isothermal, isobaric PFR model for Dry Reforming of Methane
# Uses Cantera for thermodynamics and simple global power-law kinetics.
#
# pip install cantera numpy pandas
# Run a single test case:
#   python pfr_drm_cantera.py
#
# To batch over a CSV, create a small driver (shown at bottom comment).
# ------------------------------------------------------------
import math
import logging
from dataclasses import dataclass
from typing import Dict, Tuple, Optional

import numpy as np
import cantera as ct

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Custom exceptions for better error handling
class PFRModelError(Exception):
    """Base exception for PFR model errors."""
    pass

class KineticsError(PFRModelError):
    """Exception raised for kinetics calculation errors."""
    pass

class ThermodynamicsError(PFRModelError):
    """Exception raised for thermodynamics calculation errors."""
    pass

class InputValidationError(PFRModelError):
    """Exception raised for invalid input parameters."""
    pass


# -----------------------------
# KINETIC PARAMETERS (EDIT ME)
# -----------------------------
@dataclass
class KineticsParams:
    # Global power-law: r = A * exp(-E/RT) * Π p_i^alpha_i   [mol/(m^3·s)]
    # Replace these with values fitted to your catalyst/system.
    # --- DRM: CH4 + CO2 <-> 2CO + 2H2
    A_drm: float = 1.00e-3        # <-- PLACEHOLDER
    E_drm: float = 1.20e5         # J/mol  <-- PLACEHOLDER
    orders_drm: Dict[str, float] = None  # e.g. {"CH4":1.0, "CO2":1.0}

    # --- RWGS: CO2 + H2 <-> CO + H2O
    A_rwgs: float = 5.00e-4       # <-- PLACEHOLDER
    E_rwgs: float = 9.00e4        # J/mol  <-- PLACEHOLDER
    orders_rwgs: Dict[str, float] = None  # e.g. {"CO2":1.0, "H2":1.0}

    def __post_init__(self):
        if self.orders_drm is None:
            self.orders_drm = {"CH4": 1.0, "CO2": 1.0}
        if self.orders_rwgs is None:
            self.orders_rwgs = {"CO2": 1.0, "H2": 1.0}
        
        # Validate kinetic parameters
        self._validate_params()
    
    def _validate_params(self):
        """Validate kinetic parameters."""
        if self.A_drm <= 0 or self.A_rwgs <= 0:
            raise InputValidationError("Pre-exponential factors must be positive")
        if self.E_drm < 0 or self.E_rwgs < 0:
            raise InputValidationError("Activation energies must be non-negative")


# -----------------------------
# UTILITIES
# -----------------------------
def validate_inputs(T_C: float, P_bar: float, flow_rates: Dict[str, float], GHSV_h_1: float):
    """Validate input parameters."""
    if T_C < -273.15:
        raise InputValidationError(f"Temperature {T_C}°C is below absolute zero")
    if T_C > 2000:
        logger.warning(f"Very high temperature {T_C}°C - results may be unreliable")
    
    if P_bar <= 0:
        raise InputValidationError(f"Pressure {P_bar} bar must be positive")
    if P_bar > 100:
        logger.warning(f"Very high pressure {P_bar} bar - ideal gas assumption may not hold")
    
    for species, flow in flow_rates.items():
        if flow < 0:
            raise InputValidationError(f"Flow rate for {species} cannot be negative: {flow}")
    
    total_flow = sum(flow_rates.values())
    if total_flow <= 0:
        raise InputValidationError("Total inlet flow rate must be positive")
    
    if GHSV_h_1 <= 0:
        raise InputValidationError(f"GHSV {GHSV_h_1} h⁻¹ must be positive")


def build_gas(T: float, P: float, X: Dict[str, float]) -> ct.Solution:
    """
    Create a Cantera ideal-gas mixture with species used in DRM.
    Using gri30.yaml (has CH4, CO2, CO, H2, H2O, N2).
    """
    try:
        gas = ct.Solution("gri30.yaml")
        
        # Validate mole fractions
        total_X = sum(X.values())
        if total_X <= 0:
            raise ThermodynamicsError("Total mole fraction must be positive")
        
        # Normalize mole fractions
        X_norm = {k: v/total_X for k, v in X.items()}
        
        full = {"CH4": 0.0, "CO2": 0.0, "CO": 0.0, "H2": 0.0, "H2O": 0.0, "N2": 0.0}
        full.update(X_norm)
        
        # Check for NaN or infinite values
        for species, frac in full.items():
            if not np.isfinite(frac) or frac < 0:
                raise ThermodynamicsError(f"Invalid mole fraction for {species}: {frac}")
        
        gas.TPX = T, P, full
        return gas
        
    except ct.CanteraError as e:
        raise ThermodynamicsError(f"Cantera error in build_gas: {e}")
    except Exception as e:
        raise ThermodynamicsError(f"Unexpected error in build_gas: {e}")


def mlpm_to_molps(ml_per_min: float, gas: ct.Solution) -> float:
    """
    Convert ml/min (at current gas T,P) to mol/s.
    n_dot = V_dot * c, where c is molar density from Cantera.
    """
    try:
        if ml_per_min < 0:
            raise InputValidationError(f"Flow rate cannot be negative: {ml_per_min}")
        
        vdot = ml_per_min * 1e-6 / 60.0        # m^3/s
        c = gas.density_mole * 1e3            # kmol/m^3 -> mol/m^3
        
        if not np.isfinite(c) or c <= 0:
            raise ThermodynamicsError(f"Invalid molar density: {c}")
        
        return vdot * c
        
    except ct.CanteraError as e:
        raise ThermodynamicsError(f"Cantera error in mlpm_to_molps: {e}")


def power_law_rate(A: float, E: float, orders: Dict[str, float],
                   gas: ct.Solution, p_i: Dict[str, float]) -> float:
    """Forward power-law rate [mol/(m^3·s)]."""
    try:
        R = ct.gas_constant
        
        # Check for reasonable temperature
        if gas.T <= 0:
            raise KineticsError(f"Invalid temperature: {gas.T}")
        
        # Calculate rate constant with overflow protection
        exp_arg = -E / (R * gas.T)
        if exp_arg < -700:  # Prevent underflow
            logger.warning(f"Very small rate constant due to high activation energy")
            k = 0.0
        else:
            k = A * math.exp(exp_arg)
        
        prod_p = 1.0
        for sp, alpha in orders.items():
            p_val = max(p_i.get(sp, 0.0), 0.0)
            if alpha != 0:
                if p_val == 0 and alpha < 0:
                    raise KineticsError(f"Cannot raise zero pressure to negative power for {sp}")
                prod_p *= p_val ** alpha
        
        rate = k * prod_p
        
        if not np.isfinite(rate):
            raise KineticsError(f"Non-finite reaction rate calculated: {rate}")
        
        return max(rate, 0.0)  # Ensure non-negative
        
    except (OverflowError, ZeroDivisionError) as e:
        raise KineticsError(f"Numerical error in power_law_rate: {e}")


def equilibrium_constant(gas: ct.Solution, reaction: Tuple[Tuple[str, int], ...]) -> float:
    """
    Calculate equilibrium constant using Gibbs free energy.
    reaction: tuple of (species, nu) with nu>0 for products, nu<0 for reactants.
    """
    try:
        R = ct.gas_constant
        P0 = ct.one_atm

        # Use standard Gibbs free energy of formation - FIXED METHOD
        smap = {s: i for i, s in enumerate(gas.species_names)}

        dnu = 0.0
        dG0 = 0.0
        
        for sp, nu in reaction:
            if sp not in smap:
                raise ThermodynamicsError(f"Species {sp} not found in gas mechanism")
            
            dnu += nu
            # Use standard enthalpies and entropies to calculate Gibbs energy
            species_index = smap[sp]
            h0 = gas.standard_enthalpies_RT[species_index] * R * gas.T  # J/mol
            s0 = gas.standard_entropies_R[species_index] * R  # J/(mol·K)
            g0 = h0 - gas.T * s0  # J/mol
            dG0 += nu * g0

        # Calculate equilibrium constant
        lnKp = -dG0 / (R * gas.T) - dnu * math.log(P0 / gas.P)
        
        # Clip to prevent overflow/underflow
        lnKp = float(np.clip(lnKp, -700.0, 700.0))
        Kp = math.exp(lnKp)
        
        if not np.isfinite(Kp) or Kp <= 0:
            raise ThermodynamicsError(f"Invalid equilibrium constant: {Kp}")
        
        return Kp
        
    except ct.CanteraError as e:
        raise ThermodynamicsError(f"Cantera error in equilibrium_constant: {e}")
    except Exception as e:
        raise ThermodynamicsError(f"Error calculating equilibrium constant: {e}")


# -----------------------------
# PFR SOLVER
# -----------------------------
def pfr_drm(
    T_C: float,
    P_bar: float,
    fCH4_mlpm: float,
    fCO2_mlpm: float,
    fN2_mlpm: float,
    GHSV_h_1: float,
    nseg: int = 200,
    kin: Optional[KineticsParams] = None,
):
    """
    Isothermal, isobaric PFR for DRM + RWGS with global kinetics.
    Integrates along reactor volume V computed from GHSV:  GHSV = Vdot_in / V_reactor.
    Returns dict with outlet mole fractions and total molar flow.
    """
    try:
        # Input validation
        flow_rates = {"CH4": fCH4_mlpm, "CO2": fCO2_mlpm, "N2": fN2_mlpm}
        validate_inputs(T_C, P_bar, flow_rates, GHSV_h_1)
        
        if kin is None:
            kin = KineticsParams()
        
        if nseg <= 0:
            raise InputValidationError(f"Number of segments must be positive: {nseg}")
        
        logger.info(f"Starting PFR simulation: T={T_C}°C, P={P_bar}bar, GHSV={GHSV_h_1}h⁻¹")
        
        T = T_C + 273.15
        P = P_bar * 1e5

        # Initial composition for density calculation
        gas = build_gas(T, P, {"CH4": 0.5, "CO2": 0.5})

        F = np.zeros(6)  # [CH4, CO2, CO, H2, H2O, N2]
        idx = {"CH4": 0, "CO2": 1, "CO": 2, "H2": 3, "H2O": 4, "N2": 5}

        F[idx["CH4"]] = mlpm_to_molps(fCH4_mlpm, gas)
        F[idx["CO2"]] = mlpm_to_molps(fCO2_mlpm, gas)
        F[idx["N2"]]  = mlpm_to_molps(fN2_mlpm,  gas) if fN2_mlpm > 0 else 0.0

        # Reactor volume from GHSV
        X0 = {"CH4": F[idx["CH4"]], "CO2": F[idx["CO2"]], "N2": F[idx["N2"]]}
        s = sum(X0.values()) + 1e-30
        X0 = {k: v / s for k, v in X0.items()}
        gas = build_gas(T, P, X0)

        # Inlet volumetric flow (ideal gas approximation)
        Vdot_in = (F.sum()) * (ct.gas_constant * T / P)  # m^3/s
        V_reactor = max(Vdot_in / GHSV_h_1, 1e-15)       # m^3
        dV = V_reactor / nseg

        # Stoichiometry vectors [CH4, CO2, CO, H2, H2O, N2]
        nu_drm  = np.array([-1, -1, +2, +2,  0, 0], dtype=float)  # CH4 + CO2 <-> 2CO + 2H2
        nu_rwgs = np.array([ 0, -1, +1, -1, +1, 0], dtype=float)  # CO2 + H2  <-> CO + H2O

        rxn_drm  = (("CO", 2), ("H2", 2), ("CH4", -1), ("CO2", -1))
        rxn_rwgs = (("CO", 1), ("H2O", 1), ("CO2", -1), ("H2", -1))

        for segment in range(nseg):
            try:
                Ft = F.sum()
                if Ft <= 1e-30:
                    logger.warning(f"Very low total flow at segment {segment}")
                    break
                
                X = {sp: F[idx[sp]] / Ft for sp in idx}
                gas = build_gas(T, P, X)

                # Partial pressures
                p_i = {sp: X[sp] * P for sp in idx}

                # Forward power-law rates
                r_drm_f  = power_law_rate(kin.A_drm,  kin.E_drm,  kin.orders_drm,  gas, p_i)
                r_rwgs_f = power_law_rate(kin.A_rwgs, kin.E_rwgs, kin.orders_rwgs, gas, p_i)

                # Equilibrium constants
                Kp_drm  = equilibrium_constant(gas, rxn_drm)
                Kp_rwgs = equilibrium_constant(gas, rxn_rwgs)

                # Reaction quotients Qp = Π p_i^nu_i
                def Qp(nu_vec):
                    q = 1.0
                    for sp, nu in zip(idx.keys(), nu_vec):
                        if nu != 0:
                            p_val = max(p_i[sp], 1e-30)
                            q *= p_val ** nu
                    return float(np.clip(q, 1e-300, 1e300))

                # Net rates: r_net = r_f * (1 - Qp/Kp), softly damp extreme ratios
                ratio_drm = Qp(nu_drm) / max(Kp_drm, 1e-300)
                r_drm_net = r_drm_f * (1.0 - np.tanh(ratio_drm))

                ratio_rwgs = Qp(nu_rwgs) / max(Kp_rwgs, 1e-300)
                r_rwgs_net = r_rwgs_f * (1.0 - np.tanh(ratio_rwgs))

                # Species source terms [mol/(m^3·s)]
                R = nu_drm * r_drm_net + nu_rwgs * r_rwgs_net

                # Check for numerical issues
                if not np.all(np.isfinite(R)):
                    logger.warning(f"Non-finite reaction rates at segment {segment}")
                    R = np.nan_to_num(R, nan=0.0, posinf=0.0, neginf=0.0)

                # PFR balances: dF_i/dV = R_i
                F = F + R * dV
                F = np.clip(F, 0.0, None)  # Ensure non-negative flows
                
            except Exception as e:
                logger.error(f"Error in segment {segment}: {e}")
                # Continue with current F values
                continue

        # Final results
        Ft = F.sum() + 1e-30
        y = {sp: F[idx[sp]] / Ft for sp in idx}
        
        logger.info("PFR simulation completed successfully")
        
        return {
            "y_H2": y["H2"],
            "y_CH4": y["CH4"],
            "y_CO": y["CO"],
            "y_CO2": y["CO2"],
            "y_H2O": y["H2O"],
            "Ftot_mol_s": Ft,
        }
        
    except Exception as e:
        logger.error(f"PFR simulation failed: {e}")
        raise PFRModelError(f"PFR simulation failed: {e}")


# -----------------------------
# QUICK TEST (single case)
# -----------------------------
if __name__ == "__main__":
    try:
        # Example inlet matching your CSV-style units (ml/min)
        T_C = 825.0
        P_bar = 1.0
        fCH4_mlpm = 700.0      # CH4 inlet (ml/min)
        fCO2_mlpm = 300.0      # CO2 inlet (ml/min)
        fN2_mlpm  = 0.0        # optional diluent
        GHSV = 10000.0         # h^-1

        kp = KineticsParams(
            # <<< Replace placeholders with your fitted values >>>
            A_drm=1.0e-3,  E_drm=1.2e5,  orders_drm={"CH4": 1.0, "CO2": 1.0},
            A_rwgs=5.0e-4, E_rwgs=9.0e4, orders_rwgs={"CO2": 1.0, "H2": 1.0},
        )

        out = pfr_drm(T_C, P_bar, fCH4_mlpm, fCO2_mlpm, fN2_mlpm, GHSV, nseg=400, kin=kp)
        print("Outlet (dry):", {k: round(v, 5) for k, v in out.items()})
        
    except PFRModelError as e:
        logger.error(f"PFR Model Error: {e}")
        print(f"Error: {e}")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        print(f"Unexpected error: {e}")