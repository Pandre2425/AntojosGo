// frontend/app/services/firebaseConfig.ts

// Importa los SDKs que vas a usar de Firebase
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging"; // si usas notificaciones push más adelante

const firebaseConfig = {
  apiKey: "AIzaSyA2Y8stOohDV9qp9fHK7brxAblVLjkOv6U",
  authDomain: "antojosgo-96e1c.firebaseapp.com",
  projectId: "antojosgo-96e1c",
  storageBucket: "antojosgo-96e1c.firebasestorage.app",
  messagingSenderId: "271111365438",
  appId: "1:271111365438:web:487d870f97389d9851826f",
  measurementId: "G-MP2SLB9VLZ"
};

// Inicializa Firebase (asegúrate de inicializar solo una vez)
const app = initializeApp(firebaseConfig);

// Exporta los servicios que usaremos en la app
export { firebaseConfig, app };
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const messaging = getMessaging(app); // lo activamos cuando configures FCM

export default app;
