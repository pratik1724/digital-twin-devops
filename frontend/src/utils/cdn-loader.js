// CDN loader with multi-CDN fallback (jsDelivr +esm, esm.sh, esm.run)
// Avoids bundler installs; loads ESM modules at runtime with dynamic import.

function dynamicImport(url) {
  // eslint-disable-next-line no-new-func
  const importer = new Function('u', 'return import(u)');
  return importer(url);
}

function withTimeout(promise, ms, label) {
  let id;
  const timeout = new Promise((_, rej) => {
    id = setTimeout(() => rej(new Error(`Timeout loading ${label} after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(id));
}

const CANDIDATES = [
  {
    name: 'jsdelivr',
    twinmaker: 'https://cdn.jsdelivr.net/npm/@iot-app-kit/source-iottwinmaker@7.5.0/+esm',
    reactComponents: 'https://cdn.jsdelivr.net/npm/@iot-app-kit/react-components@7.5.0/+esm',
  },
  {
    name: 'esm.sh',
    twinmaker: 'https://esm.sh/@iot-app-kit/source-iottwinmaker@7.5.0?bundle',
    reactComponents: 'https://esm.sh/@iot-app-kit/react-components@7.5.0?bundle',
  },
  {
    name: 'esm.run',
    twinmaker: 'https://esm.run/@iot-app-kit/source-iottwinmaker@7.5.0',
    reactComponents: 'https://esm.run/@iot-app-kit/react-components@7.5.0',
  },
];

export async function loadAppKitFromCDN() {
  // Try each CDN in order; 6s per module per CDN max
  let lastErr;
  for (const cdn of CANDIDATES) {
    try {
      const [srcMod, rcMod] = await Promise.all([
        withTimeout(dynamicImport(cdn.twinmaker), 6000, `${cdn.name}:source-iottwinmaker`),
        withTimeout(dynamicImport(cdn.reactComponents), 6000, `${cdn.name}:react-components`),
      ]);

      const initialize = srcMod?.initialize || srcMod?.default?.initialize || srcMod?.initializeTwinMaker || srcMod?.default;
      const SceneViewer = rcMod?.SceneViewer || rcMod?.default?.SceneViewer || rcMod?.default;

      if (!initialize) throw new Error(`${cdn.name}: initialize not found`);
      if (!SceneViewer) throw new Error(`${cdn.name}: SceneViewer not found`);

      if (typeof window !== 'undefined') {
        window.__TW_APPKIT__ = { initialize, SceneViewer, cdn: cdn.name };
      }
      return { initialize, SceneViewer, cdn: cdn.name };
    } catch (e) {
      lastErr = e;
      // try next CDN
    }
  }
  throw lastErr || new Error('All CDNs failed to load IoT App Kit');
}

export function appKitFromCache() {
  if (typeof window === 'undefined') return null;
  return window.__TW_APPKIT__ || null;
}