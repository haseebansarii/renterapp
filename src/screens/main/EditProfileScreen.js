import React, { useState, useEffect } from 'react';
import avatarPlaceholder from '../../assets/avatar-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { user, profile, updateProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cnic, setCnic] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhoneNumber(profile.phone_number || '');
      setCnic(profile.cnic || '');
      setProfileImage(profile.profile_image_url || null);
      setSelectedProvince(profile.province_id || null);
      setSelectedDistrict(profile.district_id || null);
      setSelectedCity(profile.city_id || null);
      
      fetchProvinces();
    }
  }, [profile]);
  
  useEffect(() => {
    if (selectedProvince) {
      fetchDistricts(selectedProvince);
    } else {
      setDistricts([]);
      setSelectedDistrict(null);
    }
  }, [selectedProvince]);
  
  useEffect(() => {
    if (selectedDistrict) {
      fetchCities(selectedDistrict);
    } else {
      setCities([]);
      setSelectedCity(null);
    }
  }, [selectedDistrict]);
  
  const fetchProvinces = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('provinces')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setProvinces(data || []);
    } catch (error) {
      console.error('Error fetching provinces:', error);
      Alert.alert('Error', 'Failed to load provinces. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchDistricts = async (provinceId) => {
    setIsLoading(true);
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
      Alert.alert('Error', 'Failed to load districts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCities = async (districtId) => {
    setIsLoading(true);
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
      Alert.alert('Error', 'Failed to load cities. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change profile picture.');
        return;
      }
      
      // Launch image picker
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
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const uploadProfileImage = async (uri) => {
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-images/${fileName}`;
      
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, blob);
        
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);
        
      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded image');
      }
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };
  
  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Information', 'Please enter your full name.');
      return false;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Missing Information', 'Please enter your phone number.');
      return false;
    }
    
    if (!cnic.trim()) {
      Alert.alert('Missing Information', 'Please enter your CNIC number.');
      return false;
    }
    
    if (!selectedProvince) {
      Alert.alert('Missing Information', 'Please select your province.');
      return false;
    }
    
    if (!selectedDistrict) {
      Alert.alert('Missing Information', 'Please select your district.');
      return false;
    }
    
    if (!selectedCity) {
      Alert.alert('Missing Information', 'Please select your city.');
      return false;
    }
    
    return true;
  };
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    
    try {
      let profileImageUrl = profile.profile_image_url;
      
      // If profile image has changed, upload the new one
      if (profileImage && profileImage !== profile.profile_image_url) {
        profileImageUrl = await uploadProfileImage(profileImage);
      }
      
      // Update profile in database
      const updatedProfile = {
        id: user.id,
        full_name: fullName,
        phone_number: phoneNumber,
        cnic: cnic,
        profile_image_url: profileImageUrl,
        province_id: selectedProvince,
        district_id: selectedDistrict,
        city_id: selectedCity,
        updated_at: new Date().toISOString()
      };
      
      await updateProfile(updatedProfile);
      
      Alert.alert(
        'Profile Updated',
        'Your profile has been updated successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
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
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Image */}
        <View style={styles.profileImageSection}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={handlePickImage}
            disabled={isLoading || isSaving}
          >
            <Image
              source={
                profileImage
                  ? { uri: profileImage }
                  : avatarPlaceholder
              }
              style={styles.profileImage}
            />
            <View style={styles.editImageButton}>
              <Ionicons name="camera" size={14} color={COLORS.background} />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Tap to change profile photo</Text>
        </View>
        
        {/* Form Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textLight}
                value={fullName}
                onChangeText={setFullName}
                editable={!isLoading && !isSaving}
              />
            </View>
          </View>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter your phone number"
                placeholderTextColor={COLORS.textLight}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                editable={!isLoading && !isSaving}
              />
            </View>
          </View>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>CNIC</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="card-outline" size={20} color={COLORS.textLight} />
              <TextInput
                style={styles.input}
                placeholder="Enter your CNIC number"
                placeholderTextColor={COLORS.textLight}
                value={cnic}
                onChangeText={setCnic}
                keyboardType="number-pad"
                editable={!isLoading && !isSaving}
              />
            </View>
          </View>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>Province</Text>
            <View style={styles.pickerContainer}>
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Picker
                  selectedValue={selectedProvince}
                  onValueChange={(itemValue) => setSelectedProvince(itemValue)}
                  enabled={!isLoading && !isSaving}
                  style={styles.picker}
                  dropdownIconColor={COLORS.textLight}
                >
                  <Picker.Item label="Select Province" value={null} color={COLORS.textLight} />
                  {provinces.map((province) => (
                    <Picker.Item 
                      key={province.id} 
                      label={province.name} 
                      value={province.id} 
                      color={COLORS.text}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>District</Text>
            <View style={styles.pickerContainer}>
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Picker
                  selectedValue={selectedDistrict}
                  onValueChange={(itemValue) => setSelectedDistrict(itemValue)}
                  enabled={!isLoading && !isSaving && selectedProvince !== null}
                  style={styles.picker}
                  dropdownIconColor={COLORS.textLight}
                >
                  <Picker.Item label="Select District" value={null} color={COLORS.textLight} />
                  {districts.map((district) => (
                    <Picker.Item 
                      key={district.id} 
                      label={district.name} 
                      value={district.id} 
                      color={COLORS.text}
                    />
                  ))}
                </Picker>
              )}
            </View>
          </View>
          
          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>City</Text>
            <View style={styles.pickerContainer}>
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Picker
                  selectedValue={selectedCity}
                  onValueChange={(itemValue) => setSelectedCity(itemValue)}
                  enabled={!isLoading && !isSaving && selectedDistrict !== null}
                  style={styles.picker}
                  dropdownIconColor={COLORS.textLight}
                >
                  <Picker.Item label="Select City" value={null} color={COLORS.textLight} />
                  {cities.map((city) => (
                    <Picker.Item 
                      key={city.id} 
                      label={city.name} 
                      value={city.id} 
                      color={COLORS.text}
                    />
                  ))}
                </Picker>
              )}
            </View>
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
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.background} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
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
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  changePhotoText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginTop: SPACING.sm,
  },
  formContainer: {
    padding: SPACING.lg,
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
    paddingVertical: SPACING.sm,
  },
  pickerContainer: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    justifyContent: 'center',
    height: 50,
  },
  picker: {
    color: COLORS.text,
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
  saveButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
