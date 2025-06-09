import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const ProfileSetupScreen = () => {
  const navigation = useNavigation();
  const { user, updateProfile } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Location data
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [address, setAddress] = useState('');
  
  // Loading states
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    fetchProvinces();
  }, []);
  
  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince);
    } else {
      setDistricts([]);
      setSelectedDistrict('');
    }
  }, [selectedProvince]);
  
  useEffect(() => {
    if (selectedDistrict) {
      fetchCities(selectedDistrict);
    } else {
      setCities([]);
      setSelectedCity('');
    }
  }, [selectedDistrict]);

  const fetchProvinces = async () => {
    setLoadingProvinces(true);
    try {
      const { data, error } = await supabase
        .from('provinces')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setProvinces(data || []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      Alert.alert('Error', 'Failed to load provinces');
    } finally {
      setLoadingProvinces(false);
    }
  };
  
  const fetchDistricts = async (provinceId) => {
    setLoadingDistricts(true);
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('*')
        .eq('province_id', provinceId)
        .order('name');
        
      if (error) throw error;
      setDistricts(data || []);
    } catch (error) {
      console.error('Error fetching districts:', error);
      Alert.alert('Error', 'Failed to load districts');
    } finally {
      setLoadingDistricts(false);
    }
  };
  
  const fetchCities = async (districtId) => {
    setLoadingCities(true);
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('district_id', districtId)
        .order('name');
        
      if (error) throw error;
      setCities(data || []);
    } catch (error) {
      console.error('Error fetching cities:', error);
      Alert.alert('Error', 'Failed to load cities');
    } finally {
      setLoadingCities(false);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const validateForm = () => {
    let errors = {};
    
    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!cnic.trim()) {
      errors.cnic = 'CNIC is required';
    } else if (!/^\d{13}$/.test(cnic.replace(/[^0-9]/g, ''))) {
      errors.cnic = 'CNIC must be 13 digits';
    }
    
    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10,11}$/.test(phoneNumber.replace(/[^0-9]/g, ''))) {
      errors.phoneNumber = 'Enter a valid phone number';
    }
    
    if (!selectedProvince) {
      errors.province = 'Please select a province';
    }
    
    if (!selectedDistrict) {
      errors.district = 'Please select a district';
    }
    
    if (!selectedCity) {
      errors.city = 'Please select a city';
    }
    
    if (!address.trim()) {
      errors.address = 'Address is required';
    }
    
    if (!profileImage) {
      errors.profileImage = 'Profile image is required';
    }
    
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsLoading(true);
    try {
      let profileImageUrl = null;
      
      // Upload profile image if selected
      if (profileImage) {
        const fileExt = profileImage.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        
        // Convert uri to blob
        const response = await fetch(profileImage);
        const blob = await response.blob();
        
        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('profile_images')
          .upload(filePath, blob);
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: publicURL } = supabase.storage
          .from('profile_images')
          .getPublicUrl(filePath);
          
        profileImageUrl = publicURL.publicUrl;
      }
      
      // Update profile
      const { data, error } = await updateProfile({
        full_name: fullName,
        cnic: cnic,
        phone_number: phoneNumber,
        profile_image_url: profileImageUrl,
        province_id: selectedProvince,
        district_id: selectedDistrict,
        city_id: selectedCity,
        address: address,
        role: 'renter', // Set role as renter
      });
      
      if (error) throw error;
      
      // Navigate to phone verification
      navigation.navigate('VerifyPhone', { phoneNumber });
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Please provide your details to continue</Text>
          
          {/* Profile Image */}
          <View style={styles.imageContainer}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Ionicons name="person" size={40} color={COLORS.textLight} />
                  <Text style={styles.placeholderText}>Add Photo</Text>
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={18} color={COLORS.background} />
              </View>
            </TouchableOpacity>
            {errors.profileImage && <Text style={styles.errorText}>{errors.profileImage}</Text>}
          </View>
          
          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textLight}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            
            <Text style={styles.inputLabel}>CNIC *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your CNIC (13 digits)"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                value={cnic}
                onChangeText={setCnic}
                maxLength={13}
              />
            </View>
            {errors.cnic && <Text style={styles.errorText}>{errors.cnic}</Text>}
            
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={COLORS.textLight}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
            {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
          </View>
          
          {/* Location Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Information</Text>
            
            <Text style={styles.inputLabel}>Province *</Text>
            <View style={styles.pickerContainer}>
              {loadingProvinces ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Picker
                  selectedValue={selectedProvince}
                  onValueChange={(itemValue) => setSelectedProvince(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Province" value="" />
                  {provinces.map((province) => (
                    <Picker.Item 
                      key={province.id} 
                      label={province.name} 
                      value={province.id} 
                    />
                  ))}
                </Picker>
              )}
            </View>
            {errors.province && <Text style={styles.errorText}>{errors.province}</Text>}
            
            <Text style={styles.inputLabel}>District *</Text>
            <View style={styles.pickerContainer}>
              {loadingDistricts ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Picker
                  selectedValue={selectedDistrict}
                  onValueChange={(itemValue) => setSelectedDistrict(itemValue)}
                  style={styles.picker}
                  enabled={districts.length > 0}
                >
                  <Picker.Item label="Select District" value="" />
                  {districts.map((district) => (
                    <Picker.Item 
                      key={district.id} 
                      label={district.name} 
                      value={district.id} 
                    />
                  ))}
                </Picker>
              )}
            </View>
            {errors.district && <Text style={styles.errorText}>{errors.district}</Text>}
            
            <Text style={styles.inputLabel}>City *</Text>
            <View style={styles.pickerContainer}>
              {loadingCities ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Picker
                  selectedValue={selectedCity}
                  onValueChange={(itemValue) => setSelectedCity(itemValue)}
                  style={styles.picker}
                  enabled={cities.length > 0}
                >
                  <Picker.Item label="Select City" value="" />
                  {cities.map((city) => (
                    <Picker.Item 
                      key={city.id} 
                      label={city.name} 
                      value={city.id} 
                    />
                  ))}
                </Picker>
              )}
            </View>
            {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            
            <Text style={styles.inputLabel}>Address *</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your address"
                placeholderTextColor={COLORS.textLight}
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>
          
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.xl,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  imagePicker: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: SIZES.md,
    color: COLORS.text,
    marginBottom: SPACING.xs,
    marginTop: SPACING.sm,
  },
  inputContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.md,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
  },
  input: {
    color: COLORS.text,
    fontSize: SIZES.md,
  },
  textAreaContainer: {
    height: 100,
    paddingVertical: SPACING.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    height: 55,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    color: COLORS.text,
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default ProfileSetupScreen;
