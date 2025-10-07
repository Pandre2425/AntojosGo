import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

// Import context
import { AuthProvider } from './context/AuthContext';
import { FavoritesProvider } from './context/FavoritesContext';

// Import main app navigation
import AppNavigation from './navigation/AppNavigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoritesProvider>
          <AppNavigation />
          <StatusBar style="auto" />
        </FavoritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}