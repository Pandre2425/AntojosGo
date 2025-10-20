import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { apiService, Restaurant, MenuItem } from '../services/api';

interface RouteParams {
  restaurant?: Restaurant;
  restaurantId?: string;
}

export default function RestaurantDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RouteParams;
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(params?.restaurant || null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(!params?.restaurant);

  useEffect(() => {
    if (params?.restaurantId && !params?.restaurant) {
      loadRestaurantDetails(params.restaurantId);
    }
  }, [params]);

  const loadRestaurantDetails = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await apiService.getRestaurantById(id);
      setRestaurant(data);
    } catch (error) {
      console.error('Error loading restaurant details:', error);
      Alert.alert('Error', 'No se pudieron cargar los detalles del restaurante');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Cargando detalles del restaurante...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categories = ['all', ...Array.from(new Set(restaurant.menu.map(item => item.category)))];
  const filteredMenu = selectedCategory === 'all' 
    ? restaurant.menu 
    : restaurant.menu.filter(item => item.category === selectedCategory);

  const handleCall = () => {
    Linking.openURL(`tel:${restaurant.phone}`);
  };

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.latitude},${restaurant.longitude}`;
    Linking.openURL(url);
  };

  const renderMenuItem = (item: MenuItem) => (
    <View key={item.id} style={styles.menuItem}>
      <View style={styles.menuItemImage}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.menuImage} />
        ) : (
          <Ionicons name="restaurant" size={24} color="#FF6600" />
        )}
      </View>
      
      <View style={styles.menuItemInfo}>
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text style={styles.menuItemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        {item.ingredients.length > 0 && (
          <View style={styles.ingredientsContainer}>
            <Text style={styles.ingredientsLabel}>Ingredientes: </Text>
            <Text style={styles.ingredientsText}>{item.ingredients.join(', ')}</Text>
          </View>
        )}
        
        <Text style={styles.menuItemPrice}>${item.price}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction}>
            <Ionicons name="share-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Restaurant Image */}
        <View style={styles.imageContainer}>
          <View style={styles.restaurantImagePlaceholder}>
            <Ionicons name="restaurant" size={48} color="#FF6600" />
          </View>
        </View>

        {/* Restaurant Info */}
        <View style={styles.infoContainer}>
          <View style={styles.restaurantHeader}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.rating}>{restaurant.rating}</Text>
            </View>
          </View>
          
          <Text style={styles.cuisineType}>{restaurant.cuisineType}</Text>
          <Text style={styles.priceRange}>{restaurant.priceRange}</Text>
          
          <Text style={styles.description}>{restaurant.description}</Text>
          
          {/* Contact Info */}
          <View style={styles.contactSection}>
            <View style={styles.contactItem}>
              <Ionicons name="location-outline" size={20} color="#FF6600" />
              <Text style={styles.contactText}>{restaurant.address}</Text>
            </View>
            
            <View style={styles.contactItem}>
              <Ionicons name="time-outline" size={20} color="#FF6600" />
              <Text style={styles.contactText}>{restaurant.hours}</Text>
            </View>
            
            <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
              <Ionicons name="call-outline" size={20} color="#FF6600" />
              <Text style={[styles.contactText, styles.linkText]}>{restaurant.phone}</Text>
            </TouchableOpacity>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Llamar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleGetDirections}>
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menú</Text>
          
          {/* Category Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextActive
                ]}>
                  {category === 'all' ? 'Todos' : category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {filteredMenu.map(renderMenuItem)}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerAction: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollContainer: {
    flex: 1,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 16,
  },
  restaurantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rating: {
    marginLeft: 4,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  cuisineType: {
    fontSize: 16,
    color: '#FF6600',
    fontWeight: '600',
    marginBottom: 4,
  },
  priceRange: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  contactSection: {
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  linkText: {
    color: '#FF6600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6600',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  categoryButtonActive: {
    backgroundColor: '#FF6600',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  menuContainer: {
    gap: 16,
  },
  menuItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  menuItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  ingredientsLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  ingredientsText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  menuItemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6600',
  },
});