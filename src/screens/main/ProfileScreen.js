import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, profile, signOut, updateProfile } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [bookingsCount, setBookingsCount] = useState({
    total: 0,
    upcoming: 0,
    completed: 0
  });
  
  useEffect(() => {
    if (user) {
      fetchBookingsCount();
    }
  }, [user]);
  
  const fetchBookingsCount = async () => {
    try {
      // Get total bookings
      const { count: totalCount, error: totalError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', user.id);
        
      if (totalError) throw totalError;
      
      // Get upcoming bookings
      const today = new Date().toISOString();
      const { count: upcomingCount, error: upcomingError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .gte('end_date', today);
        
      if (upcomingError) throw upcomingError;
      
      // Get completed bookings
      const { count: completedCount, error: completedError } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('renter_id', user.id)
        .eq('status', 'completed');
        
      if (completedError) throw completedError;
      
      setBookingsCount({
        total: totalCount || 0,
        upcoming: upcomingCount || 0,
        completed: completedCount || 0
      });
    } catch (error) {
      console.error('Error fetching bookings count:', error);
    }
  };
  
  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };
  
  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };
  
  const handleViewBookings = () => {
    navigation.navigate('Bookings');
  };
  
  const handleViewFavorites = () => {
    navigation.navigate('Favorites');
  };
  
  const handleViewPaymentMethods = () => {
    navigation.navigate('PaymentMethods');
  };
  
  const handleContactSupport = () => {
    navigation.navigate('Support');
  };
  
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    } finally {
      setIsLoading(false);
      setShowLogoutModal(false);
    }
  };
  
  const handleProfileImageChange = async () => {
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
        setIsLoading(true);
        
        const imageUri = result.assets[0].uri;
        const fileExt = imageUri.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;
        
        // Convert image to blob
        const response = await fetch(imageUri);
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
        
        // Update profile with new image URL
        await updateProfile({
          ...profile,
          profile_image_url: publicUrlData.publicUrl
        });
        
        Alert.alert('Success', 'Profile picture updated successfully.');
      }
    } catch (error) {
      console.error('Error changing profile image:', error);
      Alert.alert('Error', 'Failed to update profile picture. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderLogoutModal = () => {
    return (
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Logout</Text>
              <TouchableOpacity onPress={() => setShowLogoutModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Are you sure you want to logout?
              </Text>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowLogoutModal(false)}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.background} />
                ) : (
                  <Text style={styles.logoutButtonText}>Logout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (!user || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.profileImageContainer}
            onPress={handleProfileImageChange}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <>
                <Image
                  source={
                    profile.profile_image_url
                      ? { uri: profile.profile_image_url }
                      : avatarPlaceholder
                  }
                  style={styles.profileImage}
                />
                <View style={styles.editImageButton}>
                  <Ionicons name="camera" size={14} color={COLORS.background} />
                </View>
              </>
            )}
          </TouchableOpacity>
          
          <Text style={styles.userName}>{profile.full_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={handleEditProfile}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        {/* Booking Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingsCount.total}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingsCount.upcoming}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bookingsCount.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
        
        {/* Profile Menu */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleViewBookings}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>My Bookings</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleViewFavorites}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Favorite Cars</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleViewPaymentMethods}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="card-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Payment Methods</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleChangePassword}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleContactSupport}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutMenuItem]}
            onPress={() => setShowLogoutModal(true)}
          >
            <View style={[styles.menuIconContainer, styles.logoutIconContainer]}>
              <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
            </View>
            <Text style={styles.logoutMenuText}>Logout</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
      
      {renderLogoutModal()}
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
  profileHeader: {
    alignItems: 'center',
    paddingTop: SPACING.xl * 2,
    paddingBottom: SPACING.xl,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.inputBackground,
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
  userName: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.md,
  },
  editProfileButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 15,
    padding: SPACING.md,
    ...SHADOWS.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  menuContainer: {
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.lg,
    borderRadius: 15,
    ...SHADOWS.light,
    marginBottom: SPACING.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuText: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.secondary,
  },
  logoutMenuItem: {
    borderBottomWidth: 0,
  },
  logoutIconContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
  },
  logoutMenuText: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.error,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  versionText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
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
    textAlign: 'center',
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
  logoutButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.md,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default ProfileScreen;
