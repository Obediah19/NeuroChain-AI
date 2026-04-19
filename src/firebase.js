import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

let app, db, auth;

try {
  const firebaseConfig = {
    apiKey: "AIzaSyAjUmeJc0MrqzsakiQcdtLbNT7AjSxSr8Y",
    authDomain: "neurochain-ai-cfafe.firebaseapp.com",
    projectId: "neurochain-ai-cfafe",
    storageBucket: "neurochain-ai-cfafe.firebasestorage.app",
    messagingSenderId: "538356638287",
    appId: "1:538356638287:web:00f8f52bcbc108f2ad403a",
    measurementId: "G-L40SGV9LL6"
  };

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  console.log("Firebase initialized");
} catch (e) {
  console.error("Firebase init failed:", e);
  app = null;
  db = null;
  auth = null;
}

export { app, db, auth };