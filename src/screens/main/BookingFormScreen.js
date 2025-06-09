import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const BookingFormScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { carId, carModel, dailyPrice, ownerId } = route.params;
  const { user, profile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000)); // Tomorrow
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [totalDays, setTotalDays] = useState(1);
  const [totalPrice, setTotalPrice] = useState(dailyPrice);
  const [unavailableDates, setUnavailableDates] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  useEffect(() => {
    fetchUnavailableDates();
  }, []);
  
  useEffect(() => {
    // Calculate total days and price when dates change
    const days = calculateDaysBetween(startDate, endDate);
    setTotalDays(days);
    setTotalPrice(days * dailyPrice);
  }, [startDate, endDate, dailyPrice]);
  
  const fetchUnavailableDates = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_date, end_date')
        .eq('car_id', carId)
        .in('status', ['pending', 'confirmed']);
        
      if (error) throw error;
      
      // Convert to Date objects
      const unavailable = [];
      data.forEach(booking => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        
        // Add all dates between start and end to unavailable array
        let current = new Date(start);
        while (current <= end) {
          unavailable.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }
      });
      
      setUnavailableDates(unavailable);
    } catch (error) {
      console.error('Error fetching unavailable dates:', error);
    }
  };
  
  const calculateDaysBetween = (start, end) => {
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1; // Minimum 1 day
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const isDateUnavailable = (date) => {
    return unavailableDates.some(unavailableDate => 
      date.getFullYear() === unavailableDate.getFullYear() &&
      date.getMonth() === unavailableDate.getMonth() &&
      date.getDate() === unavailableDate.getDate()
    );
  };
  
  const handleStartDateChange = (date) => {
    const currentDate = date;
    setShowStartDatePicker(false);
    
    // Ensure the selected date is not before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (currentDate < today) {
      Alert.alert('Invalid Date', 'Start date cannot be before today.');
      return;
    }
    
    // Check if the selected date is unavailable
    if (isDateUnavailable(currentDate)) {
      Alert.alert('Unavailable Date', 'This date is already booked. Please select another date.');
      return;
    }
    
    setStartDate(currentDate);
    
    // If end date is before start date, update end date
    if (endDate < currentDate) {
      const newEndDate = new Date(currentDate);
      newEndDate.setDate(currentDate.getDate() + 1);
      setEndDate(newEndDate);
    }
  };
  
  const handleEndDateChange = (date) => {
    const currentDate = date;
    setShowEndDatePicker(false);
    
    // Ensure the selected date is not before start date
    if (currentDate < startDate) {
      Alert.alert('Invalid Date', 'End date cannot be before start date.');
      return;
    }
    
    // Check if the selected date is unavailable
    if (isDateUnavailable(currentDate)) {
      Alert.alert('Unavailable Date', 'This date is already booked. Please select another date.');
      return;
    }
    
    // Check if any date between start and end is unavailable
    let current = new Date(startDate);
    while (current <= currentDate) {
      if (isDateUnavailable(current)) {
        Alert.alert('Unavailable Date Range', 'Some dates in your selected range are already booked. Please select another range.');
        return;
      }
      current.setDate(current.getDate() + 1);
    }
    
    setEndDate(currentDate);
  };
  
  const validateForm = () => {
    if (!pickupLocation.trim()) {
      Alert.alert('Missing Information', 'Please enter pickup location.');
      return false;
    }
    
    if (!dropoffLocation.trim()) {
      Alert.alert('Missing Information', 'Please enter dropoff location.');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setShowConfirmation(true);
  };
  
  const confirmBooking = async () => {
    setIsLoading(true);
    
    try {
      // Create booking in database
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          car_id: carId,
          renter_id: user.id,
          owner_id: ownerId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          pickup_location: pickupLocation,
          dropoff_location: dropoffLocation,
          special_requests: specialRequests,
          total_price: totalPrice,
          status: 'pending',
          payment_status: 'pending'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Create notification for owner
      await supabase
        .from('notifications')
        .insert({
          user_id: ownerId,
          title: 'New Booking Request',
          message: `${profile.full_name} has requested to book your ${carModel} from ${formatDate(startDate)} to ${formatDate(endDate)}.`,
          type: 'booking_request',
          related_id: data.id,
          is_read: false
        });
      
      // Navigate to booking confirmation screen
      navigation.navigate('BookingConfirmation', { 
        bookingId: data.id,
        carModel,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        totalPrice
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      Alert.alert('Booking Failed', 'There was an error creating your booking. Please try again.');
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };
  
  const renderConfirmationModal = () => {
    return (
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Booking</Text>
              <TouchableOpacity onPress={() => setShowConfirmation(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.confirmationText}>
                You are about to request a booking for:
              </Text>
              
              <Text style={styles.confirmationCarModel}>{carModel}</Text>
              
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Dates:</Text>
                <Text style={styles.confirmationValue}>
                  {formatDate(startDate)} - {formatDate(endDate)}
                </Text>
              </View>
              
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Duration:</Text>
                <Text style={styles.confirmationValue}>
                  {totalDays} {totalDays === 1 ? 'day' : 'days'}
                </Text>
              </View>
              
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Pickup:</Text>
                <Text style={styles.confirmationValue}>{pickupLocation}</Text>
              </View>
              
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Dropoff:</Text>
                <Text style={styles.confirmationValue}>{dropoffLocation}</Text>
              </View>
              
              <View style={styles.confirmationItem}>
                <Text style={styles.confirmationLabel}>Total Price:</Text>
                <Text style={styles.confirmationPrice}>Rs. {totalPrice}</Text>
              </View>
              
              <Text style={styles.confirmationNote}>
                Note: This is a booking request. The car owner will need to confirm your booking.
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowConfirmation(false)}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={confirmBooking}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Booking</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDatePicker = (date, onChange) => {
    const [year, setYear] = useState(date.getFullYear());
    const [month, setMonth] = useState(date.getMonth());
    const [day, setDay] = useState(date.getDate());

    const handleDateChange = () => {
      const newDate = new Date(year, month, day);
      onChange(newDate);
    };

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerRow}>
                  <Text style={styles.datePickerLabel}>Year:</Text>
                  <TextInput
                    style={styles.datePickerInput}
                    value={year.toString()}
                    onChangeText={(text) => setYear(parseInt(text))}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.datePickerRow}>
                  <Text style={styles.datePickerLabel}>Month:</Text>
                  <TextInput
                    style={styles.datePickerInput}
                    value={(month + 1).toString()}
                    onChangeText={(text) => setMonth(parseInt(text) - 1)}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.datePickerRow}>
                  <Text style={styles.datePickerLabel}>Day:</Text>
                  <TextInput
                    style={styles.datePickerInput}
                    value={day.toString()}
                    onChangeText={(text) => setDay(parseInt(text))}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={handleDateChange}
              >
                <Text style={styles.datePickerButtonText}>Select Date</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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
          <Text style={styles.headerTitle}>Book Your Car</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.carInfo}>
          <Text style={styles.carModel}>{carModel}</Text>
          <Text style={styles.carPrice}>Rs. {dailyPrice} / day</Text>
        </View>
        
        <View style={styles.formContainer}>
          {/* Date Selection */}
          <Text style={styles.sectionTitle}>Select Dates</Text>
          
          <View style={styles.dateContainer}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              {showStartDatePicker && renderDatePicker(startDate, handleStartDateChange)}
            </View>
            
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>End Date</Text>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              {showEndDatePicker && renderDatePicker(endDate, handleEndDateChange)}
            </View>
          </View>
          
          <View style={styles.durationContainer}>
            <Text style={styles.durationText}>
              Duration: {totalDays} {totalDays === 1 ? 'day' : 'days'}
            </Text>
          </View>
          
          {/* Pickup & Dropoff Locations */}
          <Text style={styles.sectionTitle}>Pickup & Dropoff</Text>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Pickup Location</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter pickup location"
                placeholderTextColor={COLORS.textLight}
                value={pickupLocation}
                onChangeText={setPickupLocation}
              />
            </View>
          </View>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Dropoff Location</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter dropoff location"
                placeholderTextColor={COLORS.textLight}
                value={dropoffLocation}
                onChangeText={setDropoffLocation}
              />
            </View>
          </View>
          
          {/* Special Requests */}
          <Text style={styles.sectionTitle}>Special Requests (Optional)</Text>
          
          <View style={styles.inputField}>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Any special requests or notes for the car owner?"
                placeholderTextColor={COLORS.textLight}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
          
          {/* Price Summary */}
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Price Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                Rs. {dailyPrice} x {totalDays} {totalDays === 1 ? 'day' : 'days'}
              </Text>
              <Text style={styles.summaryValue}>Rs. {totalPrice}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rs. {totalPrice}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.footerPriceContainer}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>Rs. {totalPrice}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.bookButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={styles.bookButtonText}>Request Booking</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {renderConfirmationModal()}
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
  carInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  carModel: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  carPrice: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  formContainer: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateField: {
    width: '48%',
  },
  dateLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  dateText: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  durationContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
  },
  durationText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
  },
  inputField: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : 0,
  },
  input: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    paddingVertical: Platform.OS === 'ios' ? 0 : SPACING.md,
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
    minHeight: 100,
  },
  summaryContainer: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: SPACING.lg,
    ...SHADOWS.light,
  },
  summaryTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  summaryValue: {
    fontSize: SIZES.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  totalLabel: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  totalValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.top,
  },
  footerPriceContainer: {
    flex: 1,
  },
  footerPriceLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  footerPriceValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  bookButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
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
  confirmationText: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  confirmationCarModel: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  confirmationItem: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  confirmationLabel: {
    width: 80,
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  confirmationValue: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  confirmationPrice: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  confirmationNote: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: SPACING.md,
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
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  datePickerContainer: {
    padding: SPACING.lg,
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  datePickerLabel: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  datePickerInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  datePickerButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  datePickerButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default BookingFormScreen;
