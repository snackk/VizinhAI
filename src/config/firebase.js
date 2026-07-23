import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// Fallback config used only when explicitly requested via VITE_USE_FIREBASE_EMULATORS=true,
// so the app can boot straight against the Firebase Local Emulator Suite with zero setup
// beyond starting the emulators (see README "Testar localmente com o Mock Firebase").
const DEMO_EMULATOR_CONFIG = {
  apiKey: 'demo-key',
  authDomain: 'demo-vizinhai.firebaseapp.com',
  projectId: 'demo-vizinhai',
  storageBucket: 'demo-vizinhai.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo',
};

let firebaseConfig = {};
try {
  const configStr = import.meta.env.VITE_FIREBASE_CONFIG;
  if (configStr) {
    firebaseConfig = JSON.parse(configStr);
  }
} catch (e) {
  console.error("Erro ao fazer parse da configuração do Firebase", e);
}

// This project's .env normally points at the real Firebase project, so emulator mode
// is opt-in here (unlike a from-scratch project) — set VITE_USE_FIREBASE_EMULATORS=true
// to test locally against the Mock Firebase instead of live data.
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

// When forcing emulator mode, always use the demo project config — even if a real
// VITE_FIREBASE_CONFIG is present (this repo's .env normally points at production).
// Keeping the real projectId while pointing the SDK at the local emulator host would
// mismatch against the emulator's single demo project and silently return no data.
if (useEmulators) {
  firebaseConfig = DEMO_EMULATOR_CONFIG;
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = import.meta.env.VITE_APP_ID || "vizinhai-app";

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8081);
  connectStorageEmulator(storage, '127.0.0.1', 9198);
  console.info('[VizinhAI] Ligado aos emuladores locais do Firebase (Auth :9199, Firestore :8081, Storage :9198).');
}

export { firebaseConfig, app, auth, db, storage, appId, useEmulators };
