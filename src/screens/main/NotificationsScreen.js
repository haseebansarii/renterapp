import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);
  
  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to new notifications
    const notificationsSubscription = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();
    
    return () => {
      notificationsSubscription.unsubscribe();
    };
  }, []);
  
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setNotifications(data || []);
      
      // Check if there are any unread notifications
      const unreadExists = data?.some(notification => !notification.is_read);
      setHasUnread(unreadExists);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const markAsRead = async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Check if there are still unread notifications
      const stillHasUnread = notifications.some(
        notification => notification.id !== notificationId && !notification.is_read
      );
      setHasUnread(stillHasUnread);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, is_read: true }))
      );
      
      setHasUnread(false);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  const deleteNotification = async (notificationId) => {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== notificationId)
      );
      
      // Check if there are still unread notifications
      const stillHasUnread = notifications.some(
        notification => notification.id !== notificationId && !notification.is_read
      );
      setHasUnread(stillHasUnread);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };
  
  const handleNotificationPress = async (notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'booking_request':
      case 'booking_accepted':
      case 'booking_rejected':
      case 'booking_completed':
      case 'booking_cancelled':
      case 'payment_received':
        navigation.navigate('BookingDetails', { bookingId: notification.related_id });
        break;
        
      case 'new_message':
        // Fetch conversation details
        try {
          const { data, error } = await supabase
            .from('messages')
            .select(`
              conversation_id,
              sender_id
            `)
            .eq('id', notification.related_id)
            .single();
            
          if (error) throw error;
          
          navigation.navigate('Chat', {
            recipientId: data.sender_id,
            conversationId: data.conversation_id
          });
        } catch (error) {
          console.error('Error navigating to chat:', error);
        }
        break;
        
      case 'new_review':
        navigation.navigate('CarDetails', { carId: notification.related_id });
        break;
        
      default:
        // For general notifications, do nothing special
        break;
    }
  };
  
  const confirmDelete = (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          onPress: () => deleteNotification(notificationId),
          style: 'destructive'
        }
      ]
    );
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInSecs < 60) {
      return 'Just now';
    } else if (diffInMins < 60) {
      return `${diffInMins} min${diffInMins > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };
  
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'booking_request':
        return <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />;
      case 'booking_accepted':
        return <Ionicons name="checkmark-circle-outline" size={24} color="#4CAF50" />;
      case 'booking_rejected':
        return <Ionicons name="close-circle-outline" size={24} color="#F44336" />;
      case 'booking_completed':
        return <Ionicons name="flag-outline" size={24} color="#4CAF50" />;
      case 'booking_cancelled':
        return <Ionicons name="ban-outline" size={24} color="#F44336" />;
      case 'payment_received':
        return <Ionicons name="cash-outline" size={24} color="#4CAF50" />;
      case 'new_message':
        return <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />;
      case 'new_review':
        return <Ionicons name="star-outline" size={24} color="#FFC107" />;
      default:
        return <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />;
    }
  };
  
  const renderNotificationItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.is_read && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationIcon}>
          {getNotificationIcon(item.type)}
        </View>
        
        <View style={styles.notificationContent}>
          <Text 
            style={[
              styles.notificationTitle,
              !item.is_read && styles.unreadText
            ]}
          >
            {item.title}
          </Text>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          <Text style={styles.notificationTime}>{formatTime(item.created_at)}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => confirmDelete(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color={COLORS.textLight} />
        </TouchableOpacity>
      </TouchableOpacity>
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
        <Ionicons name="notifications-off-outline" size={50} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Notifications</Text>
        <Text style={styles.emptyText}>
          You don't have any notifications yet. When you receive notifications, they will appear here.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {hasUnread && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshing={isLoading}
        onRefresh={fetchNotifications}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  markAllButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 76, 0, 0.1)',
  },
  markAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  unreadNotification: {
    backgroundColor: 'rgba(255, 76, 0, 0.05)',
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 76, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: SIZES.md,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  unreadText: {
    fontWeight: 'bold',
  },
  notificationMessage: {
    fontSize: SIZES.sm,
    color: COLORS.text,
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  deleteButton: {
    padding: SPACING.sm,
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
  },
});

export default NotificationsScreen;
