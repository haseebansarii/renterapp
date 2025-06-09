import React, { useState, useEffect } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const PaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { bookingId, amount } = route.params;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [booking, setBooking] = useState(null);
  const [car, setCar] = useState(null);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  
  // New card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [showNewCardForm, setShowNewCardForm] = useState(false);
  
  useEffect(() => {
    fetchBookingDetails();
    fetchSavedCards();
  }, []);
  
  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          cars (
            id,
            model,
            car_images (image_url, is_primary)
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
      
      setBooking(data);
      setCar({
        ...data.cars,
        primary_image: primaryImage ? primaryImage.image_url : 
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
  
  const fetchSavedCards = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false);
        
      if (error) throw error;
      
      setSavedCards(data || []);
      
      // Select the first card by default if available
      if (data && data.length > 0) {
        setSelectedCardId(data[0].id);
      } else {
        setShowNewCardForm(true);
      }
    } catch (error) {
      console.error('Error fetching saved cards:', error);
    }
  };
  
  const formatCardNumber = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format with spaces after every 4 digits
    const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
    
    // Limit to 19 characters (16 digits + 3 spaces)
    return formatted.slice(0, 19);
  };
  
  const formatExpiryDate = (value) => {
    // Remove all non-digit characters
    const cleaned = value.replace(/\D/g, '');
    
    // Format as MM/YY
    if (cleaned.length > 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    
    return cleaned;
  };
  
  const validateCardForm = () => {
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
      return false;
    }
    
    if (!cardholderName.trim()) {
      Alert.alert('Missing Information', 'Please enter the cardholder name.');
      return false;
    }
    
    if (expiryDate.length !== 5) {
      Alert.alert('Invalid Date', 'Please enter a valid expiry date (MM/YY).');
      return false;
    }
    
    const [month, year] = expiryDate.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    if (
      parseInt(month) < 1 || 
      parseInt(month) > 12 || 
      parseInt(year) < currentYear || 
      (parseInt(year) === currentYear && parseInt(month) < currentMonth)
    ) {
      Alert.alert('Invalid Date', 'Please enter a valid future expiry date.');
      return false;
    }
    
    if (cvv.length !== 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid 3-digit CVV.');
      return false;
    }
    
    return true;
  };
  
  const handlePayment = async () => {
    if (showNewCardForm && !validateCardForm()) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // In a real app, this would integrate with a payment gateway
      // For this demo, we'll simulate a successful payment
      
      // If saving a new card
      if (showNewCardForm && saveCard) {
        await supabase
          .from('payment_methods')
          .insert({
            user_id: user.id,
            card_type: getCardType(cardNumber),
            last_four: cardNumber.replace(/\s/g, '').slice(-4),
            cardholder_name: cardholderName,
            expiry_date: expiryDate,
            is_default: savedCards.length === 0,
            is_deleted: false,
            created_at: new Date().toISOString()
          });
      }
      
      // Create payment record
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id: bookingId,
          user_id: user.id,
          amount: amount || booking.total_price,
          payment_method: showNewCardForm ? 'new_card' : 'saved_card',
          payment_method_id: showNewCardForm ? null : selectedCardId,
          status: 'completed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (paymentError) throw paymentError;
      
      // Update booking status
      await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          payment_id: paymentData.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      // Create notification for owner
      await supabase
        .from('notifications')
        .insert({
          user_id: booking.owner_id,
          title: 'Payment Received',
          message: `Payment for booking #${bookingId} has been received.`,
          type: 'payment_received',
          related_id: bookingId,
          is_read: false,
          created_at: new Date().toISOString()
        });
      
      // Navigate to success screen
      navigation.navigate('BookingDetails', { bookingId });
      
      // Show success message
      Alert.alert(
        'Payment Successful',
        'Your payment has been processed successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Payment Failed', 'There was an error processing your payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const getCardType = (number) => {
    const firstDigit = number.replace(/\s/g, '').charAt(0);
    
    if (firstDigit === '4') return 'visa';
    if (firstDigit === '5') return 'mastercard';
    if (firstDigit === '3') return 'amex';
    if (firstDigit === '6') return 'discover';
    
    return 'unknown';
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  const renderCardIcon = (cardType) => {
    switch (cardType) {
      case 'visa':
        return <Ionicons name="card-outline" size={24} color={COLORS.primary} />;
      case 'mastercard':
        return <Ionicons name="card-outline" size={24} color={COLORS.primary} />;
      case 'amex':
        return <Ionicons name="card-outline" size={24} color={COLORS.primary} />;
      case 'discover':
        return <Ionicons name="card-outline" size={24} color={COLORS.primary} />;
      default:
        return <Ionicons name="card-outline" size={24} color={COLORS.primary} />;
    }
  };
  
  const renderSavedCard = (card) => {
    const isSelected = selectedCardId === card.id;
    
    return (
      <TouchableOpacity
        key={card.id}
        style={[
          styles.savedCardContainer,
          isSelected && styles.selectedCardContainer
        ]}
        onPress={() => {
          setSelectedCardId(card.id);
          setShowNewCardForm(false);
        }}
      >
        <View style={styles.radioButton}>
          {isSelected && <View style={styles.radioButtonSelected} />}
        </View>
        
        <View style={styles.cardIconContainer}>
          {renderCardIcon(card.card_type)}
        </View>
        
        <View style={styles.cardDetails}>
          <Text style={styles.cardType}>
            {card.card_type.charAt(0).toUpperCase() + card.card_type.slice(1)}
          </Text>
          <Text style={styles.cardNumber}>•••• •••• •••• {card.last_four}</Text>
          <Text style={styles.cardExpiry}>Expires {card.expiry_date}</Text>
        </View>
      </TouchableOpacity>
    );
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
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Summary */}
        <View style={styles.bookingSummary}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingTitle}>Booking Summary</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BookingDetails', { bookingId })}>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>
          
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
            
            <View style={styles.carInfo}>
              <Text style={styles.carModel}>{car?.model}</Text>
              <Text style={styles.bookingDates}>
                {formatDate(booking?.start_date)} - {formatDate(booking?.end_date)}
              </Text>
            </View>
          </View>
          
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Total Amount</Text>
              <Text style={styles.priceValue}>Rs. {amount || booking?.total_price}</Text>
            </View>
          </View>
        </View>
        
        {/* Payment Method */}
        <View style={styles.paymentMethodSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          {/* Saved Cards */}
          {savedCards.length > 0 && (
            <View style={styles.savedCardsContainer}>
              {savedCards.map(renderSavedCard)}
            </View>
          )}
          
          {/* Add New Card Button */}
          <TouchableOpacity
            style={[
              styles.addCardButton,
              showNewCardForm && styles.selectedCardContainer
            ]}
            onPress={() => {
              setShowNewCardForm(true);
              setSelectedCardId(null);
            }}
          >
            <View style={styles.radioButton}>
              {showNewCardForm && <View style={styles.radioButtonSelected} />}
            </View>
            
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.addCardText}>Add New Card</Text>
          </TouchableOpacity>
          
          {/* New Card Form */}
          {showNewCardForm && (
            <View style={styles.newCardForm}>
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Card Number</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="card-outline" size={20} color={COLORS.textLight} />
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={COLORS.textLight}
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>
              </View>
              
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>Cardholder Name</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
                  <TextInput
                    style={styles.input}
                    placeholder="John Doe"
                    placeholderTextColor={COLORS.textLight}
                    value={cardholderName}
                    onChangeText={setCardholderName}
                  />
                </View>
              </View>
              
              <View style={styles.rowInputs}>
                <View style={[styles.inputField, { flex: 1, marginRight: SPACING.sm }]}>
                  <Text style={styles.inputLabel}>Expiry Date</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.textLight} />
                    <TextInput
                      style={styles.input}
                      placeholder="MM/YY"
                      placeholderTextColor={COLORS.textLight}
                      value={expiryDate}
                      onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
                
                <View style={[styles.inputField, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.textLight} />
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      placeholderTextColor={COLORS.textLight}
                      value={cvv}
                      onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 3))}
                      keyboardType="numeric"
                      maxLength={3}
                      secureTextEntry
                    />
                  </View>
                </View>
              </View>
              
              <TouchableOpacity
                style={styles.saveCardOption}
                onPress={() => setSaveCard(!saveCard)}
              >
                <View style={[
                  styles.checkbox,
                  saveCard && styles.checkboxChecked
                ]}>
                  {saveCard && <Ionicons name="checkmark" size={16} color={COLORS.background} />}
                </View>
                <Text style={styles.saveCardText}>Save this card for future payments</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* Payment Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
          <Text style={styles.securityText}>
            Your payment information is secure. We use industry-standard encryption to protect your data.
          </Text>
        </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>Rs. {amount || booking?.total_price}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.payButton}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={styles.payButtonText}>Pay Now</Text>
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
  bookingSummary: {
    backgroundColor: COLORS.card,
    margin: SPACING.lg,
    borderRadius: 15,
    padding: SPACING.md,
    ...SHADOWS.light,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  bookingTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  viewDetailsText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
  },
  carContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  carImage: {
    width: 80,
    height: 60,
    borderRadius: 10,
  },
  carInfo: {
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  carModel: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  bookingDates: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  priceBreakdown: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  priceLabel: {
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  priceValue: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  paymentMethodSection: {
    margin: SPACING.lg,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  savedCardsContainer: {
    marginBottom: SPACING.md,
  },
  savedCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  selectedCardContainer: {
    borderColor: COLORS.primary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  cardIconContainer: {
    marginRight: SPACING.md,
  },
  cardDetails: {
    flex: 1,
  },
  cardType: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
  },
  cardNumber: {
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  cardExpiry: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.light,
  },
  addCardText: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  newCardForm: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
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
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  saveCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  saveCardText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 76, 0, 0.1)',
    borderRadius: 10,
    padding: SPACING.md,
    margin: SPACING.lg,
    marginTop: 0,
  },
  securityText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    ...SHADOWS.top,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  totalAmount: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  payButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default PaymentScreen;
