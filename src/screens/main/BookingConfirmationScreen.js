import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const BookingConfirmationScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId, carModel, startDate, endDate, totalPrice } = route.params;
  
  const handleViewBookings = () => {
    navigation.navigate('Bookings');
  };
  
  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.successIconContainer}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={60} color={COLORS.background} />
          </View>
        </View>
        
        <Text style={styles.successTitle}>Booking Requested!</Text>
        <Text style={styles.successMessage}>
          Your booking request has been sent to the car owner. You will be notified once they confirm your booking.
        </Text>
        
        <View style={styles.bookingDetailsCard}>
          <Text style={styles.bookingDetailsTitle}>Booking Details</Text>
          
          <View style={styles.bookingDetail}>
            <Text style={styles.detailLabel}>Booking ID:</Text>
            <Text style={styles.detailValue}>{bookingId}</Text>
          </View>
          
          <View style={styles.bookingDetail}>
            <Text style={styles.detailLabel}>Car:</Text>
            <Text style={styles.detailValue}>{carModel}</Text>
          </View>
          
          <View style={styles.bookingDetail}>
            <Text style={styles.detailLabel}>Dates:</Text>
            <Text style={styles.detailValue}>{startDate} - {endDate}</Text>
          </View>
          
          <View style={styles.bookingDetail}>
            <Text style={styles.detailLabel}>Total Price:</Text>
            <Text style={styles.detailValue}>Rs. {totalPrice}</Text>
          </View>
          
          <View style={styles.bookingDetail}>
            <Text style={styles.detailLabel}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Pending</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.nextStepsContainer}>
          <Text style={styles.nextStepsTitle}>What's Next?</Text>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Await Owner Confirmation</Text>
              <Text style={styles.stepDescription}>
                The car owner will review your booking request and confirm or decline it.
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Make Payment</Text>
              <Text style={styles.stepDescription}>
                Once confirmed, you'll need to make payment to secure your booking.
              </Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={styles.stepNumberContainer}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Pickup Car</Text>
              <Text style={styles.stepDescription}>
                On the start date, meet with the owner at the pickup location to get the car.
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.contactContainer}>
          <Text style={styles.contactTitle}>Need Help?</Text>
          <Text style={styles.contactDescription}>
            If you have any questions about your booking, you can chat with the car owner or contact our support team.
          </Text>
          
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => navigation.navigate('Support')}
          >
            <Ionicons name="help-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.viewBookingsButton}
          onPress={handleViewBookings}
        >
          <Text style={styles.viewBookingsText}>View My Bookings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={handleBackToHome}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
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
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: 100,
  },
  successIconContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  successTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  successMessage: {
    fontSize: SIZES.md,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  bookingDetailsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.light,
  },
  bookingDetailsTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  bookingDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  detailValue: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
  },
  statusBadge: {
    backgroundColor: COLORS.warning,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 15,
  },
  statusText: {
    color: COLORS.background,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  nextStepsContainer: {
    marginBottom: SPACING.xl,
  },
  nextStepsTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  stepNumberContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    marginTop: 2,
  },
  stepNumber: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    lineHeight: 20,
  },
  contactContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.light,
  },
  contactTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  contactDescription: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 10,
  },
  supportButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
    marginLeft: SPACING.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.top,
  },
  viewBookingsButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  viewBookingsText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  homeButton: {
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  homeButtonText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
});

export default BookingConfirmationScreen;
