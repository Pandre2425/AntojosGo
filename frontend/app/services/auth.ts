// frontend/app/services/auth.ts

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseConfig } from "./firebaseConfig"; // tu config real ya está en firebaseConfig.ts

// Inicializamos Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Login con email y password
export async function loginAndGetIdToken(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken(); // ID Token que usaremos en el backend
  return { token, user: cred.user };
}

// Registrar usuario (si quieres probar creación directa desde la app)
export async function registerAndGetIdToken(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();
  return { token, user: cred.user };
}
