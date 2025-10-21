import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert, Dimensions } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import * as Location from "expo-location";
import { MaterialIcons } from "@expo/vector-icons";
import { Restaurant, restaurantService } from "../../services/supabaseClient";

const { width, height } = Dimensions.get("window");

// Configura tu token de Mapbox (en .env o directo)
MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "YOUR_MAPBOX_ACCESS_TOKEN");

interface MapboxMapProps {
  restaurants?: Restaurant[];
  onRestaurantPress?: (restaurant: Restaurant) => void;
  showUserLocation?: boolean;
  style?: any;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  restaurants: propRestaurants,
  onRestaurantPress,
  showUserLocation = true,
  style,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

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
      console.error("Error loading restaurants:", error);
      Alert.alert("Error", "No se pudieron cargar los restaurantes");
    }
  };

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permisos requeridos", "Se necesita acceso a la ubicación para mostrar restaurantes cercanos");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(location);
    } catch (error) {
      console.error("Error getting user location:", error);
    }
  };

  const handleMarkerPress = (restaurant: Restaurant) => {
    if (onRestaurantPress) {
      onRestaurantPress(restaurant);
    }
  };

  const getMarkerIcon = (category: string): { name: string; color: string } => {
    const icons: { [key: string]: { name: string; color: string } } = {
      mexican: { name: "restaurant", color: "#FF6B35" },
      italian: { name: "local-pizza", color: "#4ECDC4" },
      "fast-food": { name: "fastfood", color: "#FFE66D" },
      asian: { name: "ramen-dining", color: "#FF6B6B" },
      desserts: { name: "cake", color: "#A8E6CF" },
      beverages: { name: "local-cafe", color: "#DCEDC8" },
    };
    return icons[category] || { name: "restaurant", color: "#6C5CE7" };
  };

  return (
    <View style={[styles.container, style]}>
      <MapboxGL.MapView
        style={styles.map}
        zoomEnabled
        logoEnabled={false}
        styleURL="mapbox://styles/mapbox/streets-v12"
      >
        {/* Posición del usuario */}
        {showUserLocation && (
          <MapboxGL.UserLocation
            visible
            showsUserHeadingIndicator={true}
            androidRenderMode="gps"
          />
        )}

        {/* Cámara centrada */}
        <MapboxGL.Camera
          zoomLevel={14}
          centerCoordinate={
            userLocation
              ? [userLocation.coords.longitude, userLocation.coords.latitude]
              : [-99.1332, 19.4326]
          }
          animationMode="flyTo"
          animationDuration={1000}
        />

        {/* Marcadores de restaurantes */}
        {restaurants.map((restaurant) => (
          <MapboxGL.PointAnnotation
            key={restaurant.id}
            id={restaurant.id.toString()}
            coordinate={[restaurant.coordinates.longitude, restaurant.coordinates.latitude]}
            onSelected={() => handleMarkerPress(restaurant)}
          >
            <View
              style={[
                styles.marker,
                { backgroundColor: getMarkerColor(restaurant.category || "default") },
              ]}
            />
          </MapboxGL.PointAnnotation>
        ))}
      </MapboxGL.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderColor: "#fff",
    borderWidth: 2,
  },
});

export default MapboxMap;
