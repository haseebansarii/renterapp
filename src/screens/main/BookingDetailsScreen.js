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
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const BookingDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId } = route.params;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  useEffect(() => {
    fetchBookingDetails();
  }, [bookingId]);
  
  const fetchBookingDetails = async () => {
    if (!user || !bookingId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          cars (
            id,
            model,
            daily_price,
            transmission,
            fuel_type,
            seat_count,
            car_categories (name),
            car_images (image_url, is_primary)
          ),
          profiles!owner_id (
            id,
            full_name,
            profile_image_url,
            phone_number,
            rating
          )
        `)
        .eq('id', bookingId)
        .eq('renter_id', user.id)
        .single();
        
      if (error) throw error;
      
      // Process car images to get primary image
      const carImages = data.cars.car_images || [];
      const primaryImage = carImages.find(img => img.is_primary);
      const firstImage = carImages[0];
      
      setBooking({
        ...data,
        car_primary_image: primaryImage ? primaryImage.image_url : 
                           firstImage ? firstImage.image_url : null
      });
    } catch (error) {
      console.error('Error fetching booking details:', error);
      Alert.alert('Error', 'Failed to load booking details. Please try again.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'confirmed':
        return COLORS.success;
      case 'completed':
        return COLORS.primary;
      case 'cancelled':
        return COLORS.error;
      default:
        return COLORS.textLight;
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Owner Confirmation';
      case 'confirmed':
        return 'Confirmed';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Payment Pending';
      case 'paid':
        return 'Paid';
      case 'refunded':
        return 'Refunded';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const handleCancelBooking = async () => {
    setIsCancelling(true);
    
    try {
      // Update booking status
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'renter'
        })
        .eq('id', bookingId)
        .eq('renter_id', user.id);
        
      if (error) throw error;
      
      // Create notification for owner
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.owner_id,
          title: 'Booking Cancelled',
          message: `The booking for your ${booking.cars.model} has been cancelled by the renter.`,
          type: 'booking_cancelled',
          related_id: bookingId,
          is_read: false
        });
      
      // Refresh booking details
      await fetchBookingDetails();
      
      Alert.alert(
        'Booking Cancelled',
        'Your booking has been successfully cancelled.'
      );
    } catch (error) {
      console.error('Error cancelling booking:', error);
      Alert.alert(
        'Error',
        'Failed to cancel booking. Please try again.'
      );
    } finally {
      setIsCancelling(false);
      setShowCancelModal(false);
    }
  };
  
  const handleContactOwner = () => {
    if (!booking || !booking.profiles) return;
    
    navigation.navigate('Chat', {
      recipientId: booking.owner_id,
      recipientName: booking.profiles.full_name,
      carId: booking.car_id
    });
  };
  
  const handleViewCar = () => {
    if (!booking || !booking.cars) return;
    
    navigation.navigate('CarDetails', { carId: booking.car_id });
  };
  
  const handleMakePayment = () => {
    if (!booking) return;
    
    navigation.navigate('Payment', { 
      bookingId: booking.id,
      amount: booking.total_price
    });
  };
  
  const handleWriteReview = () => {
    if (!booking) return;
    
    navigation.navigate('WriteReview', {
      carId: booking.car_id,
      ownerId: booking.owner_id,
      bookingId: booking.id
    });
  };
  
  const renderCancelModal = () => {
    return (
      <Modal
        visible={showCancelModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cancel Booking</Text>
              <TouchableOpacity onPress={() => setShowCancelModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Are you sure you want to cancel this booking?
              </Text>
              
              {booking && booking.status === 'confirmed' && (
                <Text style={styles.warningText}>
                  Note: Cancelling a confirmed booking may be subject to cancellation fees as per our policy.
                </Text>
              )}
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                <Text style={styles.cancelButtonText}>No, Keep It</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.confirmButtonText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
        <Text style={styles.errorText}>Booking not found or has been removed.</Text>
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
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Details</Text>
          <View style={styles.placeholder} />
        </View>
        
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
        </View>
        
        {/* Car Info */}
        <View style={styles.carInfoContainer}>
          <Image
            source={
              booking.car_primary_image
                ? { uri: booking.car_primary_image }
                : carPlaceholder
            }
            style={styles.carImage}
            resizeMode="cover"
          />
          
          <View style={styles.carDetails}>
            <Text style={styles.carModel}>{booking.cars.model}</Text>
            <Text style={styles.carCategory}>{booking.cars.car_categories?.name || 'Uncategorized'}</Text>
            
            <View style={styles.carFeatures}>
              <View style={styles.featureItem}>
                <Ionicons name="speedometer-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.featureText}>
                  {booking.cars.transmission ? booking.cars.transmission.charAt(0).toUpperCase() + booking.cars.transmission.slice(1) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="flash-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.featureText}>
                  {booking.cars.fuel_type ? booking.cars.fuel_type.charAt(0).toUpperCase() + booking.cars.fuel_type.slice(1) : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.featureItem}>
                <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
                <Text style={styles.featureText}>{booking.cars.seat_count || 'N/A'}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.viewCarButton}
              onPress={handleViewCar}
            >
              <Text style={styles.viewCarButtonText}>View Car</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Booking Details */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Booking Information</Text>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>{booking.id}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Booking Date</Text>
            <Text style={styles.detailValue}>{formatDateTime(booking.created_at)}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Start Date</Text>
            <Text style={styles.detailValue}>{formatDate(booking.start_date)}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>End Date</Text>
            <Text style={styles.detailValue}>{formatDate(booking.end_date)}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Pickup Location</Text>
            <Text style={styles.detailValue}>{booking.pickup_location}</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Dropoff Location</Text>
            <Text style={styles.detailValue}>{booking.dropoff_location}</Text>
          </View>
          
          {booking.special_requests && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Special Requests</Text>
              <Text style={styles.detailValue}>{booking.special_requests}</Text>
            </View>
          )}
          
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Payment Status</Text>
            <View style={[
              styles.paymentStatusBadge,
              { backgroundColor: booking.payment_status === 'paid' ? COLORS.success : COLORS.warning }
            ]}>
              <Text style={styles.paymentStatusText}>
                {getPaymentStatusText(booking.payment_status)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Price Details */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Price Details</Text>
          
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Daily Rate</Text>
            <Text style={styles.priceValue}>Rs. {booking.cars.daily_price}</Text>
          </View>
          
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Duration</Text>
            <Text style={styles.priceValue}>
              {Math.ceil((new Date(booking.end_date) - new Date(booking.start_date)) / (1000 * 60 * 60 * 24))} days
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>Rs. {booking.total_price}</Text>
          </View>
        </View>
        
        {/* Owner Details */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Car Owner</Text>
          
          <View style={styles.ownerCard}>
            <Image
              source={
                booking.profiles.profile_image_url
                  ? { uri: booking.profiles.profile_image_url }
                  : avatarPlaceholder
              }
              style={styles.ownerImage}
            />
            
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerName}>{booking.profiles.full_name}</Text>
              
              <View style={styles.ownerRating}>
                <Ionicons name="star" size={14} color={COLORS.warning} />
                <Text style={styles.ratingText}>
                  {booking.profiles.rating ? booking.profiles.rating.toFixed(1) : 'New'}
                </Text>
              </View>
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
        
        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {booking.status === 'pending' && (
            <TouchableOpacity
              style={styles.cancelBookingButton}
              onPress={() => setShowCancelModal(true)}
            >
              <Text style={styles.cancelBookingText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          
          {booking.status === 'confirmed' && booking.payment_status === 'pending' && (
            <TouchableOpacity
              style={styles.paymentButton}
              onPress={handleMakePayment}
            >
              <Text style={styles.paymentButtonText}>Make Payment</Text>
            </TouchableOpacity>
          )}
          
          {booking.status === 'confirmed' && booking.payment_status === 'paid' && (
            <TouchableOpacity
              style={styles.cancelBookingButton}
              onPress={() => setShowCancelModal(true)}
            >
              <Text style={styles.cancelBookingText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}
          
          {booking.status === 'completed' && !booking.has_review && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={handleWriteReview}
            >
              <Text style={styles.reviewButtonText}>Write a Review</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.footer} />
      </ScrollView>
      
      {renderCancelModal()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  placeholder: {
    width: 40,
  },
  statusBanner: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  carInfoContainer: {
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    borderRadius: 15,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  carImage: {
    width: '100%',
    height: 200,
  },
  carDetails: {
    padding: SPACING.md,
  },
  carModel: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  carCategory: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
  },
  carFeatures: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  viewCarButton: {
    backgroundColor: COLORS.inputBackground,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewCarButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  sectionContainer: {
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    marginTop: 0,
    padding: SPACING.lg,
    borderRadius: 15,
    ...SHADOWS.light,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    flex: 2,
    textAlign: 'right',
  },
  paymentStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  paymentStatusText: {
    fontSize: SIZES.xs,
    color: COLORS.background,
    fontWeight: '500',
  },
  priceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  priceLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  priceValue: {
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  totalValue: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    padding: SPACING.md,
  },
  ownerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  ownerInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  ownerName: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  ownerRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 4,
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
  actionsContainer: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  cancelBookingButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cancelBookingText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  paymentButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  paymentButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  reviewButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  reviewButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  footer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: COLORS.background,
    borderRadius: 15,
    ...SHADOWS.medium,
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
  modalText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  warningText: {
    fontSize: SIZES.sm,
    color: COLORS.error,
    fontStyle: 'italic',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default BookingDetailsScreen;
