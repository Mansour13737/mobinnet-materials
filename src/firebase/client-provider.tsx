'use client';

import { ReactNode, useState, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { getFirebaseClientServices } from '@/firebase/firebase-client';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

/**
 * This is a client-side-only component that safely initializes Firebase services
 * and provides them to its children.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<FirebaseServices | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the initial server render.
    // This is the correct place to initialize client-side libraries.
    const firebaseServices = getFirebaseClientServices();
    setServices(firebaseServices);
  }, []); // The empty dependency array ensures this runs only once on mount.

  // Until the Firebase services are initialized on the client,
  // we can show a loader or just render nothing.
  if (!services) {
    return null; // or return a loading spinner
  }

  // Once services are available, render the main provider with them.
  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
