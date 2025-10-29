import { AWS_TEMP_CREDS, hasValidCreds } from '../config/aws-temp-creds.js';

export async function getAwsCredentials() {
  if (!hasValidCreds()) return null;
  // Return plain AWS v3 credential object
  return {
    accessKeyId: AWS_TEMP_CREDS.accessKeyId,
    secretAccessKey: AWS_TEMP_CREDS.secretAccessKey,
    sessionToken: AWS_TEMP_CREDS.sessionToken,
  };
}

export function getAwsRegion() {
  return AWS_TEMP_CREDS.region || 'us-east-1';
}