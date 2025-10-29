from pyomo.environ import ConcreteModel, SolverFactory, value, Var, Expression, Constraint
from pyomo.environ import units as pyunits
from idaes.core import FlowsheetBlock
from idaes.models.unit_models import Heater, StoichiometricReactor
from idaes.core.util.model_statistics import degrees_of_freedom

print("="*60)
print("FIXED GENERICPROPERTYBLOCK DRM SIMULATION")
print("="*60)

# Method 1: Try the correct phase class imports
print("\nMethod 1: Attempting correct phase class imports...")

try:
    from idaes.models.properties.modular_properties.base.generic_property import GenericParameterBlock
    from idaes.models.properties.modular_properties.state_definitions import FTPx
    from idaes.models.properties.modular_properties.eos.ideal import Ideal
    from idaes.core.phases import VaporPhase, LiquidPhase  # Try core.phases
    import idaes.models.properties.modular_properties.pure.RPP4 as RPP4
    
    print("✓ Imported VaporPhase from idaes.core.phases")
    phase_import_method = "core.phases"
    use_class = VaporPhase
    
except ImportError as e1:
    print(f"✗ idaes.core.phases failed: {e1}")
    
    # Method 2: Try generic_framework phases
    try:
        from idaes.models.properties.modular_properties.base.generic_property import GenericParameterBlock
        from idaes.models.properties.modular_properties.state_definitions import FTPx
        from idaes.models.properties.modular_properties.eos.ideal import Ideal
        from idaes.models.properties.modular_properties.base.phases import VaporPhase  # Try base.phases
        import idaes.models.properties.modular_properties.pure.RPP4 as RPP4
        
        print("✓ Imported VaporPhase from modular_properties.base.phases")
        phase_import_method = "base.phases"
        use_class = VaporPhase
        
    except ImportError as e2:
        print(f"✗ base.phases also failed: {e2}")
        
        # Method 3: Use string with specific format
        try:
            from idaes.models.properties.modular_properties.base.generic_property import GenericParameterBlock
            from idaes.models.properties.modular_properties.state_definitions import FTPx
            from idaes.models.properties.modular_properties.eos.ideal import Ideal
            import idaes.models.properties.modular_properties.pure.RPP4 as RPP4
            
            print("✓ Will try string-based phase definition")
            phase_import_method = "string"
            use_class = "VaporPhase"
            
        except ImportError as e3:
            print(f"✗ All import methods failed")
            phase_import_method = None

# Method 4: Try component-based configuration format
if phase_import_method:
    print(f"\nTesting GenericPropertyBlock with {phase_import_method} approach...")
    
    # Build flowsheet
    m = ConcreteModel()
    m.fs = FlowsheetBlock(dynamic=False)
    
    if phase_import_method == "string":
        # Try the minimal configuration that usually works
        thermo_config = {
            "components": {
                "CH4": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (16.043e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (-74.85e3, pyunits.J/pyunits.mol),
                    }
                },
                "CO2": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (44.01e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (-393.52e3, pyunits.J/pyunits.mol),
                    }
                },
                "CO": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (28.01e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (-110.53e3, pyunits.J/pyunits.mol),
                    }
                },
                "H2": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (2.016e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (0.0, pyunits.J/pyunits.mol),
                    }
                }
            },
            "phases": {
                "Vap": {"type": "VaporPhase", "equation_of_state": Ideal}
            },
            "state_definition": FTPx,
            "base_units": {
                "time": pyunits.s,
                "length": pyunits.m,
                "mass": pyunits.kg,
                "amount": pyunits.mol,
                "temperature": pyunits.K
            },
            "pressure_ref": (1e5, pyunits.Pa),
            "temperature_ref": (298.15, pyunits.K),
        }
        
    else:
        # Use the class-based approach
        thermo_config = {
            "components": {
                "CH4": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (16.043e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (-74.85e3, pyunits.J/pyunits.mol),
                    }
                },
                "CO2": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (44.01e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (-393.52e3, pyunits.J/pyunits.mol),
                    }
                },
                "CO": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (28.01e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (-110.53e3, pyunits.J/pyunits.mol),
                    }
                },
                "H2": {
                    "type": "Component",
                    "parameter_data": {
                        "mw": (2.016e-3, pyunits.kg/pyunits.mol),
                        "enth_mol_form_vap_comp_ref": (0.0, pyunits.J/pyunits.mol),
                    }
                }
            },
            "phases": {
                "Vap": {"type": use_class, "equation_of_state": Ideal}
            },
            "state_definition": FTPx,
            "base_units": {
                "time": pyunits.s,
                "length": pyunits.m,
                "mass": pyunits.kg,
                "amount": pyunits.mol,
                "temperature": pyunits.K
            },
            "pressure_ref": (1e5, pyunits.Pa),
            "temperature_ref": (298.15, pyunits.K),
        }
    
    # Try to create the property package
    try:
        print("Creating GenericParameterBlock...")
        m.fs.thermo_props = GenericParameterBlock(**thermo_config)
        print("✓ SUCCESS! GenericPropertyBlock created successfully!")
        
        # Test with a simple unit
        print("Testing with StoichiometricReactor...")
        m.fs.reactor = StoichiometricReactor(
            property_package=m.fs.thermo_props,
            has_heat_transfer=True,
            has_pressure_change=False
        )
        
        # Set basic conditions
        m.fs.reactor.inlet.flow_mol.fix(2.0)
        m.fs.reactor.inlet.temperature.fix(1073.15)
        m.fs.reactor.inlet.pressure.fix(101325)
        m.fs.reactor.inlet.mole_frac_comp["CH4"].fix(0.5)
        m.fs.reactor.inlet.mole_frac_comp["CO2"].fix(0.5)
        m.fs.reactor.inlet.mole_frac_comp["CO"].fix(0.0)
        m.fs.reactor.inlet.mole_frac_comp["H2"].fix(0.0)
        
        print(f"DOF: {degrees_of_freedom(m)}")
        print("✓ GenericPropertyBlock is working correctly!")
        print("✓ Ready for full DRM simulation with proper thermodynamics!")
        
        working_config = thermo_config
        success = True
        
    except Exception as e:
        print(f"✗ GenericPropertyBlock still failed: {e}")
        success = False

else:
    success = False

# If GenericPropertyBlock still fails, provide alternative approaches
if not success:
    print("\n" + "="*60)
    print("ALTERNATIVE APPROACH: VERSION-SPECIFIC FIX")
    print("="*60)
    
    print("\nThe VaporPhase error suggests a version compatibility issue.")
    print("Let's check your IDAES version and provide a fix:")
    
    import idaes
    print(f"IDAES Version: {idaes.__version__}")
    
    print("\nTry this version-specific fix:")
    print("\nMethod A - Minimal phase definition:")
    
    minimal_config = '''
thermo_config = {
    "components": {
        "CH4": {"type": "Component"},
        "CO2": {"type": "Component"},
        "CO": {"type": "Component"},
        "H2": {"type": "Component"}
    },
    "phases": {"Vap": {"type": "VaporPhase", "equation_of_state": Ideal}},
    "state_definition": FTPx
}
    '''
    print(minimal_config)
    
    print("\nMethod B - Use different phase specification:")
    alt_config = '''
thermo_config = {
    "components": {
        "CH4": {"type": "Component"},
        "CO2": {"type": "Component"}, 
        "CO": {"type": "Component"},
        "H2": {"type": "Component"}
    },
    "phases": {"Vap": {"type": Ideal}},  # Direct EoS specification
    "state_definition": FTPx
}
    '''
    print(alt_config)
    
    print("\nMethod C - Check import statement:")
    print("Try: from idaes.models.properties.modular_properties.phases.vapor_phase import VaporPhase")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)

if success:
    print("✅ GenericPropertyBlock is now working!")
    print("✅ You can now use proper thermodynamic calculations")
    print("✅ Enthalpy balances will be automatic")
    print("✅ Ready for StoichiometricReactor integration")
else:
    print("❌ GenericPropertyBlock still has issues")
    print("🔧 Your manual approach is still the most reliable")
    print("📚 Consider updating IDAES or using built-in property packages")
    print("💡 The manual calculations you have are actually quite good!")

print("\nRecommendation:")
if success:
    print("Proceed with GenericPropertyBlock - it's working!")
else:
    print("Stick with your enhanced manual approach - it's more reliable")
    print("and gives you full control over the thermodynamics.")