#!/usr/bin/env python3
"""
DWSIM Simulation Database Layer

Comprehensive database schema for storing simulation results with metadata,
streams, and modifications tracking.
"""

import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path

# Database location
DB_PATH = "/app/backend/dwsim_simulation_results.db"

class SimulationDatabase:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON")
        
        # Simulation Metadata Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS simulation_metadata (
                simulation_id TEXT PRIMARY KEY,
                flowsheet_name TEXT,
                simulation_status TEXT CHECK(simulation_status IN ('success', 'failure')),
                start_timestamp TEXT,
                end_timestamp TEXT,
                user_id TEXT DEFAULT 'system',
                config_file_name TEXT,
                output_file_name TEXT,
                raw_response TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Streams Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS streams (
                stream_id TEXT PRIMARY KEY,
                simulation_id TEXT,
                stream_number INTEGER,
                custom_name TEXT,
                display_name TEXT,
                graphic_tag TEXT,
                uuid_dwsim TEXT,
                temperature_K REAL,
                temperature_C REAL,
                pressure_Pa REAL,
                pressure_bar REAL,
                mass_flow_kg_s REAL,
                mass_flow_mg_s REAL,
                molar_flow_mol_s REAL,
                volumetric_flow_m3_s REAL,
                density_kg_m3 REAL,
                molecular_weight_kg_mol REAL,
                enthalpy_kJ_kg REAL,
                entropy_kJ_kg_K REAL,
                active BOOLEAN,
                timestamp TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (simulation_id) REFERENCES simulation_metadata (simulation_id)
            )
        ''')
        
        # Modifications Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS modifications (
                modification_id TEXT PRIMARY KEY,
                simulation_id TEXT,
                stream_number INTEGER,
                parameter_changed TEXT,
                old_value TEXT,
                new_value TEXT,
                applied_status TEXT DEFAULT 'applied',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (simulation_id) REFERENCES simulation_metadata (simulation_id)
            )
        ''')
        
        # Create indexes for better query performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_streams_simulation_id ON streams(simulation_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_streams_active ON streams(active)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_modifications_simulation_id ON modifications(simulation_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_simulation_timestamp ON simulation_metadata(end_timestamp)')
        
        conn.commit()
        conn.close()
        print(f"✓ Database initialized at: {self.db_path}")
    
    def save_simulation_result(self, simulation_data: Dict[str, Any], 
                             config_file: str = None, 
                             output_file: str = None) -> str:
        """Save complete simulation result to database"""
        simulation_id = str(uuid.uuid4())
        
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Extract metadata
            flowsheet_name = simulation_data.get('flowsheet_name', 'Unknown')
            simulation_status = 'success' if simulation_data.get('success', False) else 'failure'
            timestamp = simulation_data.get('timestamp', datetime.now(timezone.utc).isoformat())
            raw_response = json.dumps(simulation_data, default=str)
            
            # Insert simulation metadata
            cursor.execute('''
                INSERT INTO simulation_metadata 
                (simulation_id, flowsheet_name, simulation_status, start_timestamp, 
                 end_timestamp, config_file_name, output_file_name, raw_response)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (simulation_id, flowsheet_name, simulation_status, timestamp, 
                  timestamp, config_file, output_file, raw_response))
            
            # Stream name mapping based on stream numbers
            STREAM_NAME_MAPPING = {
                1: "6",
                2: "CO2 Inlet", 
                3: "CO2 Sink",
                4: "CH4 Inlet",
                5: "CH4 Sink",
                6: "R-Inlet",
                7: "7"
            }
            
            # Insert streams data
            all_streams = simulation_data.get('all_streams', {})
            for stream_key, stream_data in all_streams.items():
                if isinstance(stream_data, dict):
                    stream_id = str(uuid.uuid4())
                    
                    # Get stream number and map to correct name
                    stream_number = stream_data.get('stream_number')
                    custom_name = STREAM_NAME_MAPPING.get(stream_number, f'Stream {stream_number}')
                    
                    # Handle naming data (fallback to API data if available)
                    naming = stream_data.get('naming', {})
                    api_custom_name = stream_data.get('custom_name')
                    if api_custom_name and api_custom_name != 'Unknown':
                        custom_name = api_custom_name
                    
                    display_name = naming.get('display_name', custom_name)
                    graphic_tag = naming.get('graphic_tag', custom_name)
                    uuid_dwsim = stream_data.get('uuid', naming.get('uuid', ''))
                    
                    # Handle density (might be "infinite")
                    density = stream_data.get('density_kg_m3')
                    if density == "infinite":
                        density = None
                    
                    cursor.execute('''
                        INSERT INTO streams 
                        (stream_id, simulation_id, stream_number, custom_name, display_name, 
                         graphic_tag, uuid_dwsim, temperature_K, temperature_C, pressure_Pa, 
                         pressure_bar, mass_flow_kg_s, mass_flow_mg_s, molar_flow_mol_s, 
                         volumetric_flow_m3_s, density_kg_m3, molecular_weight_kg_mol, 
                         enthalpy_kJ_kg, entropy_kJ_kg_K, active, timestamp)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        stream_id, simulation_id, stream_data.get('stream_number'),
                        custom_name, display_name, graphic_tag, uuid_dwsim,
                        stream_data.get('temperature_K'), stream_data.get('temperature_C'),
                        stream_data.get('pressure_Pa'), stream_data.get('pressure_bar'),
                        stream_data.get('mass_flow_kg_s'), stream_data.get('mass_flow_mg_s'),
                        stream_data.get('molar_flow_mol_s'), stream_data.get('volumetric_flow_m3_s'),
                        density, stream_data.get('molecular_weight_kg_mol'),
                        stream_data.get('enthalpy_kJ_kg'), stream_data.get('entropy_kJ_kg_K'),
                        stream_data.get('active', False), stream_data.get('timestamp')
                    ))
            
            # Insert modifications data
            modifications = simulation_data.get('modifications_applied', [])
            for modification in modifications:
                if isinstance(modification, str):
                    # Parse modification string like "Stream 3: Temperature: 25 °C"
                    parts = modification.split(': ')
                    if len(parts) >= 3:
                        stream_part = parts[0]  # "Stream 3"
                        parameter = parts[1]    # "Temperature"
                        value = ': '.join(parts[2:])  # "25 °C"
                        
                        # Extract stream number
                        stream_number = None
                        if 'Stream' in stream_part:
                            try:
                                stream_number = int(stream_part.split()[-1])
                            except:
                                pass
                        
                        modification_id = str(uuid.uuid4())
                        cursor.execute('''
                            INSERT INTO modifications
                            (modification_id, simulation_id, stream_number, parameter_changed, 
                             new_value, applied_status)
                            VALUES (?, ?, ?, ?, ?, ?)
                        ''', (modification_id, simulation_id, stream_number, parameter, value, 'applied'))
            
            conn.commit()
            conn.close()
            
            print(f"✓ Simulation result saved to database: {simulation_id}")
            return simulation_id
            
        except Exception as e:
            print(f"❌ Failed to save simulation to database: {e}")
            if 'conn' in locals():
                conn.close()
            raise e
    
    def get_simulation_by_id(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """Get complete simulation data by ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get simulation metadata
            cursor.execute('''
                SELECT * FROM simulation_metadata WHERE simulation_id = ?
            ''', (simulation_id,))
            
            sim_row = cursor.fetchone()
            if not sim_row:
                return None
            
            # Get streams
            cursor.execute('''
                SELECT * FROM streams WHERE simulation_id = ? ORDER BY stream_number
            ''', (simulation_id,))
            
            streams = [dict(row) for row in cursor.fetchall()]
            
            # Get modifications
            cursor.execute('''
                SELECT * FROM modifications WHERE simulation_id = ? ORDER BY created_at
            ''', (simulation_id,))
            
            modifications = [dict(row) for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                'metadata': dict(sim_row),
                'streams': streams,
                'modifications': modifications
            }
            
        except Exception as e:
            print(f"❌ Failed to get simulation {simulation_id}: {e}")
            return None
    
    def get_latest_simulation(self) -> Optional[Dict[str, Any]]:
        """Get the most recent simulation"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT simulation_id FROM simulation_metadata 
                ORDER BY end_timestamp DESC LIMIT 1
            ''')
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                return self.get_simulation_by_id(row['simulation_id'])
            return None
            
        except Exception as e:
            print(f"❌ Failed to get latest simulation: {e}")
            return None
    
    def get_simulation_summary(self, simulation_id: str) -> Optional[Dict[str, Any]]:
        """Get simulation summary with stream counts"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Get basic metadata
            cursor.execute('''
                SELECT simulation_id, flowsheet_name, simulation_status, end_timestamp
                FROM simulation_metadata WHERE simulation_id = ?
            ''', (simulation_id,))
            
            metadata = cursor.fetchone()
            if not metadata:
                return None
            
            # Get stream counts
            cursor.execute('''
                SELECT 
                    COUNT(*) as total_streams,
                    SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active_streams
                FROM streams WHERE simulation_id = ?
            ''', (simulation_id,))
            
            counts = cursor.fetchone()
            
            # Get active stream names
            cursor.execute('''
                SELECT custom_name FROM streams 
                WHERE simulation_id = ? AND active = 1 
                ORDER BY stream_number
            ''', (simulation_id,))
            
            active_streams = [row['custom_name'] for row in cursor.fetchall()]
            
            # Get all stream names mapping (stream_number -> custom_name)
            cursor.execute('''
                SELECT stream_number, custom_name, display_name FROM streams 
                WHERE simulation_id = ? 
                ORDER BY stream_number
            ''', (simulation_id,))
            
            stream_mapping = {row['stream_number']: {
                'custom_name': row['custom_name'],
                'display_name': row['display_name']
            } for row in cursor.fetchall()}
            
            # Get modification count
            cursor.execute('''
                SELECT COUNT(*) as modification_count FROM modifications 
                WHERE simulation_id = ?
            ''', (simulation_id,))
            
            mod_count = cursor.fetchone()
            
            conn.close()
            
            return {
                'simulation_id': metadata['simulation_id'],
                'flowsheet_name': metadata['flowsheet_name'],
                'status': metadata['simulation_status'],
                'timestamp': metadata['end_timestamp'],
                'total_streams': counts['total_streams'],
                'active_streams': counts['active_streams'],
                'active_stream_names': active_streams,
                'stream_mapping': stream_mapping,
                'modifications_count': mod_count['modification_count']
            }
            
        except Exception as e:
            print(f"❌ Failed to get simulation summary: {e}")
            return None
    
    def get_recent_simulations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent simulations with summaries"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT simulation_id FROM simulation_metadata 
                ORDER BY end_timestamp DESC LIMIT ?
            ''', (limit,))
            
            simulation_ids = [row['simulation_id'] for row in cursor.fetchall()]
            conn.close()
            
            return [self.get_simulation_summary(sim_id) for sim_id in simulation_ids]
            
        except Exception as e:
            print(f"❌ Failed to get recent simulations: {e}")
            return []

# Singleton instance
db = SimulationDatabase()