import { FirebaseOptions } from 'firebase/app';
import envConfig from '../env-config.json' assert { type: "json" };

export interface Host {
  protocol?: string;
  hostname: string;
  port: number;
}

export interface FirebaseEmulators {
  auth: Host;
  firestore: Host;
}

export interface FirebaseConfig {
  options: FirebaseOptions;
  // Should be set to true, except in environments for automated tests.
  enablePersistence: boolean;
  useEmulators?: boolean;
  emulators?: FirebaseEmulators
}

export interface EnvironmentConfig {
  environment: string;
  firebase: FirebaseConfig;
}

export function getEnv(): EnvironmentConfig {
  return envConfig;
}
