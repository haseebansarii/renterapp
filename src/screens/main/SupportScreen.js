import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const SupportScreen = () => {
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const supportCategories = [
    { id: 'account', name: 'Account Issues', icon: 'person-circle-outline' },
    { id: 'booking', name: 'Booking Problems', icon: 'calendar-outline' },
    { id: 'payment', name: 'Payment Issues', icon: 'card-outline' },
    { id: 'car', name: 'Car Related', icon: 'car-outline' },
    { id: 'app', name: 'App Technical Issues', icon: 'phone-portrait-outline' },
    { id: 'other', name: 'Other', icon: 'help-circle-outline' },
  ];
  
  const faqs = [
    {
      id: '1',
      question: 'How do I book a car?',
      answer: 'To book a car, browse available cars on the home screen or search for specific cars. Select a car to view details, then tap "Book Now" to start the booking process. Follow the prompts to select dates, locations, and complete payment.'
    },
    {
      id: '2',
      question: 'How do I cancel a booking?',
      answer: 'You can cancel a booking by going to the Bookings tab, selecting the booking you want to cancel, and tapping the "Cancel Booking" button. Note that cancellation policies may apply depending on how close to the pickup date you cancel.'
    },
    {
      id: '3',
      question: 'What payment methods are accepted?',
      answer: 'We accept credit/debit cards, mobile wallets, and bank transfers. You can manage your payment methods in the Profile > Payment Methods section.'
    },
    {
      id: '4',
      question: 'What happens if the car is damaged during my rental?',
      answer: 'If the car is damaged during your rental period, report it immediately through the app. You may be responsible for damages up to the deductible amount specified in the rental terms.'
    },
    {
      id: '5',
      question: 'How do I contact the car owner?',
      answer: 'Once your booking is confirmed, you can chat with the car owner directly through the app. Go to your booking details and tap on the "Chat" button.'
    },
  ];
  
  const validateForm = () => {
    if (!selectedCategory) {
      Alert.alert('Missing Information', 'Please select a support category.');
      return false;
    }
    
    if (!subject.trim()) {
      Alert.alert('Missing Information', 'Please enter a subject for your support request.');
      return false;
    }
    
    if (!message.trim()) {
      Alert.alert('Missing Information', 'Please enter a message describing your issue.');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Create support ticket in database
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          category: selectedCategory,
          subject: subject,
          message: message,
          status: 'open',
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Reset form
      setSelectedCategory(null);
      setSubject('');
      setMessage('');
      
      // Show success message
      Alert.alert(
        'Support Request Submitted',
        'Your support request has been submitted successfully. Our team will get back to you soon.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error submitting support request:', error);
      Alert.alert('Error', 'Failed to submit support request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategory === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.selectedCategoryItem
        ]}
        onPress={() => setSelectedCategory(item.id)}
        disabled={isLoading}
      >
        <View style={[
          styles.categoryIconContainer,
          isSelected && styles.selectedCategoryIconContainer
        ]}>
          <Ionicons 
            name={item.icon} 
            size={24} 
            color={isSelected ? COLORS.background : COLORS.primary} 
          />
        </View>
        <Text style={[
          styles.categoryText,
          isSelected && styles.selectedCategoryText
        ]}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };
  
  const renderFaqItem = ({ item }) => {
    const [expanded, setExpanded] = useState(false);
    
    return (
      <TouchableOpacity
        style={styles.faqItem}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.faqHeader}>
          <Text style={styles.faqQuestion}>{item.question}</Text>
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.textLight} 
          />
        </View>
        
        {expanded && (
          <Text style={styles.faqAnswer}>{item.answer}</Text>
        )}
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <FlatList
            data={faqs}
            renderItem={renderFaqItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
        
        {/* Contact Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          
          <Text style={styles.formLabel}>Select Category</Text>
          <FlatList
            data={supportCategories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          />
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Subject</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter subject"
                placeholderTextColor={COLORS.textLight}
                value={subject}
                onChangeText={setSubject}
                editable={!isLoading}
              />
            </View>
          </View>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Message</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={COLORS.textLight}
                value={message}
                onChangeText={setMessage}
                multiline={true}
                numberOfLines={6}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Request</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Direct Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direct Contact</Text>
          
          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="call-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone Support</Text>
              <Text style={styles.contactValue}>+92 300 1234567</Text>
              <Text style={styles.contactHours}>Available 9 AM - 6 PM (Mon-Fri)</Text>
            </View>
          </View>
          
          <View style={styles.contactItem}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email Support</Text>
              <Text style={styles.contactValue}>support@carrentalapp.com</Text>
              <Text style={styles.contactHours}>Response within 24 hours</Text>
            </View>
          </View>
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
  section: {
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  faqItem: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.light,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    flex: 1,
  },
  faqAnswer: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  formLabel: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  categoriesContainer: {
    paddingVertical: SPACING.sm,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 100,
  },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedCategoryIconContainer: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  selectedCategoryText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  selectedCategoryItem: {
    opacity: 1,
  },
  inputField: {
    marginTop: SPACING.md,
  },
  inputLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  input: {
    fontSize: SIZES.md,
    color: COLORS.text,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  contactItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.light,
  },
  contactIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 76, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: SIZES.md,
    fontWeight: '500',
    color: COLORS.secondary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: SIZES.md,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: 2,
  },
  contactHours: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  footer: {
    height: 40,
  },
});

export default SupportScreen;
