import React, { useState, useEffect } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const WriteReviewScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { carId, ownerId, bookingId } = route.params;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [car, setCar] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  
  useEffect(() => {
    fetchCarDetails();
  }, []);
  
  const fetchCarDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select(`
          id,
          model,
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
      Alert.alert('Error', 'Failed to load car details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRatingPress = (value) => {
    setRating(value);
  };
  
  const validateForm = () => {
    if (rating === 0) {
      Alert.alert('Missing Information', 'Please select a rating.');
      return false;
    }
    
    if (!comment.trim()) {
      Alert.alert('Missing Information', 'Please enter a review comment.');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    try {
      // Check if review already exists
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', bookingId)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingReview) {
        // Update existing review
        const { error: updateError } = await supabase
          .from('reviews')
          .update({
            rating,
            comment,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReview.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new review
        const { error: insertError } = await supabase
          .from('reviews')
          .insert({
            car_id: carId,
            owner_id: ownerId,
            reviewer_id: user.id,
            booking_id: bookingId,
            rating,
            comment,
            created_at: new Date().toISOString()
          });
          
        if (insertError) throw insertError;
        
        // Update booking to mark that a review has been left
        await supabase
          .from('bookings')
          .update({ has_review: true })
          .eq('id', bookingId);
      }
      
      // Show success message and navigate back
      Alert.alert(
        'Review Submitted',
        'Thank you for your feedback!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Car Info */}
        <View style={styles.carContainer}>
          <Image
            source={
              car?.primary_image
                ? { uri: car.primary_image }
                : carPlaceholder
            }
            style={styles.carImage}
            resizeMode="cover"
          />
          <Text style={styles.carModel}>{car?.model}</Text>
        </View>
        
        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingLabel}>Rate your experience</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRatingPress(star)}
                disabled={isSaving}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={40}
                  color={star <= rating ? COLORS.warning : COLORS.textLight}
                  style={styles.starIcon}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {rating === 0 ? 'Tap to rate' :
             rating === 1 ? 'Poor' :
             rating === 2 ? 'Fair' :
             rating === 3 ? 'Good' :
             rating === 4 ? 'Very Good' :
             'Excellent'}
          </Text>
        </View>
        
        {/* Review Comment */}
        <View style={styles.commentContainer}>
          <Text style={styles.commentLabel}>Write your review</Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              placeholder="Share your experience with this car..."
              placeholderTextColor={COLORS.textLight}
              value={comment}
              onChangeText={setComment}
              multiline={true}
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>
        </View>
        
        {/* Tips */}
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Tips for a helpful review:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.tipText}>Share your experience with the car's condition and performance</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.tipText}>Mention any notable features or issues you encountered</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.tipText}>Share your experience with the car owner</Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={isSaving}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={styles.submitButtonText}>Submit Review</Text>
          )}
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
  content: {
    flex: 1,
  },
  carContainer: {
    alignItems: 'center',
    marginVertical: SPACING.lg,
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
  ratingContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  ratingLabel: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  starIcon: {
    marginHorizontal: 5,
  },
  ratingText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  commentContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  commentLabel: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  textAreaContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  textArea: {
    fontSize: SIZES.md,
    color: COLORS.text,
    minHeight: 120,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 76, 0, 0.1)',
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 10,
    marginBottom: SPACING.xl,
  },
  tipsTitle: {
    fontSize: SIZES.sm,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  tipText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.xs,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.top,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default WriteReviewScreen;
