// Lightweight mock of AWS IoT SiteWise calls for DEV_MODE

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000; 
  return x - Math.floor(x);
}

// Cache for set values to keep them constant
const setValueCache = new Map();

export function getMockLiveValue(propertyId) {
  const t = Date.now();
  
  // Check if this is a Set variable (should be constant)
  if (propertyId && (propertyId.includes('_set') || propertyId.includes('Set_variable'))) {
    // Return cached constant value for Set variables
    if (!setValueCache.has(propertyId)) {
      // Generate a stable set value based on propertyId hash
      const hash = propertyId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      const baseValue = 1000 + Math.abs(hash % 400); // Range: 1000-1400
      setValueCache.set(propertyId, {
        value: baseValue,
        time: t,
        quality: "GOOD"
      });
    }
    return setValueCache.get(propertyId);
  }
  
  // Process variables with slower, more stable changes
  const slowSeed = Math.floor(t / 10000); // Changes every 10 seconds instead of every second
  const baseSeed = Math.floor(t / 120000); // Base changes every 2 minutes instead of 30 seconds
  
  const base = 1100 + Math.floor(seededRandom(baseSeed) * 150); // Reduced range for stability
  const jitter = Math.round(seededRandom(slowSeed) * 20) - 10; // Reduced jitter
  
  return { 
    value: Math.max(base + jitter, 50), // Ensure positive values
    time: t, 
    quality: "GOOD" 
  };
}

export function getMockAggregates(propertyId, minutes = 60, stepMs = 60000) {
  const now = Date.now();
  const points = [];
  
  // Use propertyId to create consistent baseline for each metric
  const hash = propertyId ? propertyId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0) : 0;
  
  const baseline = 1000 + Math.abs(hash % 300); // Consistent baseline per metric
  
  for (let i = minutes; i >= 0; i--) {
    const ts = now - i * stepMs;
    // Create realistic process data trends with some variation
    const trend = Math.sin(i / 12) * 30; // Slower sine wave
    const noise = (seededRandom(i + hash) - 0.5) * 15; // Reduced noise
    const val = baseline + trend + noise;
    points.push({ x: ts, y: Math.max(Math.round(val), 50) });
  }
  return points;
}