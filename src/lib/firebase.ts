import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Khởi tạo Firebase Singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);

/* 
// ĐÃ KHÓA KẾT NỐI EMULATOR (Web sẽ kết nối trực tiếp Firebase thật trên Cloud):
if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  if (!global._hasConnectedFirestoreEmulator) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    // @ts-ignore
    global._hasConnectedFirestoreEmulator = true;
  }
}
*/

export { app, db, auth };