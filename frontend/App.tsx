// 👇 ESTE DEBE SER SIEMPRE EL PRIMER IMPORT
import 'react-native-reanimated';

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigation from './app/navigation/AppNavigation';

// Contextos globales
import { AuthProvider } from './app/context/AuthContext';
import { FavoritesProvider } from './app/context/FavoritesContext';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Proveedor de autenticación y favoritos */}
      <AuthProvider>
        <FavoritesProvider>
          {/* Navegación principal */}
          <NavigationContainer>
            <AppNavigation />
          </NavigationContainer>

          {/* Barra de estado */}
          <StatusBar style="auto" />
        </FavoritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
