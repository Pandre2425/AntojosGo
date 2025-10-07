import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { apiService, Restaurant } from "../services/api";

// ✅ Importamos los tipos de navegación
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigation";

// ✅ Creamos el tipo de navegación específico
type RestaurantListNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "RestaurantDetail"
>;

export default function RestaurantListScreen() {
  // ✅ Aplicamos el tipo a useNavigation()
  const navigation = useNavigation<RestaurantListNavigationProp>();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCuisine, setSelectedCuisine] = useState("all");

  useEffect(() => {
    loadRestaurants();
  }, []);

  useEffect(() => {
    filterRestaurants();
  }, [searchQuery, selectedCuisine, restaurants]);

  const loadRestaurants = async () => {
    try {
      setIsLoading(true);
      const data = await apiService.getRestaurants();
      setRestaurants(data);
    } catch (error) {
      console.error("Error loading restaurants:", error);
      Alert.alert("Error", "No se pudieron cargar los restaurantes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterRestaurants = () => {
    let filtered = restaurants;

    if (selectedCuisine !== "all") {
      filtered = filtered.filter(
        (r) => r.cuisineType.toLowerCase() === selectedCuisine
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.cuisineType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredRestaurants(filtered);
  };

  const cuisineTypes = [
    { id: "all", label: "Todos" },
    { id: "mexican", label: "Mexicana" },
    { id: "italian", label: "Italiana" },
    { id: "fast-food", label: "Rápida" },
    { id: "coffee", label: "Café" },
    { id: "asian", label: "Asiática" },
  ];

  // ✅ Corrección principal: eliminamos 'as never'
  const handleRestaurantPress = (restaurant: Restaurant) => {
    navigation.navigate("RestaurantDetail", { restaurant });
  };

  const renderRestaurantItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.restaurantCard}
      onPress={() => handleRestaurantPress(item)}
    >
      <View style={styles.restaurantImage}>
        <Ionicons name="restaurant" size={32} color="#FF6600" />
      </View>

      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantHeader}>
          <Text style={styles.restaurantName}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>
        </View>

        <Text style={styles.restaurantDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.restaurantMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color="#666" />
            <Text style={styles.metaText} numberOfLines={1}>
              {item.address}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="#666" />
            <Text style={styles.metaText}>{item.hours}</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.priceRange}>{item.priceRange}</Text>
            <Text style={styles.cuisineType}>{item.cuisineType}</Text>
          </View>
        </View>
      </View>

      <View style={styles.restaurantActions}>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </View>
    </TouchableOpacity>
  );

  const renderCuisineFilter = ({
    item,
  }: {
    item: { id: string; label: string };
  }) => (
    <TouchableOpacity
      style={[
        styles.cuisineButton,
        selectedCuisine === item.id && styles.cuisineButtonActive,
      ]}
      onPress={() => setSelectedCuisine(item.id)}
    >
      <Text
        style={[
          styles.cuisineButtonText,
          selectedCuisine === item.id && styles.cuisineButtonTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Restaurantes</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar restaurantes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle-outline" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Cuisine Filters */}
      <View style={styles.filtersSection}>
        <FlatList
          data={cuisineTypes}
          renderItem={renderCuisineFilter}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        />
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>
          {filteredRestaurants.length} restaurante
          {filteredRestaurants.length !== 1 ? "s" : ""} encontrado
          {filteredRestaurants.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Restaurants List */}
      <FlatList
        data={filteredRestaurants}
        renderItem={renderRestaurantItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={isLoading}
        onRefresh={loadRestaurants}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No hay restaurantes</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedCuisine !== "all"
                  ? "Intenta ajustar tus filtros de búsqueda"
                  : "No se encontraron restaurantes en esta área"}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  filtersSection: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 16,
  },
  filtersContainer: {
    paddingHorizontal: 20,
  },
  cuisineButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  cuisineButtonActive: {
    backgroundColor: '#FF6600',
  },
  cuisineButtonText: {
    fontSize: 14,
    color: '#666',
  },
  cuisineButtonTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  restaurantCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  restaurantImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  restaurantInfo: {
    flex: 1,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
  },
  restaurantDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  restaurantMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  priceRange: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  cuisineType: {
    fontSize: 12,
    color: '#FF6600',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  restaurantActions: {
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});