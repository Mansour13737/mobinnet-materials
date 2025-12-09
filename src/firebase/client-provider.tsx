'use client';

import { ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { getFirebaseClientServices } from '@/firebase/firebase-client';

/**
 * This is a client-side-only component that initializes Firebase services
 * and provides them to its children.
 */
export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  // getFirebaseClientServices is guaranteed to run on the client here.
  const firebaseServices = getFirebaseClientServices();

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
