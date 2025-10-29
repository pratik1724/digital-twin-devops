# Simulation - First Order Principle Modeling

## Overview

This directory contains the First Order Principle (FOP) simulation engine based on Cantera for chemical kinetics modeling of Steam Methane Reforming (SMR) processes. The simulation uses detailed reaction mechanisms and thermodynamics to predict reactor performance.

## 📁 Folder Structure

```
simulation/
├── README.md                        # This documentation
└── pfr_drm_cantera.py              # Main FOP simulation script
```

## 🔬 Core Simulation Script

### **pfr_drm_cantera.py**

#### **Purpose**
- Isothermal, isobaric Plug Flow Reactor (PFR) model for Dry Reforming of Methane
- Uses Cantera for thermodynamics and global power-law kinetics
- Integrates with backend API for parameter-driven simulations

#### **Key Features**
- **Cantera Integration**: Advanced thermodynamic property calculations
- **Kinetic Modeling**: Global power-law reaction kinetics for DRM
- **Error Handling**: Comprehensive exception handling with custom error classes
- **Logging**: Structured logging for debugging and monitoring
- **JSON I/O**: Structured input/output for API integration

#### **Architecture Overview**
```python
Input Parameters → Thermodynamic Setup → Kinetic Calculations → 
Integration → Results Processing → JSON Output
```

## 🧮 Scientific Implementation

### **Reaction Mechanism**
The script models the primary Dry Reforming of Methane reaction:
```
CH4 + CO2 ⇌ 2CO + 2H2  (ΔH = +247 kJ/mol)
```

### **Kinetic Model**
```python
@dataclass
class KineticsParams:
    # Global power-law: r = A * exp(-E/RT) * Π p_i^alpha_i [mol/(m^3·s)]
    A_drm: float = 1.00e-3        # Pre-exponential factor
    E_drm: float = 50000.0        # Activation energy [J/mol]
    alpha_CH4: float = 1.0        # CH4 reaction order
    alpha_CO2: float = 1.0        # CO2 reaction order
    alpha_CO: float = -0.5        # CO inhibition order
    alpha_H2: float = -0.5        # H2 inhibition order
```

### **Thermodynamic Properties**
- **Gas Properties**: Calculated using Cantera's ideal gas model
- **Transport Properties**: Viscosity, thermal conductivity, diffusion coefficients
- **Equilibrium**: Chemical equilibrium constants from thermodynamic data

## 📊 Input/Output Specification

### **Input Parameters**
```python
class SimulationInput:
    T_C: float          # Temperature [°C] (default: 825.0)
    P_bar: float        # Pressure [bar] (default: 1.0)  
    fCH4_mlpm: float    # CH4 flowrate [ml/min] (default: 700.0)
    fCO2_mlpm: float    # CO2 flowrate [ml/min] (default: 300.0)
    fN2_mlpm: float     # N2 flowrate [ml/min] (default: 0.0)
    GHSV: float         # Gas Hourly Space Velocity [h⁻¹] (default: 10000.0)
```

### **Parameter Validation Ranges**
```python
VALIDATION_RANGES = {
    'T_C': (600, 1000),      # Temperature limits
    'P_bar': (0.5, 10.0),    # Pressure limits  
    'fCH4_mlpm': (0, 2000),  # CH4 flowrate limits
    'fCO2_mlpm': (0, 2000),  # CO2 flowrate limits
    'fN2_mlpm': (0, 1000),   # N2 flowrate limits
    'GHSV': (1000, 50000)    # GHSV limits
}
```

### **Output Results**
```python
class SimulationOutput:
    runtime: float              # Computation time [s]
    exit_temperature: float     # Reactor exit temperature [°C]
    conversion_ch4: float       # CH4 conversion [-]
    conversion_co2: float       # CO2 conversion [-]
    yield_h2: float            # H2 yield [-]
    yield_co: float            # CO yield [-]
    outlet_composition: dict    # Mole fractions of all species
    pressure_drop: float        # Pressure drop [bar]
    heat_duty: float           # Heat duty [kW]
```

## 🔄 Execution Flow

### **1. Parameter Processing**
```python
def parse_input_parameters(input_file: str) -> SimulationInput:
    """Load and validate input parameters from JSON file"""
    with open(input_file, 'r') as f:
        params = json.load(f)
    
    # Validate parameter ranges
    for param, value in params.items():
        validate_parameter(param, value)
    
    return SimulationInput(**params)
```

### **2. Thermodynamic Setup**  
```python
def setup_cantera_gas(params: SimulationInput) -> ct.Solution:
    """Initialize Cantera gas object with inlet composition"""
    gas = ct.Solution('gri30.yaml')  # GRI-Mech 3.0 mechanism
    
    # Set inlet composition
    gas.set_equivalence_ratio(
        phi=calculate_equivalence_ratio(params),
        fuel='CH4', 
        oxidizer='CO2'
    )
    
    # Set thermodynamic state
    gas.TP = params.T_C + 273.15, params.P_bar * 101325
    
    return gas
```

### **3. Reactor Modeling**
```python
def solve_pfr_reactor(gas: ct.Solution, params: SimulationInput) -> Results:
    """Solve plug flow reactor using kinetic model"""
    
    # Calculate reactor volume from GHSV
    reactor_volume = calculate_reactor_volume(params.GHSV, flowrates)
    
    # Setup differential equation system
    def reactor_ode(z, y):
        # y = [concentrations, temperature]
        return calculate_reaction_rates(z, y, gas, kinetics)
    
    # Integrate along reactor length
    solution = solve_ivp(
        reactor_ode, 
        z_span=(0, reactor_length),
        y0=initial_conditions,
        method='LSODA',  # Stiff ODE solver
        rtol=1e-8, atol=1e-10
    )
    
    return process_results(solution, gas)
```

### **4. Results Processing**
```python
def calculate_performance_metrics(inlet, outlet) -> dict:
    """Calculate conversion, yield, and selectivity metrics"""
    
    # Conversions
    conv_ch4 = (inlet['CH4'] - outlet['CH4']) / inlet['CH4']
    conv_co2 = (inlet['CO2'] - outlet['CO2']) / inlet['CO2']
    
    # Yields  
    yield_h2 = outlet['H2'] / (2 * inlet['CH4'])  # Theoretical max: 2 mol H2/mol CH4
    yield_co = outlet['CO'] / (2 * inlet['CH4'])  # Theoretical max: 2 mol CO/mol CH4
    
    # Selectivities
    sel_h2 = outlet['H2'] / (2 * (inlet['CH4'] - outlet['CH4']))
    sel_co = outlet['CO'] / (2 * (inlet['CH4'] - outlet['CH4']))
    
    return {
        'conversion_ch4': conv_ch4,
        'conversion_co2': conv_co2, 
        'yield_h2': yield_h2,
        'yield_co': yield_co,
        'selectivity_h2': sel_h2,
        'selectivity_co': sel_co
    }
```

## 🚀 Usage Instructions

### **Command Line Execution**
```bash
# Direct execution with default parameters
python pfr_drm_cantera.py

# Execution with custom input file
python pfr_drm_cantera.py --input parameters.json

# Help and usage information
python pfr_drm_cantera.py --help
```

### **Input File Format (JSON)**
```json
{
    "T_C": 825.0,
    "P_bar": 1.0,
    "fCH4_mlpm": 700.0,
    "fCO2_mlpm": 300.0,
    "fN2_mlpm": 0.0,
    "GHSV": 10000.0
}
```

### **Backend API Integration**
The script is automatically called by the backend API endpoint `/api/simulation/fop`:

```python
# Backend integration flow
1. API receives simulation parameters
2. Creates temporary JSON input file
3. Executes: subprocess.run(['python', 'pfr_drm_cantera.py', '--input', temp_file])
4. Parses stdout JSON response
5. Returns structured results to frontend
```

### **Sample Output**
```json
{
    "runtime": 8.5,
    "exit_temperature": 825.5,
    "conversion_ch4": 0.82,
    "conversion_co2": 0.79,
    "yield_h2": 0.75,
    "yield_co": 0.78,
    "outlet_composition": {
        "CH4": 0.12,
        "CO2": 0.08,
        "H2": 0.35,
        "CO": 0.33,
        "N2": 0.12
    },
    "pressure_drop": 0.05,
    "heat_duty": -125.4
}
```

## 🔧 Dependencies

### **Required Python Packages**
```python
cantera>=3.0.0          # Chemical kinetics and thermodynamics
numpy>=1.24.0           # Numerical computing
scipy>=1.11.0           # Scientific computing (ODE solver)
pandas>=2.0.0           # Data manipulation (optional)
matplotlib>=3.7.0       # Plotting (optional)
logging                 # Built-in logging
json                    # Built-in JSON handling
dataclasses            # Built-in data structures
typing                 # Built-in type hints
```

### **Installation**
```bash
# Install Cantera (requires conda)
conda install -c cantera cantera

# Or using pip (may require additional setup)
pip install cantera

# Install other dependencies
pip install numpy scipy pandas matplotlib
```

## 🧪 Testing & Validation

### **Unit Tests**
```python
def test_parameter_validation():
    """Test input parameter validation"""
    assert validate_parameter('T_C', 825.0) == True
    assert validate_parameter('T_C', 1200.0) == False

def test_thermodynamic_setup():
    """Test Cantera gas object initialization"""
    params = SimulationInput()
    gas = setup_cantera_gas(params)
    assert gas.T == 825.0 + 273.15
    assert gas.P == 1.0 * 101325

def test_conversion_calculations():
    """Test performance metric calculations"""
    inlet = {'CH4': 0.7, 'CO2': 0.3}
    outlet = {'CH4': 0.126, 'CO2': 0.063, 'H2': 0.35, 'CO': 0.33}
    metrics = calculate_performance_metrics(inlet, outlet)
    assert 0.8 < metrics['conversion_ch4'] < 0.85
```

### **Integration Tests**
```python
def test_full_simulation_run():
    """Test complete simulation execution"""
    input_params = {
        "T_C": 825.0, "P_bar": 1.0, "fCH4_mlpm": 700.0,
        "fCO2_mlpm": 300.0, "fN2_mlpm": 0.0, "GHSV": 10000.0
    }
    
    results = run_simulation(input_params)
    
    assert 0.7 < results['conversion_ch4'] < 0.9
    assert 0.6 < results['conversion_co2'] < 0.85
    assert results['runtime'] > 0
```

### **Validation Against Literature**
```python
# Benchmark conditions from literature
BENCHMARK_CONDITIONS = {
    'Kim_et_al_2018': {
        'T_C': 800, 'P_bar': 1.0, 'CH4_CO2_ratio': 1.0,
        'expected_conv_ch4': 0.78, 'expected_conv_co2': 0.85
    },
    'Zhang_et_al_2019': {
        'T_C': 850, 'P_bar': 1.5, 'CH4_CO2_ratio': 1.5,  
        'expected_conv_ch4': 0.85, 'expected_conv_co2': 0.75
    }
}
```

## 🔬 Scientific Background

### **Dry Reforming Chemistry**
The dry reforming of methane (DRM) is an endothermic catalytic process:

**Primary Reaction:**
```
CH4 + CO2 ⇌ 2CO + 2H2  (ΔH298 = +247 kJ/mol)
```

**Side Reactions:**
```
CH4 ⇌ C + 2H2                    (Methane decomposition)
2CO ⇌ C + CO2                    (Boudouard reaction)  
CO + H2 ⇌ C + H2O                (Carbon formation)
CH4 + H2O ⇌ CO + 3H2             (Steam reforming)
```

### **Thermodynamic Considerations**
- **Equilibrium Limitation**: High temperature favors product formation
- **Pressure Effect**: Low pressure favors syngas production  
- **Carbon Formation**: Side reactions can lead to catalyst deactivation
- **Heat Integration**: Endothermic nature requires external heating

### **Kinetic Modeling Approach**
```python
# Global power-law rate expression
r_DRM = k * (P_CH4^α_CH4) * (P_CO2^α_CO2) * (P_CO^α_CO) * (P_H2^α_H2)

# Temperature dependence
k = A * exp(-E_a / (R*T))
```

## 🔄 Process Integration

### **Heat Integration**
```python
def calculate_heat_duty(inlet_enthalpy, outlet_enthalpy, flowrate):
    """Calculate reactor heat duty"""
    return (outlet_enthalpy - inlet_enthalpy) * flowrate  # [kW]

def design_heat_exchanger(heat_duty, delta_T_lm):
    """Size heat exchanger for process integration"""
    U = 500  # Heat transfer coefficient [W/m²/K]
    area = heat_duty / (U * delta_T_lm)
    return area
```

### **Catalyst Considerations**
- **Active Phase**: Ni, Co, or noble metals (Pt, Pd, Rh)
- **Support**: Al2O3, SiO2, ZrO2 for thermal stability
- **Deactivation**: Carbon deposition, sintering, sulfur poisoning
- **Regeneration**: Oxidative or steam-based carbon removal

## 🚀 Performance Optimization

### **Numerical Efficiency**
```python
# Optimized ODE solver settings
solver_options = {
    'method': 'LSODA',      # Automatic stiff/non-stiff detection
    'rtol': 1e-8,           # Relative tolerance
    'atol': 1e-10,          # Absolute tolerance
    'max_step': 0.01        # Maximum step size
}

# Vectorized calculations
def vectorized_reaction_rates(concentrations):
    """Calculate all reaction rates simultaneously"""
    return np.array([
        rate_drm(concentrations),
        rate_decomposition(concentrations),
        rate_boudouard(concentrations)
    ])
```

### **Memory Management**
```python
# Efficient data structures
@dataclass(slots=True)  # Reduce memory overhead
class ReactorState:
    concentrations: np.ndarray
    temperature: float
    pressure: float
    position: float
```

## 🔮 Future Enhancements

### **Advanced Kinetic Models**
1. **Detailed Mechanisms**: Microkinetic modeling with elementary steps
2. **Catalyst Deactivation**: Time-dependent activity models
3. **Mass Transfer**: Internal and external diffusion limitations
4. **Non-isothermal**: Coupled heat and mass transfer

### **Multi-scale Modeling**
1. **Particle Scale**: Pore diffusion and reaction
2. **Reactor Scale**: Axial and radial gradients  
3. **Process Scale**: Heat integration and optimization
4. **Plant Scale**: Dynamic operation and control

### **Optimization Capabilities**
```python
def optimize_operating_conditions(objective='conversion'):
    """Optimize reactor conditions for maximum performance"""
    from scipy.optimize import minimize
    
    def objective_function(params):
        T_C, P_bar, GHSV = params
        results = run_simulation({'T_C': T_C, 'P_bar': P_bar, 'GHSV': GHSV})
        return -results['conversion_ch4']  # Minimize negative conversion
    
    bounds = [(700, 900), (0.5, 5.0), (5000, 20000)]
    result = minimize(objective_function, x0=[825, 1.0, 10000], bounds=bounds)
    return result
```

### **Machine Learning Integration**
1. **Surrogate Models**: Fast approximation of detailed kinetics
2. **Parameter Estimation**: Data-driven kinetic parameter fitting
3. **Process Optimization**: AI-driven operating condition optimization
4. **Predictive Maintenance**: Catalyst deactivation prediction

## 🐛 Common Issues & Solutions

### **Convergence Issues**
```python
# Problem: ODE solver fails to converge
# Solution: Adjust solver tolerances and step sizes
solver_options = {
    'rtol': 1e-6,          # Relaxed tolerance
    'atol': 1e-8,          # Relaxed tolerance  
    'max_step': 0.001      # Smaller steps
}

# Problem: Negative concentrations
# Solution: Add concentration bounds
def concentration_bounds(y):
    return np.maximum(y, 1e-12)  # Prevent negative values
```

### **Thermodynamic Issues**
```python
# Problem: Cantera gas object initialization fails
# Solution: Check mechanism file and species names
try:
    gas = ct.Solution('gri30.yaml')
except Exception as e:
    print(f"Mechanism loading failed: {e}")
    gas = ct.Solution('h2o2.yaml')  # Fallback mechanism

# Problem: Invalid thermodynamic state
# Solution: Validate temperature and pressure ranges
if T < 300 or T > 3000:
    raise ThermodynamicsError(f"Temperature {T} K outside valid range")
```

### **Performance Issues**
```python
# Problem: Slow computation for large reactors
# Solution: Adaptive mesh refinement
def adaptive_mesh(reactor_length, tolerance):
    """Generate adaptive mesh based on gradient"""
    initial_points = np.linspace(0, reactor_length, 100)
    # Add points where gradients are high
    return refined_points

# Problem: Memory usage for long simulations
# Solution: Output streaming and data compression
def stream_output(results, filename):
    """Stream results to file instead of memory"""
    with open(filename, 'w') as f:
        json.dump(results, f, indent=2)
```

---

**Related Documentation:**
- [Backend API Integration](../backend/README.md)
- [Frontend Simulation Console](../frontend/README.md)
- [Main Project Overview](../README.md)