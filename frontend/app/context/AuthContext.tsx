import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../services/firebaseConfig";
import { apiService } from "../services/api";

interface User {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          await SecureStore.setItemAsync("firebaseToken", idToken);
          const userData = await apiService.verifyToken(idToken);
          setUser(userData);
        } catch (error) {
          console.error("Auth verification failed:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        await SecureStore.deleteItemAsync("firebaseToken");
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === "auth/user-not-found") {
        throw new Error("No hay una cuenta asociada a este email");
      } else if (error.code === "auth/wrong-password") {
        throw new Error("Contraseña incorrecta");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Email inválido");
      } else if (error.code === "auth/too-many-requests") {
        throw new Error("Demasiados intentos. Intenta más tarde");
      }
      throw new Error("Error al iniciar sesión");
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;
      await updateProfile(user, { displayName: name });

      return true;
    } catch (error: any) {
      console.error("Registration failed:", error);
      if (error.code === "auth/email-already-in-use") {
        throw new Error("Ya existe una cuenta con este email");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Email inválido");
      } else if (error.code === "auth/weak-password") {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }
      throw new Error("Error al crear la cuenta");
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    console.log("Google OAuth no implementado aún");
    return false;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const updateProfileUser = async (userData: Partial<User>) => {
    try {
      if (!firebaseUser || !user) return;
      const token = await firebaseUser.getIdToken();
      const updatedUser = await apiService.updateProfile(userData, token);
      setUser(updatedUser);
    } catch (error) {
      console.error("Profile update failed:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    firebaseUser,
    isLoading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateProfile: updateProfileUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
