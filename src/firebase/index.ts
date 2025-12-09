'use client';

import { firebaseConfig as localFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Helper function to return all SDKs
function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
  };
}

// This function is the core of the solution. It handles initialization
// for both local development and Vercel production environments.
export function initializeFirebase() {
  // Prevent re-initialization
  if (getApps().length > 0) {
    return getSdks(getApp());
  }

  // This config is built from the NEXT_PUBLIC_ environment variables.
  // It will be used for Vercel deployments.
  const vercelEnvConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  };

  // Check if we are in a Vercel environment by seeing if the public
  // environment variables have been provided.
  // We use apiKey as the key indicator.
  const isVercel = !!vercelEnvConfig.apiKey;
  
  // Use the Vercel config if available, otherwise fall back to the local config file.
  // This ensures no undefined values are passed to initializeApp.
  const configToUse = isVercel ? vercelEnvConfig : localFirebaseConfig;

  // Initialize the app with the correct configuration.
  const app = initializeApp(configToUse);
  
  return getSdks(app);
}

// Export everything else as before
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
