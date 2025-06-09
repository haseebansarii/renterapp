import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const PaymentMethodsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // New card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  
  useEffect(() => {
    fetchPaymentMethods();
  }, []);
  
  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods. Please try again.');
    } finally {
      setIsLoading(false);
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
  
  const handleAddCard = async () => {
    if (!validateCardForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // If this is the first card or set as default, update existing default cards
      if (isDefault || paymentMethods.length === 0) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .eq('is_default', true);
      }
      
      // Add new card
      const { error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          card_type: getCardType(cardNumber),
          last_four: cardNumber.replace(/\s/g, '').slice(-4),
          cardholder_name: cardholderName,
          expiry_date: expiryDate,
          is_default: isDefault || paymentMethods.length === 0,
          is_deleted: false,
          created_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      // Reset form and close modal
      resetForm();
      setModalVisible(false);
      
      // Refresh payment methods
      fetchPaymentMethods();
      
      Alert.alert('Success', 'Payment method added successfully.');
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'Failed to add payment method. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSetDefault = async (id) => {
    try {
      // Update all cards to not default
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);
      
      // Set selected card as default
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh payment methods
      fetchPaymentMethods();
      
      Alert.alert('Success', 'Default payment method updated.');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to update default payment method. Please try again.');
    }
  };
  
  const handleDeleteCard = async (id) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_deleted: true })
        .eq('id', id);
        
      if (error) throw error;
      
      // Refresh payment methods
      fetchPaymentMethods();
      
      Alert.alert('Success', 'Payment method removed.');
    } catch (error) {
      console.error('Error removing payment method:', error);
      Alert.alert('Error', 'Failed to remove payment method. Please try again.');
    }
  };
  
  const confirmDelete = (id, lastFour) => {
    Alert.alert(
      'Remove Payment Method',
      `Are you sure you want to remove card ending in ${lastFour}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          onPress: () => handleDeleteCard(id),
          style: 'destructive'
        }
      ]
    );
  };
  
  const resetForm = () => {
    setCardNumber('');
    setCardholderName('');
    setExpiryDate('');
    setCvv('');
    setIsDefault(false);
  };
  
  const getCardType = (number) => {
    const firstDigit = number.replace(/\s/g, '').charAt(0);
    
    if (firstDigit === '4') return 'visa';
    if (firstDigit === '5') return 'mastercard';
    if (firstDigit === '3') return 'amex';
    if (firstDigit === '6') return 'discover';
    
    return 'unknown';
  };
  
  const renderCardIcon = (cardType) => {
    switch (cardType) {
      case 'visa':
        return <Ionicons name="card-outline" size={24} color={COLORS.primary} />;
      case 'mastercard':
        return <Ionicons name="card-outline" size={24} color="#EB001B" />;
      case 'amex':
        return <Ionicons name="card-outline" size={24} color="#006FCF" />;
      case 'discover':
        return <Ionicons name="card-outline" size={24} color="#FF6600" />;
      default:
        return <Ionicons name="card-outline" size={24} color={COLORS.primary} />;
    }
  };
  
  const renderPaymentMethodItem = ({ item }) => {
    return (
      <View style={styles.cardContainer}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTypeContainer}>
            {renderCardIcon(item.card_type)}
            <Text style={styles.cardType}>
              {item.card_type.charAt(0).toUpperCase() + item.card_type.slice(1)}
            </Text>
          </View>
          
          <View style={styles.cardActions}>
            {!item.is_default && (
              <TouchableOpacity
                style={styles.cardAction}
                onPress={() => handleSetDefault(item.id)}
              >
                <Text style={styles.setDefaultText}>Set Default</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.cardAction}
              onPress={() => confirmDelete(item.id, item.last_four)}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.cardDetails}>
          <Text style={styles.cardNumber}>•••• •••• •••• {item.last_four}</Text>
          <Text style={styles.cardholderName}>{item.cardholder_name}</Text>
          <Text style={styles.expiryDate}>Expires {item.expiry_date}</Text>
        </View>
        
        {item.is_default && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultText}>Default</Text>
          </View>
        )}
      </View>
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
        <Ionicons name="card-outline" size={50} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Payment Methods</Text>
        <Text style={styles.emptyText}>
          You haven't added any payment methods yet. Add a card to make booking payments easier.
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>Add Payment Method</Text>
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
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.placeholder} />
      </View>
      
      <FlatList
        data={paymentMethods}
        renderItem={renderPaymentMethodItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshing={isLoading}
        onRefresh={fetchPaymentMethods}
        showsVerticalScrollIndicator={false}
      />
      
      {paymentMethods.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color={COLORS.background} />
        </TouchableOpacity>
      )}
      
      {/* Add Card Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment Method</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
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
                style={styles.defaultOption}
                onPress={() => setIsDefault(!isDefault)}
              >
                <View style={[
                  styles.checkbox,
                  isDefault && styles.checkboxChecked
                ]}>
                  {isDefault && <Ionicons name="checkmark" size={16} color={COLORS.background} />}
                </View>
                <Text style={styles.defaultOptionText}>Set as default payment method</Text>
              </TouchableOpacity>
              
              <View style={styles.securityNote}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                <Text style={styles.securityText}>
                  Your payment information is secure. We use industry-standard encryption to protect your data.
                </Text>
              </View>
              
              <TouchableOpacity
                style={styles.addCardButton}
                onPress={handleAddCard}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.addCardButtonText}>Add Card</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    flexGrow: 1,
  },
  cardContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  cardTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardType: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginLeft: SPACING.xs,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAction: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  setDefaultText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
  },
  cardDetails: {
    marginTop: SPACING.xs,
  },
  cardNumber: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginBottom: 2,
  },
  cardholderName: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginBottom: 2,
  },
  expiryDate: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  defaultBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  defaultText: {
    fontSize: SIZES.xs,
    color: COLORS.background,
    fontWeight: 'bold',
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
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
  },
  addButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: SPACING.xl,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
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
    marginBottom: SPACING.md,
  },
  defaultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
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
  defaultOptionText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 76, 0, 0.1)',
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  securityText: {
    flex: 1,
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  addCardButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  addCardButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default PaymentMethodsScreen;
