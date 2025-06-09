import React, { useState, useEffect } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';
import avatarPlaceholder from '../../assets/avatar-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const ReviewsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { carId } = route.params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [car, setCar] = useState(null);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingCounts: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    }
  });
  
  useEffect(() => {
    fetchCarDetails();
    fetchReviews();
  }, [carId]);
  
  const fetchCarDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select(`
          id,
          model,
          rating,
          review_count,
          car_images(image_url, is_primary)
        `)
        .eq('id', carId)
        .single();
        
      if (error) throw error;
      
      // Process car images to get primary image
      const carImages = data.car_images || [];
      const primaryImage = carImages.find(img => img.is_primary);
      const firstImage = carImages[0];
      
      setCar({
        ...data,
        primary_image: primaryImage ? primaryImage.image_url : 
                       firstImage ? firstImage.image_url : null
      });
    } catch (error) {
      console.error('Error fetching car details:', error);
    }
  };
  
  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:reviewer_id(full_name, profile_image_url)
        `)
        .eq('car_id', carId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setReviews(data || []);
      
      // Calculate review statistics
      if (data && data.length > 0) {
        const totalReviews = data.length;
        const sumRatings = data.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = sumRatings / totalReviews;
        
        // Count reviews by rating
        const ratingCounts = {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0
        };
        
        data.forEach(review => {
          if (ratingCounts[review.rating] !== undefined) {
            ratingCounts[review.rating]++;
          }
        });
        
        setStats({
          averageRating,
          totalReviews,
          ratingCounts
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const renderRatingBar = (rating, count, total) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    
    return (
      <View style={styles.ratingBarContainer}>
        <Text style={styles.ratingBarLabel}>{rating}</Text>
        <View style={styles.ratingBarTrack}>
          <View 
            style={[
              styles.ratingBarFill,
              { width: `${percentage}%` }
            ]} 
          />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };
  
  const renderReviewItem = ({ item }) => {
    return (
      <View style={styles.reviewItem}>
        <View style={styles.reviewHeader}>
          <Image
            source={
              item.profiles?.profile_image_url
                ? { uri: item.profiles.profile_image_url }
                : avatarPlaceholder
            }
            style={styles.reviewerImage}
          />
          
          <View style={styles.reviewerInfo}>
            <Text style={styles.reviewerName}>{item.profiles?.full_name || 'Anonymous'}</Text>
            <Text style={styles.reviewDate}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
        
        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating ? "star" : "star-outline"}
              size={16}
              color={COLORS.warning}
              style={{ marginRight: 2 }}
            />
          ))}
        </View>
        
        <Text style={styles.reviewComment}>{item.comment}</Text>
      </View>
    );
  };
  
  const renderEmptyList = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="star-outline" size={60} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Reviews Yet</Text>
        <Text style={styles.emptyText}>
          This car hasn't received any reviews yet. Be the first to review after your rental!
        </Text>
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
        <Text style={styles.headerTitle}>Reviews</Text>
        <View style={styles.placeholder} />
      </View>
      
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListHeaderComponent={() => (
            <>
              {/* Car Info */}
              {car && (
                <View style={styles.carContainer}>
                  <Image
                    source={
                      car.primary_image
                        ? { uri: car.primary_image }
                        : carPlaceholder
                    }
                    style={styles.carImage}
                    resizeMode="cover"
                  />
                  <Text style={styles.carModel}>{car.model}</Text>
                </View>
              )}
              
              {/* Rating Summary */}
              <View style={styles.ratingSummaryContainer}>
                <View style={styles.averageRatingContainer}>
                  <Text style={styles.averageRatingValue}>
                    {stats.averageRating.toFixed(1)}
                  </Text>
                  <View style={styles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={
                          star <= Math.round(stats.averageRating)
                            ? "star"
                            : star - 0.5 <= stats.averageRating
                            ? "star-half"
                            : "star-outline"
                        }
                        size={16}
                        color={COLORS.warning}
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                  <Text style={styles.totalReviewsText}>
                    {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
                
                <View style={styles.ratingBarsContainer}>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <View key={rating}>
                      {renderRatingBar(
                        rating,
                        stats.ratingCounts[rating],
                        stats.totalReviews
                      )}
                    </View>
                  ))}
                </View>
              </View>
              
              {/* Reviews Header */}
              {reviews.length > 0 && (
                <Text style={styles.reviewsHeader}>
                  All Reviews ({reviews.length})
                </Text>
              )}
            </>
          )}
        />
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  carContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  carImage: {
    width: 150,
    height: 100,
    borderRadius: 10,
    marginBottom: SPACING.sm,
  },
  carModel: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  ratingSummaryContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.light,
  },
  averageRatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingRight: SPACING.md,
    marginRight: SPACING.md,
    width: 100,
  },
  averageRatingValue: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  totalReviewsText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  ratingBarsContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ratingBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  ratingBarLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    width: 15,
    marginRight: SPACING.sm,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 3,
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    width: 25,
    textAlign: 'right',
    marginLeft: SPACING.sm,
  },
  reviewsHeader: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  reviewItem: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
  },
  reviewHeader: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  reviewerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  reviewerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  reviewerName: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
  },
  reviewDate: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  reviewComment: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
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
});

export default ReviewsScreen;
