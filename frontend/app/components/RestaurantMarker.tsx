import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant } from '../services/api';

interface RestaurantMarkerProps {
  restaurant: Restaurant;
}

export default function RestaurantMarker({ restaurant }: RestaurantMarkerProps) {
  return (
    <Marker
      coordinate={{
        latitude: restaurant.latitude || 19.4326, // Default to Mexico City if no coordinates
        longitude: restaurant.longitude || -99.1332,
      }}
      title={restaurant.name}
      description={restaurant.description}
    >
      <View style={styles.markerContainer}>
        <View style={styles.marker}>
          <Ionicons name="restaurant" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.markerTriangle} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#FF6600',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FF6600',
    marginTop: -1,
  },
});