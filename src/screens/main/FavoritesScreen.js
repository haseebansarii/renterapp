import React, { useState, useEffect } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const FavoritesScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  
  useEffect(() => {
    fetchFavorites();
  }, []);
  
  const fetchFavorites = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          car_id,
          created_at,
          cars:car_id (
            id,
            model,
            make,
            year,
            daily_rate,
            location,
            car_images (
              image_url,
              is_primary
            ),
            profiles:owner_id (
              full_name,
              rating
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Process car data to include primary image
      const processedFavorites = data.map(favorite => {
        const carImages = favorite.cars.car_images || [];
        const primaryImage = carImages.find(img => img.is_primary);
        const firstImage = carImages[0];
        
        return {
          ...favorite,
          cars: {
            ...favorite.cars,
            primary_image: primaryImage ? primaryImage.image_url : 
                          firstImage ? firstImage.image_url : null
          }
        };
      });
      
      setFavorites(processedFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert('Error', 'Failed to load favorites. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const removeFavorite = async (favoriteId) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);
        
      if (error) throw error;
      
      // Update local state
      setFavorites(prevFavorites => 
        prevFavorites.filter(favorite => favorite.id !== favoriteId)
      );
      
      Alert.alert('Success', 'Car removed from favorites.');
    } catch (error) {
      console.error('Error removing favorite:', error);
      Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
    }
  };
  
  const confirmRemove = (favoriteId, carModel) => {
    Alert.alert(
      'Remove from Favorites',
      `Are you sure you want to remove ${carModel} from your favorites?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          onPress: () => removeFavorite(favoriteId),
          style: 'destructive'
        }
      ]
    );
  };
  
  const handleCarPress = (carId) => {
    navigation.navigate('CarDetails', { carId });
  };
  
  const renderFavoriteItem = ({ item }) => {
    const car = item.cars;
    
    return (
      <TouchableOpacity
        style={styles.carCard}
        onPress={() => handleCarPress(car.id)}
      >
        <Image
          source={
            car.primary_image
              ? { uri: car.primary_image }
              : carPlaceholder
          }
          style={styles.carImage}
          resizeMode="cover"
        />
        
        <View style={styles.favoriteButton}>
          <TouchableOpacity
            onPress={() => confirmRemove(item.id, car.model)}
            style={styles.favoriteIconContainer}
          >
            <Ionicons name="heart" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.carInfo}>
          <View style={styles.carHeader}>
            <Text style={styles.carModel}>{car.model}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFC107" />
              <Text style={styles.ratingText}>
                {car.profiles.rating ? car.profiles.rating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>
          
          <Text style={styles.carMakeYear}>{car.make} • {car.year}</Text>
          
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={COLORS.textLight} />
            <Text style={styles.locationText} numberOfLines={1}>
              {car.location}
            </Text>
          </View>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceValue}>Rs. {car.daily_rate}</Text>
            <Text style={styles.priceLabel}>/day</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyList = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={50} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Favorites Yet</Text>
        <Text style={styles.emptyText}>
          Cars you add to favorites will appear here. Start browsing to find cars you like!
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseButtonText}>Browse Cars</Text>
        </TouchableOpacity>
      </View>
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
        <Text style={styles.headerTitle}>Favorites</Text>
        <View style={styles.placeholder} />
      </View>
      
      <FlatList
        data={favorites}
        renderItem={renderFavoriteItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshing={isLoading}
        onRefresh={fetchFavorites}
        showsVerticalScrollIndicator={false}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  carCard: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  carImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
  },
  favoriteIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.light,
  },
  carInfo: {
    padding: SPACING.md,
  },
  carHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
    color: COLORS.secondary,
    marginLeft: 2,
  },
  carMakeYear: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 4,
    flex: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  priceLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
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
    marginBottom: SPACING.lg,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
  },
  browseButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default FavoritesScreen;
