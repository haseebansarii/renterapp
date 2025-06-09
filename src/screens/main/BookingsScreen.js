import React, { useState, useEffect } from 'react';
import carPlaceholder from '../../assets/car-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const BookingsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);
  
  const fetchBookings = async () => {
    if (!user) return;
    
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
            car_images (image_url, is_primary)
          ),
          profiles!owner_id (
            full_name,
            profile_image_url
          )
        `)
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Process data to include primary image
      const processedBookings = data.map(booking => {
        const carImages = booking.cars.car_images || [];
        const primaryImage = carImages.find(img => img.is_primary);
        const firstImage = carImages[0];
        
        return {
          ...booking,
          car_primary_image: primaryImage ? primaryImage.image_url : 
                             firstImage ? firstImage.image_url : null
        };
      });
      
      setBookings(processedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };
  
  const handleBookingPress = (booking) => {
    navigation.navigate('BookingDetails', { bookingId: booking.id });
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
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const getFilteredBookings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return bookings.filter(booking => {
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      
      if (activeTab === 'upcoming') {
        return (
          (booking.status === 'pending' || booking.status === 'confirmed') &&
          endDate >= today
        );
      } else if (activeTab === 'completed') {
        return (
          booking.status === 'completed' ||
          (booking.status === 'confirmed' && endDate < today)
        );
      } else if (activeTab === 'cancelled') {
        return booking.status === 'cancelled';
      }
      
      return true; // 'all' tab
    });
  };
  
  const renderBookingItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => handleBookingPress(item)}
      >
        <Image
          source={
            item.car_primary_image
              ? { uri: item.car_primary_image }
              : carPlaceholder
          }
          style={styles.carImage}
          resizeMode="cover"
        />
        
        <View style={styles.bookingInfo}>
          <View style={styles.bookingHeader}>
            <Text style={styles.carModel}>{item.cars.model}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.dateText}>
              {formatDate(item.start_date)} - {formatDate(item.end_date)}
            </Text>
          </View>
          
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={COLORS.textLight} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickup_location}
            </Text>
          </View>
          
          <View style={styles.bookingFooter}>
            <Text style={styles.priceText}>
              <Text style={styles.priceValue}>Rs. {item.total_price}</Text> total
            </Text>
            
            <TouchableOpacity style={styles.detailsButton}>
              <Text style={styles.detailsButtonText}>Details</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  const renderEmptyList = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="car-outline" size={60} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No bookings found</Text>
        <Text style={styles.emptyText}>
          {activeTab === 'upcoming'
            ? "You don't have any upcoming bookings. Browse cars to make a booking."
            : activeTab === 'completed'
            ? "You don't have any completed bookings yet."
            : activeTab === 'cancelled'
            ? "You don't have any cancelled bookings."
            : "You haven't made any bookings yet."}
        </Text>
        
        {activeTab === 'upcoming' && (
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.browseButtonText}>Browse Cars</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTabButton]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'upcoming' && styles.activeTabButtonText
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'completed' && styles.activeTabButton]}
          onPress={() => setActiveTab('completed')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'completed' && styles.activeTabButtonText
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'cancelled' && styles.activeTabButton]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'cancelled' && styles.activeTabButtonText
            ]}
          >
            Cancelled
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.activeTabButton]}
          onPress={() => setActiveTab('all')}
        >
          <Text
            style={[
              styles.tabButtonText,
              activeTab === 'all' && styles.activeTabButtonText
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={getFilteredBookings()}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl * 2,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
  },
  activeTabButtonText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl * 2,
  },
  bookingCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  carImage: {
    width: 120,
    height: '100%',
  },
  bookingInfo: {
    flex: 1,
    padding: SPACING.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  carModel: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: SIZES.xs,
    color: COLORS.background,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  dateText: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  locationText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    marginLeft: 4,
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  priceText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  priceValue: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    marginRight: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
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
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 10,
  },
  browseButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
});

export default BookingsScreen;
