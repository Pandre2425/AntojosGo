// frontend/app/screens/FavoritesScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack"; 
import { useFavorites } from "../context/FavoritesContext";

// Rutas que usas en tu stack/tab
type RootStackParamList = {
  HomeTab: undefined;
  RestaurantDetail: { restaurant: any };
};

// Tipo de navegación para esta pantalla
type FavoritesScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "RestaurantDetail"
>;

export default function FavoritesScreen() {
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { favorites, removeFavorite } = useFavorites();

  const handleRestaurantPress = (restaurant: any) => {
    navigation.navigate("RestaurantDetail", { restaurant });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Favoritos</Text>
        <Text style={styles.subtitle}>
          {favorites.length} restaurante
          {favorites.length !== 1 ? "s" : ""} guardado
          {favorites.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>No hay favoritos aún</Text>
            <Text style={styles.emptySubtitle}>
              Explora restaurantes y guarda tus favoritos aquí
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate("HomeTab")}
            >
              <Text style={styles.exploreButtonText}>
                Explorar Restaurantes
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          favorites.map((restaurant: any) => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.restaurantCard}
              onPress={() => handleRestaurantPress(restaurant)}
            >
              <View style={styles.restaurantImage}>
                <Ionicons name="restaurant" size={32} color="#FF6600" />
              </View>
              <View style={styles.restaurantInfo}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <Text style={styles.restaurantDescription} numberOfLines={2}>
                  {restaurant.description}
                </Text>
                <View style={styles.restaurantMeta}>
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.rating}>{restaurant.rating}</Text>
                  </View>
                  <Text style={styles.priceRange}>
                    {restaurant.priceRange}
                  </Text>
                  <Text style={styles.cuisineType}>
                    {restaurant.cuisineType}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.favoriteButton}
                onPress={() => removeFavorite(restaurant.id)}
              >
                <Ionicons name="heart" size={24} color="#FF6600" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  exploreButton: {
    backgroundColor: "#FF6600",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  exploreButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  restaurantCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  restaurantInfo: { flex: 1 },
  restaurantName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  restaurantDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  rating: { marginLeft: 4, fontSize: 14, color: "#333" },
  priceRange: { fontSize: 14, color: "#666", marginRight: 16 },
  cuisineType: {
    fontSize: 12,
    color: "#FF6600",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  favoriteButton: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
});
