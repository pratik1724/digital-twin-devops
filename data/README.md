# Data - SMR Metrics Storage

## Overview

This directory contains the data storage for SMR dashboard metrics, primarily CSV files with time-series process data for dashboard visualization and analysis.

## 📁 Folder Structure

```
data/
├── README.md                        # This documentation
└── smr_metrics/                     # Metrics CSV data files
    ├── latest.csv                   # Current active dataset (symlink)
    ├── complete_mock_6h.csv         # Complete 6-hour mock dataset  
    └── mock_6h.csv                  # Previous mock dataset (legacy)
```

## 📊 SMR Metrics Data

### **Data Files Description**

#### **latest.csv** (Symlink)
- **Purpose**: Active dataset pointer for consistent frontend access
- **Target**: Currently points to `complete_mock_6h.csv`
- **Usage**: Frontend csvDataReader loads from this file
- **Benefits**: Allows seamless data updates without code changes

#### **complete_mock_6h.csv** (Primary Dataset)
- **Purpose**: Comprehensive 6-hour time-series data for all SMR metrics
- **Content**: 258 records (43 metrics × 6 time points)
- **Time Range**: 2025-01-09 09:00:00Z to 14:00:00Z (hourly intervals)
- **Format**: CSV with headers: timestamp, metric_key, value, unit, quality

#### **mock_6h.csv** (Legacy)
- **Purpose**: Previous limited dataset (now deprecated)
- **Status**: Maintained for backward compatibility
- **Content**: Subset of metrics with limited coverage

## 📋 Data Structure

### **CSV Format Specification**
```csv
timestamp,metric_key,value,unit,quality
2025-01-09T09:00:00Z,H2_Inlet_Flowrate_Process_value,1176,ml/min,GOOD
2025-01-09T10:00:00Z,H2_Inlet_Flowrate_Process_value,1189,ml/min,GOOD
...
```

### **Data Fields**
- **timestamp**: ISO 8601 format timestamp (UTC)
- **metric_key**: Unique identifier matching frontend configuration
- **value**: Numeric measurement value
- **unit**: Engineering unit (ml/min, °C, Bar)
- **quality**: Data quality indicator (GOOD, UNCERTAIN, BAD)

### **Metric Categories**

#### **Inlet Metrics (Process & Set Values)**
```
H2_Inlet_Flowrate_Process_value      # Hydrogen inlet flowrate
CH4_Inlet_Flowrate_Process_value     # Methane inlet flowrate  
CO2_Inlet_Flowrate_Process_value     # Carbon dioxide inlet flowrate
N2_Inlet_Flowrate_Process_value      # Nitrogen inlet flowrate
Air_Inlet_Flowrate_Process_value     # Air inlet flowrate
Water_Inlet_Flowrate_Process_value   # Water inlet flowrate

H2_Inlet_Flowrate_Set_value         # Corresponding set points
CH4_Inlet_Flowrate_Set_value        # ...
[...all inlet set values]
```

#### **Temperature Metrics (Process & Set Values)**
```
Temp_preheater_1_Process_value      # Pre-heater 1 temperature
Temp_preheater_2_Process_value      # Pre-heater 2 temperature
Temp_preheater_3_Process_value      # Pre-heater 3 temperature  
Temp_preheater_4_Process_value      # Pre-heater 4 temperature

Temp_reactor_furnace_1_Process_value # Reactor furnace 1 temperature
Temp_reactor_furnace_2_Process_value # Reactor furnace 2 temperature
Temp_reactor_furnace_3_Process_value # Reactor furnace 3 temperature

Temp_reactor_bed_Process_value       # Reactor bed temperature

[...corresponding set values]
```

#### **Pressure Metrics (Process & Set Values)**
```
Pressure_reactor_Process_value       # Reactor pressure
Pressure_reactor_Set_value          # Reactor pressure set point
```

#### **Outlet Metrics (Process & Set Values)**
```
H2_outlet_Flowrate_Process_value     # Hydrogen outlet flowrate
CH4_outlet_Flowrate_Process_value    # Methane outlet flowrate
CO2_outlet_Flowrate_Process_value    # Carbon dioxide outlet flowrate
CO_outlet_Flowrate_Process_value     # Carbon monoxide outlet flowrate
N2_outlet_Flowrate_Process_value     # Nitrogen outlet flowrate
Air_outlet_Flowrate_Process_value    # Air outlet flowrate
Water_outlet_Flowrate_Process_value  # Water outlet flowrate

[...corresponding set values]
```

## 🔄 Data Flow Integration

### **Frontend Integration**
```javascript
// Data loading flow
csvDataReader.js → loads latest.csv → parses data → provides to components

// Usage in components
const liveValue = csvDataReader.getLiveValue('H2_Inlet_Flowrate_Process_value')
const trendData = csvDataReader.getAggregates('H2_Inlet_Flowrate_Process_value')
```

### **Configuration Mapping**
```javascript
// smr-map.js configuration must match CSV metric_key values
{
  id: 'h2_inlet_pv',
  label: 'H2 Inlet Flowrate', 
  propertyId: 'H2_Inlet_Flowrate_Process_value'  // Must match CSV
}
```

### **Time-series Playback**
```javascript
// Simulated real-time playback
getCurrentTimestamp() → cycles through 6 time points → loops back
Timeline: 09:00 → 10:00 → 11:00 → 12:00 → 13:00 → 14:00 → 09:00...
```

## 📊 Data Characteristics

### **Temporal Coverage**
- **Duration**: 6 hours (09:00 to 14:00 UTC)
- **Frequency**: Hourly samples  
- **Time Points**: 6 unique timestamps
- **Total Records**: 258 (43 unique metrics × 6 time points)

### **Value Ranges**
```
Flowrates:  1150-1250 ml/min  (realistic industrial range)
Temperatures: 1190-1330 °C   (high-temperature SMR conditions)
Pressures:   1.44-1.57 Bar   (slightly above atmospheric)
Quality:     "GOOD"          (all data marked as high quality)
```

### **Data Variability**
- **Process Values**: Realistic fluctuations around set points
- **Set Values**: Constant targets (e.g., 1200 ml/min, 1280°C, 1.5 Bar)
- **Temporal Patterns**: Smooth variations simulating process dynamics

## 🔧 Data Management

### **Updating Data**
```bash
# Method 1: Replace target file
cp new_dataset.csv complete_mock_6h.csv

# Method 2: Update symlink
ln -sf new_dataset.csv latest.csv

# Method 3: Direct replacement (production)
# Replace latest.csv directly (not recommended for symlinks)
```

### **Data Validation**
```python
def validate_csv_data(filename):
    """Validate CSV data structure and content"""
    df = pd.read_csv(filename)
    
    # Check required columns
    required_cols = ['timestamp', 'metric_key', 'value', 'unit', 'quality']
    assert all(col in df.columns for col in required_cols)
    
    # Check timestamp format  
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Check value ranges
    assert df['value'].between(0, 10000).all()
    
    # Check quality values
    assert df['quality'].isin(['GOOD', 'UNCERTAIN', 'BAD']).all()
    
    return True
```

### **Data Generation Script** (Future Enhancement)
```python
def generate_smr_data(start_time, duration_hours, metrics_config):
    """Generate synthetic SMR data with realistic patterns"""
    timestamps = pd.date_range(start_time, periods=duration_hours, freq='1H')
    
    data_records = []
    for metric in metrics_config:
        for ts in timestamps:
            # Add realistic noise and trends
            base_value = metric['base_value']
            noise = np.random.normal(0, metric['noise_std'])
            trend = metric['trend_coeff'] * (ts - start_time).total_seconds()
            
            value = base_value + noise + trend
            
            data_records.append({
                'timestamp': ts.isoformat() + 'Z',
                'metric_key': metric['key'],
                'value': round(value, 1),
                'unit': metric['unit'],
                'quality': 'GOOD'
            })
    
    return pd.DataFrame(data_records)
```

## 🔍 Data Quality & Monitoring

### **Quality Indicators**
- **GOOD**: Normal operation, high confidence in measurement
- **UNCERTAIN**: Sensor drift or minor issues, moderate confidence  
- **BAD**: Sensor failure or major issues, low confidence

### **Data Integrity Checks**
```python
def check_data_integrity(df):
    """Perform comprehensive data quality checks"""
    
    # Completeness check
    missing_data = df.isnull().sum()
    
    # Temporal consistency 
    time_gaps = df.groupby('metric_key')['timestamp'].diff()
    
    # Value reasonableness
    outliers = detect_outliers(df['value'])
    
    # Duplicate detection
    duplicates = df.duplicated(['timestamp', 'metric_key'])
    
    return {
        'missing_data': missing_data,
        'time_gaps': time_gaps,
        'outliers': outliers,
        'duplicates': duplicates
    }
```

### **Performance Metrics**
```python
# Data loading performance
avg_load_time = 50ms      # csvDataReader initialization
memory_usage = 2.5MB      # In-memory data storage
query_time = 1-5ms        # getLiveValue() response time
```

## 🚀 Future Enhancements

### **Real-time Data Integration**
```python
# AWS SiteWise integration (future)
def connect_to_sitewise():
    """Connect to AWS SiteWise for live industrial data"""
    client = boto3.client('iotsitewise')
    
    # Replace CSV with real-time API calls
    def get_live_data(property_id):
        response = client.get_asset_property_value(
            assetId=ASSET_ID,
            propertyId=property_id
        )
        return response['propertyValue']
```

### **Data Archival & Compression**
```python
# Time-series database integration
def store_in_timeseries_db(data):
    """Store data in InfluxDB or TimescaleDB"""
    from influxdb_client import InfluxDBClient
    
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN)
    write_api = client.write_api()
    
    # Convert to InfluxDB line protocol
    points = convert_to_line_protocol(data)
    write_api.write(bucket=BUCKET, record=points)
```

### **Advanced Analytics**
```python
# Statistical analysis and anomaly detection
def analyze_process_stability(df):
    """Analyze process stability and detect anomalies"""
    
    # Calculate statistical metrics
    stability_metrics = df.groupby('metric_key')['value'].agg([
        'mean', 'std', 'min', 'max', 'var'
    ])
    
    # Anomaly detection using statistical methods
    anomalies = detect_statistical_anomalies(df)
    
    # Trend analysis
    trends = calculate_process_trends(df)
    
    return {
        'stability': stability_metrics,
        'anomalies': anomalies,
        'trends': trends
    }
```

## 🐛 Common Issues & Solutions

### **Data Loading Issues**
```python
# Problem: CSV file not found
# Solution: Check file path and symlink integrity
if not os.path.exists('/app/data/smr_metrics/latest.csv'):
    print("CSV file not found - check symlink")
    
# Problem: Incorrect data format
# Solution: Validate CSV structure before loading
try:
    df = pd.read_csv(filename)
    validate_csv_structure(df)
except Exception as e:
    print(f"CSV validation failed: {e}")
```

### **Performance Issues**
```python
# Problem: Slow data loading
# Solution: Implement caching and lazy loading
@lru_cache(maxsize=1)
def load_cached_data():
    return pd.read_csv('/app/data/smr_metrics/latest.csv')

# Problem: Memory usage with large datasets
# Solution: Use chunked reading for large files
def read_large_csv(filename, chunksize=1000):
    for chunk in pd.read_csv(filename, chunksize=chunksize):
        yield chunk
```

### **Data Consistency Issues**
```python
# Problem: Mismatched metric keys between CSV and configuration
# Solution: Implement automated validation
def validate_metric_mapping(csv_file, config_file):
    csv_keys = set(pd.read_csv(csv_file)['metric_key'].unique())
    config_keys = set(extract_property_ids_from_config(config_file))
    
    missing_in_csv = config_keys - csv_keys
    missing_in_config = csv_keys - config_keys
    
    if missing_in_csv:
        print(f"Missing in CSV: {missing_in_csv}")
    if missing_in_config:
        print(f"Missing in config: {missing_in_config}")
```

---

**Related Documentation:**
- [Frontend Data Integration](../frontend/README.md)
- [Backend API](../backend/README.md)
- [Main Project](../README.md)