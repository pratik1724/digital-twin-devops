import { getAwsCredentials, getAwsRegion } from '../utils/credentialProvider.js';
import { TWINMAKER_CONFIG } from '../config/aws-temp-creds.js';

let dataSourceSingleton = null;

export async function getTwinMakerDataSource() {
  if (dataSourceSingleton) return dataSourceSingleton;
  const creds = await getAwsCredentials();
  if (!creds) throw new Error('AWS credentials missing');

  // Dynamically import App Kit (works with ESM-only packages)
  let initialize;
  try {
    const mod = await import('@iot-app-kit/source-iottwinmaker');
    initialize = mod?.initialize || mod?.default?.initialize || mod?.default;
  } catch (e) {
    throw new Error('Failed to import @iot-app-kit/source-iottwinmaker. Ensure package is installed. ' + (e?.message || e));
  }
  if (!initialize) {
    throw new Error('initialize not found in @iot-app-kit/source-iottwinmaker');
  }

  dataSourceSingleton = initialize({
    awsCredentials: creds,
    awsRegion: getAwsRegion(),
    workspaceId: TWINMAKER_CONFIG.workspaceId,
  });
  return dataSourceSingleton;
}