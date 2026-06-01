import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let firebaseConfig = {};
try {
  const configStr = import.meta.env.VITE_FIREBASE_CONFIG;
  if (configStr) {
    firebaseConfig = JSON.parse(configStr);
  }
} catch (e) {
  console.error("Erro ao fazer parse da configuração do Firebase", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = import.meta.env.VITE_APP_ID || "vizinhai-app";

export { firebaseConfig, app, auth, db, storage, appId };

