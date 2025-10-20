// frontend/app/services/firebaseConfig.ts

// Importa los SDKs que vas a usar de Firebase
import { initializeApp } from "firebase/app";
import { initializeAuth, Persistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA2Y8stOohDV9qp9fHK7brxAblVLjkOv6U",
  authDomain: "antojosgo-96e1c.firebaseapp.com",
  projectId: "antojosgo-96e1c",
  storageBucket: "antojosgo-96e1c.firebasestorage.app",
  messagingSenderId: "271111365438",
  appId: "1:271111365438:web:487d870f97389d9851826f",
  measurementId: "G-MP2SLB9VLZ"
};

// Implementación de persistencia personalizada usando AsyncStorage para React Native
const customAsyncStoragePersistence: Persistence = {
  type: 'LOCAL',
  async _isAvailable(): Promise<boolean> {
    try {
      const testKey = '__firebase_auth_test__';
      await AsyncStorage.setItem(testKey, 'test');
      await AsyncStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
  async _set(key: string, value: any): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async _get<T>(key: string): Promise<T | null> {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  async _remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }
};
// Inicializa Firebase (asegúrate de inicializar solo una vez)
const app = initializeApp(firebaseConfig);

// Exporta los servicios que usaremos en la app
export { firebaseConfig, app };
// Inicializa Auth con persistencia de React Native usando AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
// export const messaging = getMessaging(app); // lo activamos cuando configures FCM

export default app;
