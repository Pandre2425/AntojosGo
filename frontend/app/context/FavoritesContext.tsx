import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../services/api';

interface FavoritesContextType {
  favorites: Restaurant[];
  toggleFavorite: (restaurant: Restaurant) => void;
  removeFavorite: (restaurantId: string) => void;
  isFavorite: (restaurantId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

interface FavoritesProviderProps {
  children: ReactNode;
}

export const FavoritesProvider: React.FC<FavoritesProviderProps> = ({ children }) => {
  const [favorites, setFavorites] = useState<Restaurant[]>([]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favorites');
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const saveFavorites = async (newFavorites: Restaurant[]) => {
    try {
      await AsyncStorage.setItem('favorites', JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

  const toggleFavorite = (restaurant: Restaurant) => {
    let newFavorites: Restaurant[];
    
    if (favorites.some(fav => fav.id === restaurant.id)) {
      // Remove from favorites
      newFavorites = favorites.filter(fav => fav.id !== restaurant.id);
    } else {
      // Add to favorites
      newFavorites = [...favorites, restaurant];
    }
    
    saveFavorites(newFavorites);
  };

  const removeFavorite = (restaurantId: string) => {
    const newFavorites = favorites.filter(fav => fav.id !== restaurantId);
    saveFavorites(newFavorites);
  };

  const isFavorite = (restaurantId: string): boolean => {
    return favorites.some(fav => fav.id === restaurantId);
  };

  const value: FavoritesContextType = {
    favorites,
    toggleFavorite,
    removeFavorite,
    isFavorite
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};