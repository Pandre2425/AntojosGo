import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import MapboxGL from '@rnmapbox/maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

interface RestaurantData {
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  cuisineType: string;
  phone: string;
  hours: string;
  image?: string;
  menuItem?: {
    name: string;
    description: string;
    price: string;
  };
}

const cuisineTypes = [
  'Mexicana', 'Italiana', 'Asiática', 'Americana', 'Mediterránea',
  'Francesa', 'India', 'Japonesa', 'Árabe', 'Vegetariana', 'Otra'
];

export default function RestaurantOnboardingScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [restaurantData, setRestaurantData] = useState<RestaurantData>({
    name: '',
    description: '',
    address: '',
    latitude: 19.4326,
    longitude: -99.1332,
    cuisineType: '',
    phone: '',
    hours: '',
  });

  const [mapRegion, setMapRegion] = useState({
    latitude: 19.4326,
    longitude: -99.1332,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  const totalSteps = 4;

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesita acceso a la ubicación');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setMapRegion(newRegion);
      setRestaurantData(prev => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación actual');
    }
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setRestaurantData(prev => ({
      ...prev,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setRestaurantData(prev => ({
        ...prev,
        image: `data:image/jpeg;base64,${result.assets[0].base64}`,
      }));
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      'Registro Enviado',
      'Tu solicitud de registro ha sido enviada. Te contactaremos pronto para completar el proceso.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return restaurantData.name && restaurantData.description;
      case 2:
        return restaurantData.address && restaurantData.cuisineType;
      case 3:
        return restaurantData.phone && restaurantData.hours;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const { latitude, longitude } = restaurantData;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Información Básica</Text>
            
            <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
              {restaurantData.image ? (
                <View style={styles.imagePreview}>
                  <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                  <Text style={styles.imageText}>Logo seleccionado</Text>
                </View>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#999" />
                  <Text style={styles.imageText}>Subir logo/imagen</Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre del Restaurante *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: La Cocina de María"
                value={restaurantData.name}
                onChangeText={(text) => setRestaurantData(prev => ({ ...prev, name: text }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Descripción *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe tu restaurante..."
                value={restaurantData.description}
                onChangeText={(text) => setRestaurantData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Ubicación y Tipo</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Dirección *</Text>
              <TextInput
                style={styles.input}
                placeholder="Calle, número, colonia, ciudad"
                value={restaurantData.address}
                onChangeText={(text) => setRestaurantData(prev => ({ ...prev, address: text }))}
              />
            </View>

            <View style={styles.mapContainer}>
              <Text style={styles.label}>Ubicación en el Mapa</Text>
              <MapboxGL.MapView style={{ flex: 1 }}>
                <MapboxGL.Camera
                zoomLevel={14}
                centerCoordinate={[longitude, latitude]}
                />
                
                <MapboxGL.PointAnnotation
                id="selected-location"
                coordinate={[longitude, latitude]}
                >
                  <View style={styles.marker} />
                  </MapboxGL.PointAnnotation>
                </MapboxGL.MapView>
              
                <TouchableOpacity style={styles.locationButton} onPress={getCurrentLocation}>
                <Ionicons name="location" size={16} color="#FFFFFF" />
                <Text style={styles.locationButtonText}>Usar mi ubicación</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tipo de Cocina *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cuisineTypes.map((cuisine) => (
                  <TouchableOpacity
                    key={cuisine}
                    style={[
                      styles.cuisineChip,
                      restaurantData.cuisineType === cuisine && styles.cuisineChipSelected
                    ]}
                    onPress={() => setRestaurantData(prev => ({ ...prev, cuisineType: cuisine }))}
                  >
                    <Text style={[
                      styles.cuisineChipText,
                      restaurantData.cuisineType === cuisine && styles.cuisineChipTextSelected
                    ]}>
                      {cuisine}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Detalles de Contacto</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Teléfono *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: +52 55 1234 5678"
                value={restaurantData.phone}
                onChangeText={(text) => setRestaurantData(prev => ({ ...prev, phone: text }))}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Horarios de Atención *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Lun-Vie 9:00-22:00, Sáb-Dom 10:00-23:00"
                value={restaurantData.hours}
                onChangeText={(text) => setRestaurantData(prev => ({ ...prev, hours: text }))}
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Primer Platillo (Opcional)</Text>
            <Text style={styles.stepSubtitle}>
              Agrega un platillo destacado para atraer clientes
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre del Platillo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Tacos al Pastor"
                value={restaurantData.menuItem?.name || ''}
                onChangeText={(text) => setRestaurantData(prev => ({
                  ...prev,
                  menuItem: { ...prev.menuItem, name: text, description: prev.menuItem?.description || '', price: prev.menuItem?.price || '' }
                }))}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe los ingredientes y preparación..."
                value={restaurantData.menuItem?.description || ''}
                onChangeText={(text) => setRestaurantData(prev => ({
                  ...prev,
                  menuItem: { ...prev.menuItem, description: text, name: prev.menuItem?.name || '', price: prev.menuItem?.price || '' }
                }))}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: $45.00"
                value={restaurantData.menuItem?.price || ''}
                onChangeText={(text) => setRestaurantData(prev => ({
                  ...prev,
                  menuItem: { ...prev.menuItem, price: text, name: prev.menuItem?.name || '', description: prev.menuItem?.description || '' }
                }))}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Registrar Restaurante</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(step / totalSteps) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>Paso {step} de {totalSteps}</Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.nextButton, !isStepValid() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!isStepValid()}
          >
            <Text style={styles.nextButtonText}>
              {step === totalSteps ? 'Enviar Solicitud' : 'Siguiente'}
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6600',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imageContainer: {
    marginBottom: 20,
  },
  imagePlaceholder: {
    height: 120,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  imagePreview: {
    height: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  imageText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 20,
  },
  map: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6600',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  locationButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cuisineChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  cuisineChipSelected: {
    backgroundColor: '#FF6600',
    borderColor: '#FF6600',
  },
  cuisineChipText: {
    fontSize: 14,
    color: '#666',
  },
  cuisineChipTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6600',
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonDisabled: {
    backgroundColor: '#CCC',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
    marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6600',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  

});