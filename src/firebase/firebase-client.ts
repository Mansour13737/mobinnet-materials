'use client';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

type FirebaseServices = {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
};

let firebaseServices: FirebaseServices | null = null;

function initialize(): FirebaseServices {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase API Key is missing. Check your Vercel environment variables.');
  }
  const app = initializeApp(firebaseConfig);
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
  };
}

/**
 * Returns Firebase client services, initializing them only once.
 * This function ensures Firebase is only initialized on the client-side.
 */
export function getFirebaseClientServices(): FirebaseServices {
  if (typeof window === 'undefined') {
    throw new Error("Attempted to call getFirebaseClientServices() from the server but it's a client-only function.");
  }

  if (getApps().length === 0) {
    firebaseServices = initialize();
  } else {
    const app = getApp();
    firebaseServices = {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app),
    };
  }

  return firebaseServices;
}
