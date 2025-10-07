import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigation";
import { apiService, Restaurant } from '../services/api';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import RestaurantMarker from '../components/RestaurantMarker';

type HomeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "RestaurantDetail"
>;


export default function HomeScreen() {
  const { user, logout } = useAuth();
  const { toggleFavorite, isFavorite } = useFavorites();
  const navigation = useNavigation<HomeNavigationProp>();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    try {
      setIsLoading(true);
      // Mock data for now
      const mockData: Restaurant[] = [
        {
          id: '1',
          name: 'La Cocina de María',
          description: 'Auténtica comida mexicana casera con los mejores sabores tradicionales',
          address: 'Av. Insurgentes Sur 123, Roma Norte',
          latitude: 19.4326,
          longitude: -99.1332,
          cuisineType: 'Mexicana',
          rating: 4.5,
          priceRange: '$$',
          hours: 'Lun-Dom 9:00-22:00',
          phone: '+52 55 1234 5678',
          images: [],
          menu: []
        },
        {
          id: '2',
          name: 'Pasta & Basta',
          description: 'Deliciosa pasta italiana hecha con ingredientes frescos importados',
          address: 'Calle Orizaba 45, Roma Norte',
          latitude: 19.4350,
          longitude: -99.1300,
          cuisineType: 'Italiana',
          rating: 4.7,
          priceRange: '$$$',
          hours: 'Lun-Dom 12:00-23:00',
          phone: '+52 55 9876 5432',
          images: [],
          menu: []
        },
        {
          id: '3',
          name: 'Sushi Zen',
          description: 'Sushi fresco y rollos creativos en un ambiente moderno y elegante',
          address: 'Av. Álvaro Obregón 67, Roma Sur',
          latitude: 19.4280,
          longitude: -99.1280,
          cuisineType: 'Japonesa',
          rating: 4.6,
          priceRange: '$$$',
          hours: 'Mar-Dom 13:00-22:30',
          phone: '+52 55 5555 0123',
          images: [],
          menu: []
        },
        {
          id: '4',
          name: 'Burger House',
          description: 'Las mejores hamburguesas gourmet con ingredientes de primera calidad',
          address: 'Av. Cuauhtémoc 89, Doctores',
          latitude: 19.4200,
          longitude: -99.1350,
          cuisineType: 'Americana',
          rating: 4.2,
          priceRange: '$$',
          hours: 'Lun-Dom 11:00-24:00',
          phone: '+52 55 7777 8888',
          images: [],
          menu: []
        },
        {
          id: '5',
          name: 'Café Central',
          description: 'Café de especialidad, postres artesanales y ambiente acogedor',
          address: 'Calle Medellín 12, Roma Norte',
          latitude: 19.4340,
          longitude: -99.1320,
          cuisineType: 'Café',
          rating: 4.4,
          priceRange: '$',
          hours: 'Lun-Dom 7:00-20:00',
          phone: '+52 55 4444 3333',
          images: [],
          menu: []
        }
      ];
      setRestaurants(mockData);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      Alert.alert('Error', 'No se pudieron cargar los restaurantes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadRestaurants();
      return;
    }
    
    try {
      setIsLoading(true);
      const results = await apiService.searchRestaurants(searchQuery);
      setRestaurants(results);
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Error en la búsqueda');
    } finally {
      setIsLoading(false);
    }
  };

  const filterButtons = [
    { id: 'all', label: 'Todos', icon: 'restaurant-outline' },
    { id: 'Mexicana', label: 'Mexicana', icon: 'leaf-outline' },
    { id: 'Italiana', label: 'Italiana', icon: 'pizza-outline' },
    { id: 'Japonesa', label: 'Japonesa', icon: 'fish-outline' },
    { id: 'Americana', label: 'Americana', icon: 'fast-food-outline' },
    { id: 'Café', label: 'Café', icon: 'cafe-outline' },
  ];

  const filteredRestaurants = selectedFilter === 'all' 
    ? restaurants 
    : restaurants.filter(r => r.cuisineType === selectedFilter);

  const handleRestaurantPress = (restaurant: Restaurant) => {
  navigation.navigate("RestaurantDetail", { restaurant });
  };


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>¡Hola, {user?.name}!</Text>
          <Text style={styles.subtitle}>¿Qué se te antoja hoy?</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons name="person-outline" size={24} color="#FF6600" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar restaurantes, platillos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); loadRestaurants(); }}>
              <Ionicons name="close-circle-outline" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {filterButtons.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterButton,
              selectedFilter === filter.id && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Ionicons 
              name={filter.icon as any} 
              size={20} 
              color={selectedFilter === filter.id ? '#FFFFFF' : '#666'} 
            />
            <Text style={[
              styles.filterButtonText,
              selectedFilter === filter.id && styles.filterButtonTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleButton, showMap && styles.toggleButtonActive]}
          onPress={() => setShowMap(true)}
        >
          <Ionicons name="map-outline" size={16} color={showMap ? '#FFFFFF' : '#666'} />
          <Text style={[styles.toggleText, showMap && styles.toggleTextActive]}>Mapa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, !showMap && styles.toggleButtonActive]}
          onPress={() => setShowMap(false)}
        >
          <Ionicons name="list-outline" size={16} color={!showMap ? '#FFFFFF' : '#666'} />
          <Text style={[styles.toggleText, !showMap && styles.toggleTextActive]}>Lista</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {showMap ? (
          <MapView
            style={styles.mapView}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: 19.4326,
              longitude: -99.1332,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {filteredRestaurants.map((restaurant) => (
              <RestaurantMarker
                key={restaurant.id} 
                restaurant={restaurant}
              />
            ))}
          </MapView>
        ) : (
          <ScrollView style={styles.restaurantsList}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text>Cargando restaurantes...</Text>
              </View>
            ) : (
              filteredRestaurants.map((restaurant) => (
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
                      <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
                      <Text style={styles.cuisineType}>{restaurant.cuisineType}</Text>
                    </View>
                  </View>
                  <View style={styles.restaurantActions}>
                    <TouchableOpacity
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(restaurant)}
                    >
                      <Ionicons 
                        name={isFavorite(restaurant.id) ? "heart" : "heart-outline"} 
                        size={24} 
                        color={isFavorite(restaurant.id) ? "#FF6600" : "#666"} 
                      />
                    </TouchableOpacity>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Quick Actions FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("RestaurantOnboarding")}
      >
        <Ionicons name="restaurant" size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    padding: 8,
    marginRight: 8,
  },
  menuButton: {
    padding: 8,
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
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  filterButtonActive: {
    backgroundColor: '#FF6600',
  },
  filterButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  viewToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#FF6600',
  },
  toggleText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    marginHorizontal: 20,
  },
  mapView: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#999',
  },
  marker: {
    alignItems: 'center',
    marginTop: 20,
  },
  markerText: {
    fontSize: 12,
    color: '#FF6600',
    fontWeight: 'bold',
  },
  restaurantsList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  restaurantDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  restaurantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#333',
  },
  priceRange: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteButton: {
    padding: 8,
    marginRight: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6600',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});