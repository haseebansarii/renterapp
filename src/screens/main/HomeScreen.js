import React, { useState, useEffect } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';
import avatarPlaceholder from '../../assets/avatar-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredCars, setFeaturedCars] = useState([]);
  const [popularCars, setPopularCars] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchFeaturedCars(),
        fetchPopularCars(),
        fetchCategories(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const fetchFeaturedCars = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select(`
          *,
          car_categories:category_id(name),
          cities:city_id(name),
          car_images(image_url, is_primary)
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(5);
        
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
      
      setFeaturedCars(processedCars);
    } catch (error) {
      console.error('Error fetching featured cars:', error);
    }
  };
  
  const fetchPopularCars = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select(`
          *,
          car_categories:category_id(name),
          cities:city_id(name),
          car_images(image_url, is_primary)
        `)
        .eq('is_available', true)
        .order('rating', { ascending: false })
        .limit(5);
        
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
      
      setPopularCars(processedCars);
    } catch (error) {
      console.error('Error fetching popular cars:', error);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('car_categories')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  
  const handleSearch = () => {
    navigation.navigate('Search', { initialQuery: searchQuery });
    setSearchQuery('');
  };
  
  const handleCategorySelect = (categoryId) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(categoryId);
      navigation.navigate('Search', { categoryId });
    }
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
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategory === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.selectedCategoryItem
        ]}
        onPress={() => handleCategorySelect(item.id)}
      >
        <Text 
          style={[
            styles.categoryText,
            isSelected && styles.selectedCategoryText
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{profile?.full_name || 'User'}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Image
              source={
                profile?.profile_image_url 
                  ? { uri: profile.profile_image_url } 
                  : avatarPlaceholder
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={COLORS.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for cars..."
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="options-outline" size={20} color={COLORS.background} />
          </TouchableOpacity>
        </View>
        
        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
        
        {/* Featured Cars */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Cars</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {featuredCars.length > 0 ? (
            <FlatList
              data={featuredCars}
              renderItem={renderCarItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No featured cars available</Text>
            </View>
          )}
        </View>
        
        {/* Popular Cars */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Cars</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {popularCars.length > 0 ? (
            <FlatList
              data={popularCars}
              renderItem={renderCarItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carsList}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No popular cars available</Text>
            </View>
          )}
        </View>
        
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl * 2,
    paddingBottom: SPACING.lg,
  },
  greeting: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  userName: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.inputBackground,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    height: 50,
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
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesContainer: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  categoriesList: {
    paddingHorizontal: SPACING.lg,
  },
  categoryItem: {
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginHorizontal: SPACING.xs,
  },
  selectedCategoryItem: {
    backgroundColor: COLORS.primary,
  },
  categoryText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    fontWeight: '500',
  },
  selectedCategoryText: {
    color: COLORS.background,
  },
  sectionContainer: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: SPACING.xl,
    marginBottom: SPACING.md,
  },
  seeAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  carsList: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  carCard: {
    width: 250,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginRight: SPACING.md,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  carImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
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
    fontSize: SIZES.md,
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
    flex: 1,
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
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  footer: {
    height: 20,
  },
});

export default HomeScreen;
