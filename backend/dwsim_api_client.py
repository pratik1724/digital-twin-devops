#!/usr/bin/env python3
"""
DWSIM API Client Examples and Documentation

This script demonstrates how to use the DWSIM REST API to:
1. Run simulations with modified inlet conditions
2. Get stream data for frontend display
3. Run parametric studies
4. Monitor process streams

Before running: Start the API server with: python dwsim_api_server.py
"""

import requests
import json
import sys
import argparse
from datetime import datetime

# API Base URL - can be overridden via command line
BASE_URL = "http://localhost:5000/api"

def set_base_url(url):
    """Set the base URL for API calls"""
    global BASE_URL
    if url.endswith('/api'):
        BASE_URL = url
    else:
        BASE_URL = url.rstrip('/') + '/api'
    print(f"🔗 API Base URL set to: {BASE_URL}")

def health_check():
    """Check if the API server is running"""
    print(f"🔍 Starting health check...")
    print(f"🌐 Connecting to: {BASE_URL}/health")
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"📡 Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ API Server is healthy")
            print(f"  Flowsheet: {data.get('flowsheet')}")
            print(f"  Timestamp: {data.get('timestamp')}")
            return True
        else:
            print(f"❌ API Server health check failed: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            return False
    except requests.exceptions.Timeout:
        print(f"❌ Connection timed out after 5 seconds")
        return False
    except requests.exceptions.ConnectionError as e:
        print(f"❌ Cannot connect to API server: Connection refused")
        print(f"   Target: {BASE_URL}/health")
        return False
    except Exception as e:
        print(f"❌ Cannot connect to API server: {e}")
        return False

def example_1_basic_simulation():
    """
    Example 1: Run simulation with default parameters
    """
    print("\n" + "="*60)
    print("EXAMPLE 1: Basic Simulation (Default Parameters)")
    print("="*60)
    
    payload = {
        "output_streams": [6, 7],
        "include_all_streams": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/simulation/run", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Simulation successful")
            print(f"  Modifications: {len(data.get('modifications_applied', []))}")
            
            # Display output streams
            for stream_name, stream_data in data.get('output_streams', {}).items():
                if 'error' not in stream_data:
                    flow = stream_data.get('mass_flow_mg_s', 0)
                    temp = stream_data.get('temperature_C', 0)
                    pressure = stream_data.get('pressure_bar', 0)
                    active = "ACTIVE" if stream_data.get('active') else "INACTIVE"
                    print(f"  {stream_name}: {flow:.2f} mg/s, {temp:.1f}°C, {pressure:.2f} bar [{active}]")
            
            return data
        else:
            print(f"❌ Simulation failed: {response.status_code}")
            print(response.text)
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def example_2_modified_inlets():
    """
    Example 2: Run simulation with modified inlet conditions
    """
    print("\n" + "="*60)
    print("EXAMPLE 2: Simulation with Modified Inlets")
    print("="*60)
    
    # Payload to modify inlet streams
    payload = {
        "inlet_modifications": {
            "stream_1": {
                "temperature_C": 950,      # Increase reactor temperature
                "pressure_bar": 1.2        # Increase pressure slightly
            },
            "stream_3": {
                "temperature_C": 35,       # Preheat CO2 feed
                "pressure_bar": 1.5,       # Increase CO2 pressure
                "mass_flow_mg_s": 40       # Increase CO2 flow rate
            },
            "stream_4": {
                "temperature_C": 30,       # Preheat CH4 feed
                "mass_flow_mg_s": 15       # Increase CH4 flow rate
            }
        },
        "output_streams": [6, 7],
        "include_all_streams": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/simulation/run", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Simulation with modifications successful")
            
            print(f"\nModifications applied:")
            for mod in data.get('modifications_applied', []):
                print(f"  - {mod}")
            
            print(f"\nResults:")
            for stream_name, stream_data in data.get('output_streams', {}).items():
                if 'error' not in stream_data:
                    flow = stream_data.get('mass_flow_mg_s', 0)
                    temp = stream_data.get('temperature_C', 0)
                    pressure = stream_data.get('pressure_bar', 0)
                    active = "ACTIVE" if stream_data.get('active') else "INACTIVE"
                    print(f"  {stream_name}: {flow:.2f} mg/s, {temp:.1f}°C, {pressure:.2f} bar [{active}]")
            
            return data
        else:
            print(f"❌ Simulation failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def example_3_parametric_study():
    """
    Example 3: Run parametric study with multiple cases
    """
    print("\n" + "="*60)
    print("EXAMPLE 3: Parametric Study")
    print("="*60)
    
    payload = {
        "cases": [
            {
                "name": "Baseline",
                "modifications": {}
            },
            {
                "name": "High Temperature",
                "modifications": {
                    "stream_1": {"temperature_C": 950}
                }
            },
            {
                "name": "High Pressure Operation",
                "modifications": {
                    "stream_3": {"pressure_bar": 2.0},
                    "stream_4": {"pressure_bar": 2.0}
                }
            },
            {
                "name": "High Flow Rates",
                "modifications": {
                    "stream_3": {"mass_flow_mg_s": 50},
                    "stream_4": {"mass_flow_mg_s": 20}
                }
            },
            {
                "name": "Optimized Conditions",
                "modifications": {
                    "stream_1": {"temperature_C": 925},
                    "stream_3": {"temperature_C": 40, "pressure_bar": 1.8, "mass_flow_mg_s": 45},
                    "stream_4": {"temperature_C": 35, "pressure_bar": 1.8, "mass_flow_mg_s": 18}
                }
            }
        ],
        "output_streams": [6, 7]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/simulation/parametric", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Parametric study completed")
            print(f"  Total cases: {data.get('total_cases')}")
            
            print(f"\nResults Summary:")
            for case in data.get('parametric_results', []):
                case_name = case.get('case_name')
                print(f"\n  {case_name}:")
                
                for stream_name, stream_data in case.get('output_streams', {}).items():
                    if 'error' not in stream_data:
                        flow = stream_data.get('mass_flow_mg_s', 0)
                        temp = stream_data.get('temperature_C', 0)
                        print(f"    {stream_name}: {flow:.2f} mg/s, {temp:.1f}°C")
            
            return data
        else:
            print(f"❌ Parametric study failed: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def example_4_get_all_streams():
    """
    Example 4: Get data from all streams for monitoring
    """
    print("\n" + "="*60)
    print("EXAMPLE 4: Get All Streams Data")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/streams/all")
        
        if response.status_code == 200:
            data = response.json()
            streams = data.get('streams', {})
            
            print(f"✓ Retrieved data from {len(streams)} streams")
            print(f"\nStream Details:")
            
            for stream_name, stream_data in streams.items():
                if isinstance(stream_data, dict) and 'error' not in stream_data:
                    stream_num = stream_data.get('stream_number')
                    flow = stream_data.get('mass_flow_mg_s', 0)
                    temp = stream_data.get('temperature_C', 0)
                    pressure = stream_data.get('pressure_bar', 0)
                    active = "ACTIVE" if stream_data.get('active') else "INACTIVE"
                    
                    print(f"  Stream {stream_num}: {flow:.2f} mg/s, {temp:.1f}°C, {pressure:.2f} bar [{active}]")
            
            return data
        else:
            print(f"❌ Failed to get streams data: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def example_5_get_specific_stream():
    """
    Example 5: Get data from a specific stream
    """
    print("\n" + "="*60)
    print("EXAMPLE 5: Get Specific Stream Data")
    print("="*60)
    
    # Get stream 6 data (target output stream)
    stream_number = 6
    
    try:
        response = requests.get(f"{BASE_URL}/streams/{stream_number}")
        
        if response.status_code == 200:
            data = response.json()
            stream_data = data.get('stream')
            
            print(f"✓ Retrieved data for stream {stream_number}")
            
            if 'error' not in stream_data:
                print(f"\nStream {stream_number} Details:")
                print(f"  Temperature: {stream_data.get('temperature_C', 0):.2f} °C ({stream_data.get('temperature_K', 0):.2f} K)")
                print(f"  Pressure: {stream_data.get('pressure_bar', 0):.2f} bar ({stream_data.get('pressure_Pa', 0):.0f} Pa)")
                print(f"  Mass Flow: {stream_data.get('mass_flow_mg_s', 0):.2f} mg/s ({stream_data.get('mass_flow_kg_s', 0):.6f} kg/s)")
                print(f"  Molar Flow: {stream_data.get('molar_flow_mol_s', 0):.6f} mol/s")
                print(f"  Density: {stream_data.get('density_kg_m3', 'N/A')} kg/m³")
                print(f"  Enthalpy: {stream_data.get('enthalpy_kJ_kg', 0):.2f} kJ/kg")
                print(f"  Active: {'Yes' if stream_data.get('active') else 'No'}")
            
            return data
        else:
            print(f"❌ Failed to get stream {stream_number} data: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def example_6_streams_info():
    """
    Example 6: Get information about available streams
    """
    print("\n" + "="*60)
    print("EXAMPLE 6: Get Streams Information")
    print("="*60)
    
    try:
        response = requests.get(f"{BASE_URL}/streams/info")
        
        if response.status_code == 200:
            data = response.json()
            streams_info = data.get('streams_info', {})
            
            print(f"✓ Retrieved information for {len(streams_info)} streams")
            print(f"\nStream Information:")
            
            for stream_name, info in streams_info.items():
                stream_num = info.get('stream_number')
                description = info.get('description')
                active = "ACTIVE" if info.get('active') else "INACTIVE"
                temp = info.get('current_temperature_C', 0)
                flow = info.get('current_mass_flow_mg_s', 0)
                
                print(f"\n  Stream {stream_num} [{active}]:")
                print(f"    Description: {description}")
                print(f"    Current: {flow:.2f} mg/s, {temp:.1f}°C")
            
            return data
        else:
            print(f"❌ Failed to get streams info: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def save_results_to_file(results, filename):
    """
    Save API results to JSON file for further analysis
    """
    try:
        with open(filename, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f"✓ Results saved to {filename}")
        return True
    except Exception as e:
        print(f"❌ Failed to save results: {e}")
        return False

def frontend_data_format_example(api_response):
    """
    Example of how to format API response data for frontend display
    """
    print("\n" + "="*60)
    print("FRONTEND DATA FORMAT EXAMPLE")
    print("="*60)
    
    if not api_response or not api_response.get('success'):
        print("❌ No valid API response to format")
        return None
    
    # Format for dashboard display
    dashboard_data = {
        "simulation_status": "completed" if api_response.get('simulation_completed') else "failed",
        "timestamp": api_response.get('timestamp'),
        "process_streams": {},
        "summary": {
            "active_streams": 0,
            "total_flow_mg_s": 0,
            "avg_temperature_C": 0
        }
    }
    
    # Process output streams for frontend
    output_streams = api_response.get('output_streams', {})
    temps = []
    total_flow = 0
    
    for stream_name, stream_data in output_streams.items():
        if isinstance(stream_data, dict) and 'error' not in stream_data:
            stream_num = stream_data.get('stream_number', stream_name.split('_')[1])
            
            # Format for frontend display
            formatted_stream = {
                "id": f"stream_{stream_num}",
                "name": f"Stream {stream_num}",
                "active": stream_data.get('active', False),
                "measurements": {
                    "temperature": {
                        "value": round(stream_data.get('temperature_C', 0), 1),
                        "unit": "°C",
                        "status": "normal"  # Could add logic for alarm conditions
                    },
                    "pressure": {
                        "value": round(stream_data.get('pressure_bar', 0), 2),
                        "unit": "bar",
                        "status": "normal"
                    },
                    "mass_flow": {
                        "value": round(stream_data.get('mass_flow_mg_s', 0), 2),
                        "unit": "mg/s",
                        "status": "normal"
                    },
                    "enthalpy": {
                        "value": round(stream_data.get('enthalpy_kJ_kg', 0), 1),
                        "unit": "kJ/kg",
                        "status": "normal"
                    }
                },
                "raw_data": stream_data  # Full data for detailed views
            }
            
            dashboard_data["process_streams"][f"stream_{stream_num}"] = formatted_stream
            
            # Calculate summary statistics
            if stream_data.get('active'):
                dashboard_data["summary"]["active_streams"] += 1
                total_flow += stream_data.get('mass_flow_mg_s', 0)
                temps.append(stream_data.get('temperature_C', 0))
    
    # Complete summary
    dashboard_data["summary"]["total_flow_mg_s"] = round(total_flow, 2)
    dashboard_data["summary"]["avg_temperature_C"] = round(sum(temps) / len(temps), 1) if temps else 0
    
    print("Frontend-formatted data structure:")
    print(json.dumps(dashboard_data, indent=2))
    
    return dashboard_data

def main():
    """
    Main function to run all examples
    """
    print("DWSIM API Client Examples")
    print("=" * 60)
    print("This script demonstrates how to use the DWSIM REST API")
    print("Make sure the API server is running: python dwsim_api_server.py")
    print()
    
    # Check API health
    if not health_check():
        print("Please start the API server first!")
        return
    
    # Run examples
    print("\nRunning API examples...")
    
    # Example 1: Basic simulation
    result1 = example_1_basic_simulation()
    
    # Example 2: Modified inlets
    result2 = example_2_modified_inlets()
    
    # Example 3: Parametric study
    result3 = example_3_parametric_study()
    
    # Example 4: All streams
    result4 = example_4_get_all_streams()
    
    # Example 5: Specific stream
    result5 = example_5_get_specific_stream()
    
    # Example 6: Streams info
    result6 = example_6_streams_info()
    
    # Save results
    if result2:  # Save the modified inlets example
        save_results_to_file(result2, "api_simulation_results.json")
    
    # Show frontend formatting example
    if result1:
        frontend_data_format_example(result1)
    
    print("\n" + "="*60)
    print("EXAMPLES COMPLETED")
    print("="*60)
    print("The API is ready for frontend integration!")
    print("Key endpoints:")
    print("  POST /api/simulation/run - Main simulation endpoint")
    print("  GET  /api/streams/all - Get all streams for monitoring")
    print("  POST /api/simulation/parametric - Run parameter studies")

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='DWSIM API Client Examples')
    parser.add_argument('--health', action='store_true', help='Only run health check')
    parser.add_argument('--api-url', default='http://localhost:5000', help='DWSIM API base URL (default: http://localhost:5000)')
    args = parser.parse_args()
    
    # Set the API URL
    set_base_url(args.api_url)
    print(f"Using API URL: {BASE_URL}")
    
    if args.health:
        # Only run health check for API testing
        success = health_check()
        sys.exit(0 if success else 1)
    else:
        # Run all examples
        main()