import { initializeApp } from 'firebase/app';
import { 
  initializeAuth,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  indexedDBLocalPersistence,
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInAnonymously,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit, 
  Timestamp, 
  getDocFromServer 
} from 'firebase/firestore';

// @ts-ignore
import firebaseConfig from '../firebase-applet-config.json';

// Validate config
if (!firebaseConfig || !firebaseConfig.apiKey) {
  console.error("Firebase configuration is missing or invalid! Please ensure firebase-applet-config.json is present and has an apiKey.");
} else {
  const maskedKey = `${firebaseConfig.apiKey.substring(0, 5)}...${firebaseConfig.apiKey.substring(firebaseConfig.apiKey.length - 4)}`;
  console.log(`[Firebase] Initializing with project: ${firebaseConfig.projectId}, API Key: ${maskedKey}`);
}

const app = initializeApp(firebaseConfig);

// Check storage availability
const isStorageAvailable = () => {
  try {
    localStorage.setItem('ais_test', 'test');
    localStorage.removeItem('ais_test');
    return true;
  } catch (e) {
    return false;
  }
};

if (!isStorageAvailable()) {
  console.warn("[Firebase] LocalStorage is blocked. Auth persistence may be limited to the current session.");
}

// Initialize Auth with persistence fallback: LocalStorage -> IndexedDB
// LocalStorage is often more stable in sandboxed iframes than IndexedDB
export const auth = initializeAuth(app, {
  persistence: [browserLocalPersistence, indexedDBLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});

// Helper to check persistence
(async () => {
  try {
    // Wait for auth to initialize
    await auth.authStateReady();
    console.log(`[Firebase] Auth ready. Current User: ${auth.currentUser?.email || 'None'}`);
  } catch (e) {
    console.error("[Firebase] Auth state error:", e);
  }
})();

// Initialize Firestore with settings
const dbSettings = {
  experimentalForceLongPolling: true,
};

// If a specific database ID is provided in config, use it
const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

export const db = initializeFirestore(app, dbSettings, databaseId);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isAdmin() {
  return auth.currentUser != null &&
    (auth.currentUser.email === "nightruan31@gmail.com" && auth.currentUser.emailVerified === true);
}

export async function testConnection() {
  let retries = 3;
  while (retries > 0) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      console.log("Firestore connection successful.");
      return;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn(`Firestore connectivity issue. Retrying... (${retries} left)`);
        retries--;
        await new Promise(r => setTimeout(r, 2000));
      } else {
        // Different kind of error, might be permissions or non-existent db
        console.error("Firestore test connection error:", error);
        break;
      }
    }
  }
  console.error("Please check your Firebase configuration. Ensure the database ID is correct and provisioned.");
}

// testConnection();
setTimeout(testConnection, 2000);

export { signInWithPopup, signInAnonymously, onAuthStateChanged, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, orderBy, limit, Timestamp };
export type { User };
