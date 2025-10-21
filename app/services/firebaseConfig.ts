// frontend/app/services/firebaseConfig.ts

// Importa los SDKs que vas a usar de Firebase
import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};

// Implementación de persistencia personalizada usando AsyncStorage para React Native
// Compatible con Firebase Auth Persistence interface
const customAsyncStoragePersistence = {
  type: 'LOCAL' as const,
  async _isAvailable() {
    try {
      const testKey = '__firebase_auth_test__';
      await AsyncStorage.setItem(testKey, 'test');
      await AsyncStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },
  async _set(key: string, value: any) {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },
  async _get<T>(key: string): Promise<T | null> {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  async _remove(key: string) {
    await AsyncStorage.removeItem(key);
  }
};
// Inicializa Firebase (asegúrate de inicializar solo una vez)
const app = initializeApp(firebaseConfig);

// Exporta los servicios que usaremos en la app
export { firebaseConfig, app };
// Inicializa Auth con persistencia de React Native usando AsyncStorage
// @ts-ignore - Custom persistence implementation for React Native
export const auth = initializeAuth(app, {
  persistence: customAsyncStoragePersistence as any
});
export const db = getFirestore(app);
// export const messaging = getMessaging(app); // lo activamos cuando configures FCM

export default app;
