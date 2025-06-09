import React, { useState, useEffect, useRef } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';
import avatarPlaceholder from '../../assets/avatar-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const { width } = Dimensions.get('window');

const CarDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { carId } = route.params;
  const { user, profile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [car, setCar] = useState(null);
  const [owner, setOwner] = useState(null);
  const [carImages, setCarImages] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [similarCars, setSimilarCars] = useState([]);
  
  const scrollViewRef = useRef(null);
  
  useEffect(() => {
    fetchCarDetails();
  }, [carId]);
  
  const fetchCarDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch car details
      const { data: carData, error: carError } = await supabase
        .from('cars')
        .select(`
          *,
          car_categories:category_id(name),
          cities:city_id(name),
          provinces:province_id(name)
        `)
        .eq('id', carId)
        .single();
        
      if (carError) throw carError;
      
      // Fetch car images
      const { data: imageData, error: imageError } = await supabase
        .from('car_images')
        .select('*')
        .eq('car_id', carId)
        .order('is_primary', { ascending: false });
        
      if (imageError) throw imageError;
      
      // Fetch owner details
      const { data: ownerData, error: ownerError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          profile_image_url,
          created_at,
          rating
        `)
        .eq('id', carData.owner_id)
        .single();
        
      if (ownerError) throw ownerError;
      
      // Fetch reviews
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:reviewer_id(full_name, profile_image_url)
        `)
        .eq('car_id', carId)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (reviewError) throw reviewError;
      
      // Check if car is available for booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('status')
        .eq('car_id', carId)
        .in('status', ['pending', 'confirmed'])
        .limit(1);
        
      if (bookingError) throw bookingError;
      
      // Fetch similar cars
      const { data: similarData, error: similarError } = await supabase
        .from('cars')
        .select(`
          id,
          model,
          daily_price,
          rating,
          car_categories:category_id(name),
          cities:city_id(name),
          car_images(image_url, is_primary)
        `)
        .eq('category_id', carData.category_id)
        .eq('is_available', true)
        .neq('id', carId)
        .limit(5);
        
      if (similarError) throw similarError;
      
      // Process similar cars to include primary image
      const processedSimilarCars = similarData.map(car => {
        const primaryImage = car.car_images.find(img => img.is_primary);
        const firstImage = car.car_images[0];
        
        return {
          ...car,
          primary_image: primaryImage ? primaryImage.image_url : 
                         firstImage ? firstImage.image_url : null
        };
      });
      
      setCar(carData);
      setCarImages(imageData);
      setOwner(ownerData);
      setReviews(reviewData);
      setIsAvailable(carData.is_available && bookingData.length === 0);
      setSimilarCars(processedSimilarCars);
      
      // Record car view in user's history
      if (user) {
        await supabase
          .from('user_car_views')
          .upsert({
            user_id: user.id,
            car_id: carId,
            viewed_at: new Date().toISOString()
          }, { onConflict: ['user_id', 'car_id'] });
      }
    } catch (error) {
      console.error('Error fetching car details:', error);
      Alert.alert('Error', 'Failed to load car details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImageChange = (index) => {
    setActiveImageIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true
    });
  };
  
  const handleBookNow = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to book this car.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    
    if (!isAvailable) {
      Alert.alert('Not Available', 'This car is currently not available for booking.');
      return;
    }
    
    navigation.navigate('BookingForm', { 
      carId: car.id,
      carModel: car.model,
      dailyPrice: car.daily_price,
      ownerId: car.owner_id
    });
  };
  
  const handleContactOwner = () => {
    if (!user) {
      Alert.alert(
        'Login Required',
        'You need to login to contact the owner.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }
    
    navigation.navigate('Chat', { 
      recipientId: car.owner_id,
      recipientName: owner.full_name,
      carId: car.id
    });
  };
  
  const handleSimilarCarPress = (similarCar) => {
    navigation.push('CarDetails', { carId: similarCar.id });
  };
  
  const renderSimilarCarItem = ({ item }) => {
    return (
      <TouchableOpacity 
        style={styles.similarCarCard}
        onPress={() => handleSimilarCarPress(item)}
      >
        <Image
          source={
            item.primary_image 
              ? { uri: item.primary_image } 
              : carPlaceholder
          }
          style={styles.similarCarImage}
          resizeMode="cover"
        />
        
        <View style={styles.similarCarInfo}>
          <Text style={styles.similarCarModel} numberOfLines={1}>{item.model}</Text>
          <Text style={styles.similarCarPrice}>Rs. {item.daily_price}/day</Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderReviewItem = ({ item }) => {
    return (
      <View style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <Image
            source={
              item.profiles.profile_image_url 
                ? { uri: item.profiles.profile_image_url } 
                : avatarPlaceholder
            }
            style={styles.reviewerImage}
          />
          
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>{item.profiles.full_name}</Text>
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= item.rating ? "star" : "star-outline"}
                  size={14}
                  color={COLORS.warning}
                  style={{ marginRight: 2 }}
                />
              ))}
              <Text style={styles.reviewDate}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.reviewContent}>{item.comment}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!car) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Car not found or has been removed.</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Car Images Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setActiveImageIndex(newIndex);
            }}
          >
            {carImages.length > 0 ? (
              carImages.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image.image_url }}
                  style={styles.carouselImage}
                  resizeMode="cover"
                />
              ))
            ) : (
              <Image
                source={carPlaceholder}
                style={styles.carouselImage}
                resizeMode="cover"
              />
            )}
          </ScrollView>
          
          <View style={styles.carouselIndicators}>
            {carImages.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  index === activeImageIndex && styles.activeIndicator
                ]}
                onPress={() => handleImageChange(index)}
              />
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.background} />
          </TouchableOpacity>
        </View>
        
        {/* Car Basic Info */}
        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.carTitle}>{car.model}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
              <Text style={styles.ratingText}>
                {car.rating ? car.rating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.locationText}>
              {car.cities?.name}, {car.provinces?.name}
            </Text>
          </View>
          
          <Text style={styles.priceText}>
            <Text style={styles.priceValue}>Rs. {car.daily_price}</Text> / day
          </Text>
          
          <View style={styles.availabilityBadge}>
            <Text style={styles.availabilityText}>
              {isAvailable ? 'Available Now' : 'Currently Unavailable'}
            </Text>
          </View>
        </View>
        
        {/* Car Features */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Car Features</Text>
          
          <View style={styles.featuresGrid}>
            <View style={styles.featureItem}>
              <Ionicons name="car-outline" size={24} color={COLORS.primary} />
              <Text style={styles.featureLabel}>Type</Text>
              <Text style={styles.featureValue}>{car.car_categories?.name || 'N/A'}</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="speedometer-outline" size={24} color={COLORS.primary} />
              <Text style={styles.featureLabel}>Transmission</Text>
              <Text style={styles.featureValue}>
                {car.transmission ? car.transmission.charAt(0).toUpperCase() + car.transmission.slice(1) : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="flash-outline" size={24} color={COLORS.primary} />
              <Text style={styles.featureLabel}>Fuel Type</Text>
              <Text style={styles.featureValue}>
                {car.fuel_type ? car.fuel_type.charAt(0).toUpperCase() + car.fuel_type.slice(1) : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="people-outline" size={24} color={COLORS.primary} />
              <Text style={styles.featureLabel}>Seats</Text>
              <Text style={styles.featureValue}>{car.seat_count || 'N/A'}</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
              <Text style={styles.featureLabel}>Year</Text>
              <Text style={styles.featureValue}>{car.year || 'N/A'}</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Ionicons name="color-palette-outline" size={24} color={COLORS.primary} />
              <Text style={styles.featureLabel}>Color</Text>
              <Text style={styles.featureValue}>{car.color || 'N/A'}</Text>
            </View>
          </View>
        </View>
        
        {/* Car Description */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>
            {car.description || 'No description provided.'}
          </Text>
        </View>
        
        {/* Owner Info */}
        {owner && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Car Owner</Text>
            
            <View style={styles.ownerCard}>
              <Image
                source={
                  owner.profile_image_url 
                    ? { uri: owner.profile_image_url } 
                    : avatarPlaceholder
                }
                style={styles.ownerImage}
              />
              
              <View style={styles.ownerInfo}>
                <Text style={styles.ownerName}>{owner.full_name}</Text>
                <View style={styles.ownerRating}>
                  <Ionicons name="star" size={14} color={COLORS.warning} />
                  <Text style={styles.ownerRatingText}>
                    {owner.rating ? owner.rating.toFixed(1) : 'New'}
                  </Text>
                </View>
                <Text style={styles.ownerJoined}>
                  Member since {new Date(owner.created_at).toLocaleDateString()}
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.contactButton}
                onPress={handleContactOwner}
              >
                <Ionicons name="chatbubble-outline" size={18} color={COLORS.background} />
                <Text style={styles.contactButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Reviews */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Reviews', { carId: car.id })}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {reviews.length > 0 ? (
            <FlatList
              data={reviews}
              renderItem={renderReviewItem}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.reviewSeparator} />}
            />
          ) : (
            <Text style={styles.noReviewsText}>No reviews yet.</Text>
          )}
        </View>
        
        {/* Similar Cars */}
        {similarCars.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Similar Cars</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Search', { categoryId: car.category_id })}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={similarCars}
              renderItem={renderSimilarCarItem}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarCarsList}
            />
          </View>
        )}
        
        <View style={styles.footer} />
      </ScrollView>
      
      {/* Booking Action Button */}
      <View style={styles.actionContainer}>
        <View style={styles.actionPriceContainer}>
          <Text style={styles.actionPriceLabel}>Price</Text>
          <Text style={styles.actionPriceValue}>Rs. {car.daily_price}/day</Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.bookButton,
            !isAvailable && styles.disabledButton
          ]}
          onPress={handleBookNow}
          disabled={!isAvailable}
        >
          <Text style={styles.bookButtonText}>
            {isAvailable ? 'Book Now' : 'Not Available'}
          </Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontSize: SIZES.lg,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  backButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  carouselContainer: {
    position: 'relative',
    height: 250,
  },
  carouselImage: {
    width,
    height: 250,
  },
  carouselIndicators: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: COLORS.background,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  backIconButton: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  carTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  locationText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  priceText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  priceValue: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  availabilityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.success,
    borderRadius: 15,
  },
  availabilityText: {
    color: COLORS.background,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  sectionContainer: {
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  seeAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  featureLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
    marginBottom: 2,
  },
  featureValue: {
    fontSize: SIZES.md,
    color: COLORS.secondary,
    fontWeight: '500',
  },
  descriptionText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: SPACING.md,
    ...SHADOWS.light,
  },
  ownerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  ownerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  ownerName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  ownerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  ownerRatingText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  ownerJoined: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 20,
  },
  contactButtonText: {
    color: COLORS.background,
    fontSize: SIZES.sm,
    fontWeight: '500',
    marginLeft: 4,
  },
  reviewItem: {
    marginBottom: SPACING.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  reviewerName: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
  },
  reviewDate: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: SPACING.sm,
  },
  reviewContent: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  reviewSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  noReviewsText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  similarCarsList: {
    paddingRight: SPACING.md,
  },
  similarCarCard: {
    width: 150,
    marginRight: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    overflow: 'hidden',
    ...SHADOWS.light,
  },
  similarCarImage: {
    width: '100%',
    height: 100,
  },
  similarCarInfo: {
    padding: SPACING.sm,
  },
  similarCarModel: {
    fontSize: SIZES.sm,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  similarCarPrice: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  footer: {
    height: 80,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.top,
  },
  actionPriceContainer: {
    flex: 1,
  },
  actionPriceLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  actionPriceValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: COLORS.textLight,
  },
  bookButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default CarDetailsScreen;
