#!/usr/bin/env python3
"""
JSON-Based DWSIM Simulation Script

This script reads simulation parameters from a JSON file, calls the DWSIM API,
waits for the response, and outputs all stream details.
"""

import requests
import json
import sys
import time
import os
from datetime import datetime

# API Configuration
API_BASE_URL = "http://65.0.119.135:5000"

def load_simulation_config(json_file):
    """Load simulation configuration from JSON file"""
    try:
        with open(json_file, 'r') as f:
            config = json.load(f)
        print(f"✓ Loaded simulation config from {json_file}")
        return config
    except FileNotFoundError:
        print(f"❌ JSON file '{json_file}' not found")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON format: {e}")
        return None
    except Exception as e:
        print(f"❌ Error loading JSON file: {e}")
        return None

def run_simulation_from_json(config):
    """Run DWSIM simulation using JSON configuration"""
    try:
        print("\n" + "="*60)
        print("RUNNING SIMULATION FROM JSON CONFIG")
        print("="*60)
        
        # Add default parameters if not specified
        payload = {
            "inlet_modifications": config.get("inlet_modifications", {}),
            "output_streams": config.get("output_streams", [1, 2, 6, 7]),
            "include_all_streams": config.get("include_all_streams", True)
        }
        
        print("Simulation payload:")
        print(json.dumps(payload, indent=2))
        print("\nCalling DWSIM API...")
        
        # Call the API
        response = requests.post(f"{API_BASE_URL}/api/simulation/run", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            
            print("✓ Simulation completed successfully")
            print(f"  Success: {data.get('success')}")
            print(f"  Timestamp: {data.get('timestamp')}")
            print(f"  Flowsheet: {data.get('flowsheet_name')}")
            
            # Show modifications applied
            modifications = data.get('modifications_applied', [])
            if modifications:
                print("\nModifications Applied:")
                for mod in modifications:
                    print(f"  - {mod}")
            
            # Display all streams data
            all_streams = data.get('all_streams', {})
            if all_streams:
                print("\n" + "="*60)
                print("ALL STREAMS DATA")
                print("="*60)
                
                for stream_key, stream_data in all_streams.items():
                    if isinstance(stream_data, dict) and 'error' not in stream_data:
                        stream_num = stream_data.get('stream_number')
                        custom_name = stream_data.get('custom_name', 'Unknown')
                        temp_c = stream_data.get('temperature_C', 0)
                        pressure_bar = stream_data.get('pressure_bar', 0)
                        mass_flow = stream_data.get('mass_flow_mg_s', 0)
                        active = "ACTIVE" if stream_data.get('active') else "INACTIVE"
                        
                        print(f"\n{stream_key.upper()} - {custom_name} (Stream {stream_num}) [{active}]")
                        print(f"  Temperature: {temp_c:.2f} °C ({temp_c + 273.15:.2f} K)")
                        print(f"  Pressure: {pressure_bar:.4f} bar ({pressure_bar * 100000:.2f} Pa)")
                        print(f"  Mass Flow: {mass_flow:.4f} mg/s ({mass_flow / 1000000:.8f} kg/s)")
                        
                        # Additional properties
                        if 'enthalpy_kJ_kg' in stream_data:
                            print(f"  Enthalpy: {stream_data['enthalpy_kJ_kg']:.2f} kJ/kg")
                        if 'density_kg_m3' in stream_data:
                            density = stream_data['density_kg_m3']
                            density_str = "infinite" if density == "infinite" else f"{density:.4f}"
                            print(f"  Density: {density_str} kg/m³")
                        if 'molecular_weight_kg_mol' in stream_data:
                            print(f"  Molecular Weight: {stream_data['molecular_weight_kg_mol']:.4f} kg/mol")
                    else:
                        print(f"\n{stream_key.upper()} - ERROR")
                        print(f"  Error: {stream_data.get('error', 'Unknown error')}")
            
            # Display summary
            summary = data.get('summary', {})
            if summary:
                print("\n" + "="*60)
                print("SIMULATION SUMMARY")
                print("="*60)
                print(f"Total Streams: {summary.get('total_streams', 0)}")
                print(f"Active Streams: {summary.get('active_streams', 0)}")
                active_names = summary.get('active_stream_names', [])
                if active_names:
                    print(f"Active Stream IDs: {', '.join(active_names)}")
            
            return data
            
        else:
            print(f"❌ Simulation failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('error', 'Unknown error')}")
                if 'traceback' in error_data:
                    print(f"Traceback: {error_data['traceback']}")
            except:
                print(f"Raw response: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to DWSIM API server")
        print("Please ensure the API server is running at:", API_BASE_URL)
        return None
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def save_results(data, output_file):
    """Save simulation results to JSON file"""
    try:
        with open(output_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        print(f"✓ Results saved to {output_file}")
    except Exception as e:
        print(f"❌ Failed to save results: {e}")

def save_to_database(data, output_file):
    """Save simulation results to SQLite database for querying"""
    import sqlite3
    
    db_path = "/app/backend/simulation_results.db"
    
    try:
        # Create database and table if they don't exist
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS simulation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                output_file TEXT,
                flowsheet_name TEXT,
                total_streams INTEGER,
                active_streams INTEGER,
                success BOOLEAN,
                raw_data TEXT
            )
        ''')
        
        # Extract key information
        timestamp = data.get('timestamp', datetime.now().isoformat())
        flowsheet_name = data.get('flowsheet_name', 'Unknown')
        summary = data.get('summary', {})
        total_streams = summary.get('total_streams', 0)
        active_streams = summary.get('active_streams', 0)
        success = data.get('success', False)
        raw_data = json.dumps(data, default=str)
        
        # Insert the record
        cursor.execute('''
            INSERT INTO simulation_results 
            (timestamp, output_file, flowsheet_name, total_streams, active_streams, success, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (timestamp, output_file, flowsheet_name, total_streams, active_streams, success, raw_data))
        
        conn.commit()
        conn.close()
        
        print(f"✓ Results also saved to database: {db_path}")
        
    except Exception as e:
        raise Exception(f"Database save failed: {e}")

def save_to_database(data, output_file):
    """Save simulation results to SQLite database for querying"""
    import sqlite3
    
    db_path = "/app/backend/simulation_results.db"
    
    try:
        # Create database and table if they don't exist
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS simulation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                output_file TEXT,
                flowsheet_name TEXT,
                total_streams INTEGER,
                active_streams INTEGER,
                success BOOLEAN,
                raw_data TEXT
            )
        ''')
        
        # Extract key information
        timestamp = data.get('timestamp', datetime.now().isoformat())
        flowsheet_name = data.get('flowsheet_name', 'Unknown')
        summary = data.get('summary', {})
        total_streams = summary.get('total_streams', 0)
        active_streams = summary.get('active_streams', 0)
        success = data.get('success', False)
        raw_data = json.dumps(data, default=str)
        
        # Insert the record
        cursor.execute('''
            INSERT INTO simulation_results 
            (timestamp, output_file, flowsheet_name, total_streams, active_streams, success, raw_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (timestamp, output_file, flowsheet_name, total_streams, active_streams, success, raw_data))
        
        conn.commit()
        conn.close()
        
        print(f"✓ Results also saved to database: {db_path}")
        
    except Exception as e:
        raise Exception(f"Database save failed: {e}")

def check_api_health():
    """Check if API server is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/health")
        if response.status_code == 200:
            data = response.json()
            print("✓ DWSIM API server is healthy")
            print(f"  Status: {data.get('status')}")
            print(f"  Flowsheet: {data.get('flowsheet')}")
            return True
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to DWSIM API server")
        print(f"Please ensure the server is running at: {API_BASE_URL}")
        return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def create_sample_config():
    """Create a sample JSON configuration file"""
    sample_config = {
        "description": "Sample DWSIM simulation configuration",
        "inlet_modifications": {
            "stream_3": {
                "temperature_C": 35.0,
                "pressure_bar": 1.5,
                "mass_flow_mg_s": 35.0
            },
            "stream_4": {
                "temperature_C": 30.0,
                "pressure_bar": 1.2,
                "mass_flow_mg_s": 15.0
            }
        },
        "output_streams": [1, 2, 6, 7],
        "include_all_streams": True
    }
    
    filename = "sample_simulation_config.json"
    try:
        with open(filename, 'w') as f:
            json.dump(sample_config, f, indent=2)
        print(f"✓ Sample configuration created: {filename}")
        return filename
    except Exception as e:
        print(f"❌ Failed to create sample config: {e}")
        return None

def main():
    """Main function"""
    print("DWSIM JSON-Based Simulation Script")
    print("=" * 50)
    
    # Check command line arguments
    if len(sys.argv) < 2:
        print("Usage: python simulation_script.py <config.json> [output.json]")
        print("\nCreating sample configuration file...")
        sample_file = create_sample_config()
        if sample_file:
            print(f"\nEdit '{sample_file}' with your simulation parameters, then run:")
            print(f"python {sys.argv[0]} {sample_file}")
        return
    
    json_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else f"simulation_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    print(f"Input file: {json_file}")
    print(f"Output file: {output_file}")
    print()
    
    # Check API health
    if not check_api_health():
        return
    
    # Load configuration
    config = load_simulation_config(json_file)
    if not config:
        return
    
    # Run simulation
    results = run_simulation_from_json(config)
    
    # Save results
    if results:
        save_results(results, output_file)
        print("\n✓ Simulation completed successfully!")
        print(f"Results saved to: {output_file}")
        
        # Save to structured database
        try:
            from database import db
            simulation_id = db.save_simulation_result(results, json_file, output_file)
            print(f"✓ Simulation saved to database with ID: {simulation_id}")
        except Exception as e:
            print(f"⚠️ Could not save to database: {e}")
    else:
        print("\n❌ Simulation failed!")

if __name__ == "__main__":
    main()