// CSV Data Reader with API integration - ALWAYS ENABLED
class CSVDataReader {
  constructor() {
    this.csvData = [];
    this.cache = new Map();
    this.lastModTime = null;
    this.isLoading = false;
    this.currentPlayhead = 0;
    this.timestamps = [];
    this.apiUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    this.initialized = false;
    
    // Load data immediately
    this.loadCSVDataSync();
    
    // Auto-initialize on creation
    this.initialize();
  }

  // Load CSV data synchronously (fallback to async)
  loadCSVDataSync() {
    try {
      // Start async loading but don't wait for it in constructor
      this.loadRealCSVData().then(() => {
        this.initialized = true;
        console.log('✅ CSV Reader: Data loaded asynchronously from API');
      }).catch(error => {
        console.error('❌ CSV Reader: API failed, using fallback data:', error);
        // Fallback to mock data if API fails
        const mockData = this.generateMockCSVData();
        this.parseCSVData(mockData);
        this.extractTimestamps();
        this.initialized = true;
      });
      
      // For immediate use, start with minimal mock data
      const mockData = this.generateMockCSVData();
      this.parseCSVData(mockData);
      this.extractTimestamps();
      console.log('⚡ CSV Reader: Started with fallback data, loading from API...');
    } catch (error) {
      console.error('Error in loadCSVDataSync:', error);
      // Use mock data as ultimate fallback
      const mockData = this.generateMockCSVData();
      this.parseCSVData(mockData);
      this.extractTimestamps();
    }
  }

  // Load real CSV data from the API  
  async loadRealCSVData() {
    try {
      console.log('📡 CSV Reader: Fetching data from API...');
      
      const response = await fetch(`${this.apiUrl}/api/metrics/csv`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.status !== 'success' || !result.data) {
        throw new Error('Invalid API response format');
      }
      
      // Convert API data to CSV format for parsing
      const csvLines = ['timestamp,metric_key,value,unit,quality'];
      result.data.forEach(row => {
        csvLines.push(`${row.timestamp},${row.metric_key},${row.value},${row.unit},${row.quality}`);
      });
      
      const csvContent = csvLines.join('\n');
      this.parseCSVData(csvContent);
      this.extractTimestamps();
      
      console.log(`✅ CSV Reader: Loaded ${result.data.length} records from API`);
      
    } catch (error) {
      console.error('❌ CSV Reader: Failed to load data from API:', error);
      throw error;
    }
  }

  // Load and parse CSV data (async version)
  async loadCSVData() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      await this.loadRealCSVData();
      console.log('✅ CSV data reloaded from API');
    } catch (error) {
      console.error('Error loading CSV data from API:', error);
      // Fallback to mock data if API fails
      const mockData = this.generateMockCSVData();
      this.parseCSVData(mockData);
      this.extractTimestamps();
    } finally {
      this.isLoading = false;
    }
  }

  // Generate mock CSV data (fallback only)
  generateMockCSVData() {
    console.warn('⚠️ CSV Reader: Using fallback mock data - API failed');
    // Minimal fallback data for H2 metric only
    return `timestamp,metric_key,value,unit,quality
2025-01-09T09:00:00Z,H2_Inlet_Flowrate_Process_value,1176,ml/min,GOOD
2025-01-09T10:00:00Z,H2_Inlet_Flowrate_Process_value,1189,ml/min,GOOD
2025-01-09T11:00:00Z,H2_Inlet_Flowrate_Process_value,1208,ml/min,GOOD
2025-01-09T12:00:00Z,H2_Inlet_Flowrate_Process_value,1195,ml/min,GOOD
2025-01-09T13:00:00Z,H2_Inlet_Flowrate_Process_value,1182,ml/min,GOOD
2025-01-09T14:00:00Z,H2_Inlet_Flowrate_Process_value,1211,ml/min,GOOD`;
  }

  // Parse CSV data into structured format
  parseCSVData(csvContent) {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',');
    
    this.csvData = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const row = {};
      
      headers.forEach((header, index) => {
        row[header.trim()] = values[index]?.trim();
      });
      
      this.csvData.push(row);
    }
    
    console.log(`✅ CSV Reader: Loaded ${this.csvData.length} records`);
  }

  // Extract unique timestamps and sort them
  extractTimestamps() {
    const timestampSet = new Set();
    this.csvData.forEach(row => {
      if (row.timestamp) {
        timestampSet.add(row.timestamp);
      }
    });
    
    this.timestamps = Array.from(timestampSet).sort();
    console.log(`✅ CSV Reader: Found ${this.timestamps.length} unique timestamps`);
  }

  // Get current playhead timestamp with looping
  getCurrentTimestamp() {
    if (this.timestamps.length === 0) return null;
    
    // Use current time to determine which timestamp to use for consistent playback
    const now = Math.floor(Date.now() / 10000) % this.timestamps.length; // Change every 10 seconds
    return this.timestamps[now];
  }

  // Get live value for a metric at current playhead position
  getLiveValue(metricKey) {
    if (!metricKey || this.csvData.length === 0) {
      console.log(`❌ CSV Reader: getLiveValue - No metricKey (${metricKey}) or no data (${this.csvData.length})`);
      return null;  
    }

    // Normalize metric key to match CSV format
    const processKey = String(metricKey).replace(/^(.*?)(_Set_value|_Process_value)?$/, '$1_Process_value');
    
    // Get current timestamp - use a consistent one across all metrics
    const currentTimestamp = this.getCurrentTimestamp();
    if (!currentTimestamp) {
      console.log(`❌ CSV Reader: getLiveValue - No current timestamp for ${metricKey}`);
      return null;
    }

    // Find the record for this metric and timestamp
    const record = this.csvData.find(row => 
      row.metric_key === processKey && row.timestamp === currentTimestamp
    );

    if (!record) {
      // If no exact match, try to find any record for this metric
      const fallbackRecord = this.csvData.find(row => row.metric_key === processKey);
      if (fallbackRecord) {
        console.log(`⚠️ CSV Reader: getLiveValue - Using fallback record for ${metricKey} -> ${processKey}`);
        return {
          value: parseFloat(fallbackRecord.value),
          time: new Date(fallbackRecord.timestamp).getTime(),
          quality: fallbackRecord.quality
        };
      }
      console.log(`❌ CSV Reader: getLiveValue - No record found for ${metricKey} -> ${processKey}`);
      return null;
    }

    console.log(`✅ CSV Reader: getLiveValue - Found data for ${metricKey} -> ${processKey}: ${record.value}`);
    return {
      value: parseFloat(record.value),
      time: new Date(record.timestamp).getTime(),
      quality: record.quality
    };
  }

  // Get set value for a metric (constant)
  getSetValue(metricKey) {
    if (!metricKey || this.csvData.length === 0) {
      return null;
    }

    const setKey = String(metricKey).replace(/^(.*?)(_Set_value|_Process_value)?$/, '$1_Set_value');
    
    // Set values are constant, so get any record for this metric
    const record = this.csvData.find(row => row.metric_key === setKey);
    
    if (!record) return null;

    return {
      value: parseFloat(record.value),
      time: Date.now(),
      quality: record.quality
    };
  }

  // Get aggregated trend data for a metric with time range filtering
  getAggregates(metricKey, minutes = 60, startDate = null, endDate = null) {
    if (!metricKey || this.csvData.length === 0) {
      console.log(`❌ CSV Reader: getAggregates - No metricKey (${metricKey}) or no data (${this.csvData.length})`);
      return [];
    }

    // First, try the exact metric key as provided
    let processKey = metricKey;
    let records = this.csvData.filter(row => row.metric_key === processKey);
    
    // If no records found, try to normalize the key  
    if (records.length === 0) {
      processKey = String(metricKey).replace(/^(.*?)(_Set_value|_Process_value)?$/, '$1_Process_value');
      records = this.csvData.filter(row => row.metric_key === processKey);
    }
    
    // If still no records, try without _Process_value suffix
    if (records.length === 0) {
      processKey = String(metricKey).replace(/(_Set_value|_Process_value)$/, '');
      records = this.csvData.filter(row => row.metric_key === processKey);
    }
    
    // Sort records by timestamp
    records = records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log(`📊 CSV Reader: getAggregates - Input: "${metricKey}" -> Processed: "${processKey}" -> Found ${records.length} records`);

    if (records.length === 0) {
      console.log(`❌ CSV Reader: getAggregates - No records found for any variant of "${metricKey}"`);
      console.log(`Available metric keys sample:`, this.csvData.slice(0, 5).map(row => row.metric_key));
      return [];
    }

    // Apply time range filtering if provided
    if (startDate || endDate) {
      const startTime = startDate ? new Date(startDate).getTime() : 0;
      const endTime = endDate ? new Date(endDate).getTime() : Date.now();
      
      records = records.filter(record => {
        const recordTime = new Date(record.timestamp).getTime();
        return recordTime >= startTime && recordTime <= endTime;
      });
      
      console.log(`🔍 CSV Reader: Time range filter applied - Start: ${startDate || 'none'}, End: ${endDate || 'none'}, Filtered to ${records.length} records`);
    }

    // Convert to trend data format
    const trendData = records.map(record => {
      const timestamp = new Date(record.timestamp).getTime();
      const value = parseFloat(record.value);
      
      if (isNaN(value)) {
        console.warn(`Warning: Invalid value "${record.value}" for ${record.metric_key} at ${record.timestamp}`);
        return null;
      }
      
      return {
        x: timestamp,
        y: value,
        value: value
      };
    }).filter(point => point !== null); // Remove invalid points

    console.log(`✅ CSV Reader: getAggregates - Generated ${trendData.length} trend points for ${metricKey}`);
    
    // Debug: Log first few data points
    if (trendData.length > 0) {
      console.log(`First trend point:`, new Date(trendData[0].x).toISOString(), trendData[0].value);
      console.log(`Last trend point:`, new Date(trendData[trendData.length - 1].x).toISOString(), trendData[trendData.length - 1].value);
    }
    
    return trendData;
  }

  // Check if CSV file has been modified and reload if needed
  async checkAndReload() {
    try {
      const now = Date.now();
      if (!this.lastModTime || (now - this.lastModTime) > 5000) {
        await this.loadCSVData();
        this.lastModTime = now;
      }
    } catch (error) {
      console.error('Error checking CSV file:', error);
    }
  }

  // Initialize and start the playback - AUTO-RUN
  async initialize() {
    if (this.initialized) return;
    
    await this.loadCSVData();
    this.initialized = true;
    
    // Set up periodic reload check
    setInterval(() => {
      this.checkAndReload();
    }, 5000); // Check every 5 seconds
    
    console.log('✅ CSV Reader: Auto-initialized and running');
  }
}

// Global instance - auto-enabled
const csvReader = new CSVDataReader();

export default csvReader;