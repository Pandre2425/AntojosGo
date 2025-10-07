import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Restaurant, restaurantService } from '../../services/supabaseClient';

const { width, height } = Dimensions.get('window');

interface MapboxMapProps {
  restaurants?: Restaurant[];
  onRestaurantPress?: (restaurant: Restaurant) => void;
  initialRegion?: Region;
  showUserLocation?: boolean;
  style?: any;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  restaurants: propRestaurants,
  onRestaurantPress,
  initialRegion,
  showUserLocation = true,
  style
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState<Region>(
    initialRegion || {
      latitude: 19.4326, // Mexico City default
      longitude: -99.1332,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    }
  );

  useEffect(() => {
    if (propRestaurants) {
      setRestaurants(propRestaurants);
    } else {
      loadRestaurants();
    }
    
    if (showUserLocation) {
      getUserLocation();
    }
  }, [propRestaurants, showUserLocation]);

  const loadRestaurants = async () => {
    try {
      const restaurantData = await restaurantService.getAllRestaurants();
      setRestaurants(restaurantData);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      Alert.alert('Error', 'No se pudieron cargar los restaurantes');
    }
  };

  const getUserLocation = async () => {
    try {
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos requeridos',
          'Se necesita acceso a la ubicación para mostrar restaurantes cercanos'
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      setUserLocation(location);
      
      // Update map region to user's location
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const handleMarkerPress = (restaurant: Restaurant) => {
    if (onRestaurantPress) {
      onRestaurantPress(restaurant);
    }
  };

  const getMarkerColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      mexican: '#FF6B35',
      italian: '#4ECDC4',
      'fast-food': '#FFE66D',
      asian: '#FF6B6B',
      desserts: '#A8E6CF',
      beverages: '#DCEDC8',
    };
    return colors[category] || '#6C5CE7';
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={true}
        mapType="standard"
      >
        {/* Restaurant markers */}
        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.id}
            coordinate={{
              latitude: restaurant.coordinates.latitude,
              longitude: restaurant.coordinates.longitude,
            }}
            title={restaurant.name}
            description={restaurant.description}
            pinColor={getMarkerColor(restaurant.category)}
            onPress={() => handleMarkerPress(restaurant)}
          />
        ))}
        
        {/* User location marker (if available and showUserLocation is false) */}
        {!showUserLocation && userLocation && (
          <Marker
            coordinate={{
              latitude: userLocation.coords.latitude,
              longitude: userLocation.coords.longitude,
            }}
            title="Mi ubicación"
            pinColor="blue"
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default MapboxMap;