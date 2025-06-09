import React, { useState, useEffect } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const SearchScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { initialQuery, categoryId } = route.params || {};
  
  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [cars, setCars] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryId || null);
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [selectedTransmission, setSelectedTransmission] = useState(null);
  const [selectedFuelType, setSelectedFuelType] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  
  useEffect(() => {
    fetchCategories();
    fetchProvinces();
    
    if (initialQuery || categoryId) {
      handleSearch();
    }
  }, []);
  
  useEffect(() => {
    if (selectedProvince) {
      fetchCities(selectedProvince);
    } else {
      setCities([]);
      setSelectedCity(null);
    }
  }, [selectedProvince]);
  
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('car_categories')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  const fetchProvinces = async () => {
    try {
      const { data, error } = await supabase
        .from('provinces')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setProvinces(data || []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    }
  };
  
  const fetchCities = async (provinceId) => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('province_id', provinceId)
        .order('name');
        
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };
  
  const handleSearch = async () => {
    setIsLoading(true);
    
    try {
      let query = supabase
        .from('cars')
        .select(`
          *,
          car_categories:category_id(name),
          cities:city_id(name),
          provinces:province_id(name),
          car_images(image_url, is_primary)
        `)
        .eq('is_available', true);
      
      // Apply search query
      if (searchQuery) {
        query = query.ilike('model', `%${searchQuery}%`);
      }
      
      // Apply filters
      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }
      
      if (priceRange[0] > 0 || priceRange[1] < 20000) {
        query = query
          .gte('daily_price', priceRange[0])
          .lte('daily_price', priceRange[1]);
      }
      
      if (selectedTransmission) {
        query = query.eq('transmission', selectedTransmission);
      }
      
      if (selectedFuelType) {
        query = query.eq('fuel_type', selectedFuelType);
      }
      
      if (selectedSeats) {
        query = query.eq('seat_count', selectedSeats);
      }
      
      if (selectedProvince) {
        query = query.eq('province_id', selectedProvince);
      }
      
      if (selectedCity) {
        query = query.eq('city_id', selectedCity);
      }
      
      // Execute query
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process data to include primary image
      const processedCars = data.map(car => {
        const primaryImage = car.car_images.find(img => img.is_primary);
        const firstImage = car.car_images[0];
        
        return {
          ...car,
          primary_image: primaryImage ? primaryImage.image_url : 
                         firstImage ? firstImage.image_url : null
        };
      });
      
      setCars(processedCars);
    } catch (error) {
      console.error('Error searching cars:', error);
    } finally {
      setIsLoading(false);
      setIsFiltering(false);
    }
  };
  
  const handleFilterApply = () => {
    setShowFilters(false);
    setIsFiltering(true);
    handleSearch();
  };
  
  const handleFilterReset = () => {
    setSelectedCategory(null);
    setPriceRange([0, 20000]);
    setSelectedTransmission(null);
    setSelectedFuelType(null);
    setSelectedSeats(null);
    setSelectedProvince(null);
    setSelectedCity(null);
  };
  
  const handleCarPress = (car) => {
    navigation.navigate('CarDetails', { carId: car.id });
  };
  
  const renderCarItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.carCard}
        onPress={() => handleCarPress(item)}
      >
        <Image
          source={
            item.primary_image 
              ? { uri: item.primary_image } 
              : carPlaceholder
          }
          style={styles.carImage}
          resizeMode="cover"
        />
        
        <View style={styles.carInfo}>
          <View style={styles.carHeader}>
            <Text style={styles.carModel}>{item.model}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color={COLORS.warning} />
              <Text style={styles.ratingText}>
                {item.rating ? item.rating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.carCategory}>{item.car_categories?.name || 'Uncategorized'}</Text>
          
          <View style={styles.carLocation}>
            <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.cities?.name || 'Location not specified'}
            </Text>
          </View>
          
          <View style={styles.carFooter}>
            <Text style={styles.priceText}>
              <Text style={styles.priceValue}>Rs. {item.daily_price}</Text> / day
            </Text>
            
            <View style={styles.carFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="speedometer-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.featureText}>
                  {item.transmission === 'automatic' ? 'Auto' : 'Manual'}
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="people-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.featureText}>{item.seat_count}</Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderFilterModal = () => {
    return (
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Category</Text>
                <View style={styles.filterOptions}>
                  {categories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.filterChip,
                        selectedCategory === category.id && styles.selectedFilterChip
                      ]}
                      onPress={() => setSelectedCategory(
                        selectedCategory === category.id ? null : category.id
                      )}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedCategory === category.id && styles.selectedFilterChipText
                      ]}>
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Price Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Price Range (per day)</Text>
                <View style={styles.priceRangeContainer}>
                  <Text style={styles.priceRangeText}>
                    Rs. {priceRange[0]} - Rs. {priceRange[1]}
                  </Text>
                </View>
              </View>
              
              {/* Transmission Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Transmission</Text>
                <View style={styles.filterOptions}>
                  {['automatic', 'manual'].map((transmission) => (
                    <TouchableOpacity
                      key={transmission}
                      style={[
                        styles.filterChip,
                        selectedTransmission === transmission && styles.selectedFilterChip
                      ]}
                      onPress={() => setSelectedTransmission(
                        selectedTransmission === transmission ? null : transmission
                      )}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedTransmission === transmission && styles.selectedFilterChipText
                      ]}>
                        {transmission.charAt(0).toUpperCase() + transmission.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Fuel Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Fuel Type</Text>
                <View style={styles.filterOptions}>
                  {['petrol', 'diesel', 'hybrid', 'electric'].map((fuelType) => (
                    <TouchableOpacity
                      key={fuelType}
                      style={[
                        styles.filterChip,
                        selectedFuelType === fuelType && styles.selectedFilterChip
                      ]}
                      onPress={() => setSelectedFuelType(
                        selectedFuelType === fuelType ? null : fuelType
                      )}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedFuelType === fuelType && styles.selectedFilterChipText
                      ]}>
                        {fuelType.charAt(0).toUpperCase() + fuelType.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Seats Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Seats</Text>
                <View style={styles.filterOptions}>
                  {[2, 4, 5, 7].map((seats) => (
                    <TouchableOpacity
                      key={seats}
                      style={[
                        styles.filterChip,
                        selectedSeats === seats && styles.selectedFilterChip
                      ]}
                      onPress={() => setSelectedSeats(
                        selectedSeats === seats ? null : seats
                      )}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedSeats === seats && styles.selectedFilterChipText
                      ]}>
                        {seats}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Location Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterTitle}>Location</Text>
                
                <Text style={styles.filterSubtitle}>Province</Text>
                <View style={styles.filterOptions}>
                  {provinces.slice(0, 6).map((province) => (
                    <TouchableOpacity
                      key={province.id}
                      style={[
                        styles.filterChip,
                        selectedProvince === province.id && styles.selectedFilterChip
                      ]}
                      onPress={() => {
                        setSelectedProvince(
                          selectedProvince === province.id ? null : province.id
                        );
                        setSelectedCity(null);
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        selectedProvince === province.id && styles.selectedFilterChipText
                      ]}>
                        {province.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                
                {selectedProvince && cities.length > 0 && (
                  <>
                    <Text style={styles.filterSubtitle}>City</Text>
                    <View style={styles.filterOptions}>
                      {cities.slice(0, 6).map((city) => (
                        <TouchableOpacity
                          key={city.id}
                          style={[
                            styles.filterChip,
                            selectedCity === city.id && styles.selectedFilterChip
                          ]}
                          onPress={() => setSelectedCity(
                            selectedCity === city.id ? null : city.id
                          )}
                        >
                          <Text style={[
                            styles.filterChipText,
                            selectedCity === city.id && styles.selectedFilterChipText
                          ]}>
                            {city.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={handleFilterReset}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={handleFilterApply}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for cars..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoFocus={!initialQuery && !categoryId}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                handleSearch();
              }}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.background} />
        </TouchableOpacity>
      </View>
      
      {(isLoading || isFiltering) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {isFiltering ? 'Applying filters...' : 'Searching...'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {cars.length} {cars.length === 1 ? 'car' : 'cars'} found
            </Text>
          </View>
          
          {cars.length > 0 ? (
            <FlatList
              data={cars}
              renderItem={renderCarItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.carsList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="car-outline" size={60} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No cars found</Text>
              <Text style={styles.emptyText}>
                Try adjusting your search or filters to find what you're looking for.
              </Text>
            </View>
          )}
        </>
      )}
      
      {renderFilterModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
    ...SHADOWS.light,
  },
  backButton: {
    marginRight: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    height: 45,
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: SIZES.md,
    marginLeft: SPACING.sm,
  },
  filterButton: {
    backgroundColor: COLORS.primary,
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  resultsHeader: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  resultsText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  carsList: {
    padding: SPACING.lg,
  },
  carCard: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  carImage: {
    width: '100%',
    height: 180,
  },
  carInfo: {
    padding: SPACING.md,
  },
  carHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  carModel: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 2,
  },
  carCategory: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  carLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  locationText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  carFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  priceValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  carFeatures: {
    flexDirection: 'row',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  featureText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  modalContent: {
    padding: SPACING.lg,
  },
  filterSection: {
    marginBottom: SPACING.lg,
  },
  filterTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  filterSubtitle: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  selectedFilterChip: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  selectedFilterChipText: {
    color: COLORS.background,
    fontWeight: '500',
  },
  priceRangeContainer: {
    marginTop: SPACING.sm,
  },
  priceRangeText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  resetButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  applyButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default SearchScreen;
