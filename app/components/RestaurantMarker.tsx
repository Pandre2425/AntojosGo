import React from "react";
import { View, Text, StyleSheet } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import { Restaurant } from "../services/api";

interface RestaurantMarkerProps {
  restaurant: Restaurant;
  onPress?: (restaurant: Restaurant) => void;
}

export default function RestaurantMarker({ restaurant, onPress }: RestaurantMarkerProps) {
  if (!restaurant?.coordinates) return null;

  const { latitude, longitude } = restaurant.coordinates;

  return (
    <MapboxGL.PointAnnotation
      id={restaurant.id.toString()}
      coordinate={[longitude, latitude]}
      onSelected={() => onPress && onPress(restaurant)}
    >
      <View style={styles.markerContainer}>
        <View style={styles.marker}>
          <Text style={styles.icon}>🍽</Text>
        </View>
        <View style={styles.markerTriangle} />
      </View>
    </MapboxGL.PointAnnotation>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
  },
  marker: {
    backgroundColor: "#FF6600",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF6600",
    marginTop: -1,
  },
  icon: {
    fontSize: 18,
    color: "#fff",
  },
});
