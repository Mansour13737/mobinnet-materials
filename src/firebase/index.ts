'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// This is the single source of truth for the Firebase configuration for Vercel.
// It is populated by Next.js from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

/**
 * Initializes Firebase on the CLIENT-SIDE and returns the SDKs.
 * It prevents re-initialization.
 * This function should only be called from client components or files marked with 'use client'.
 */
export function initializeFirebase() {
  // If running on the server, return null services.
  if (typeof window === 'undefined') {
    return { firebaseApp: null, auth: null, firestore: null };
  }

  // On the client, if the app is already initialized, return the existing app's SDKs.
  if (getApps().length > 0) {
    const app = getApp();
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app),
    };
  }

  // If the API key is missing, it means environment variables are not configured.
  // Throw a clear error to prevent initializing Firebase with an invalid config.
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase API Key is missing. Please check your environment variables on Vercel (NEXT_PUBLIC_FIREBASE_API_KEY).');
  }

  // Initialize the Firebase app with the config.
  const app = initializeApp(firebaseConfig);
  
  // Return the SDKs for the newly initialized app.
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

// Export everything else as before
export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
