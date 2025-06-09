import React, { useState, useEffect } from 'react';
import avatarPlaceholder from '../../assets/avatar-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const ConversationsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  
  useEffect(() => {
    fetchConversations();
    
    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => {
        fetchConversations();
      })
      .subscribe();
    
    return () => {
      messagesSubscription.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = conversations.filter(
        conversation => 
          conversation.recipient_name.toLowerCase().includes(query) ||
          (conversation.car_model && conversation.car_model.toLowerCase().includes(query)) ||
          (conversation.last_message && conversation.last_message.toLowerCase().includes(query))
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);
  
  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      // Get all conversations where the user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          car_id,
          last_message,
          updated_at,
          cars:car_id (
            id,
            model,
            car_images (
              image_url,
              is_primary
            )
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      // Process conversations to get recipient details
      const conversationsWithRecipients = await Promise.all(
        data.map(async (conversation) => {
          // Determine recipient ID
          const recipientId = conversation.user1_id === user.id 
            ? conversation.user2_id 
            : conversation.user1_id;
          
          // Get recipient profile
          const { data: recipientData, error: recipientError } = await supabase
            .from('profiles')
            .select('id, full_name, profile_image_url')
            .eq('id', recipientId)
            .single();
            
          if (recipientError) {
            console.error('Error fetching recipient:', recipientError);
            return null;
          }
          
          // Get unread messages count
          const { data: unreadData, error: unreadError } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', conversation.id)
            .eq('receiver_id', user.id)
            .eq('is_read', false);
            
          if (unreadError) {
            console.error('Error fetching unread count:', unreadError);
            return null;
          }
          
          // Process car images to get primary image
          let carModel = null;
          let carImage = null;
          
          if (conversation.cars) {
            carModel = conversation.cars.model;
            
            const carImages = conversation.cars.car_images || [];
            const primaryImage = carImages.find(img => img.is_primary);
            const firstImage = carImages[0];
            
            carImage = primaryImage ? primaryImage.image_url : 
                      firstImage ? firstImage.image_url : null;
          }
          
          return {
            id: conversation.id,
            recipient_id: recipientId,
            recipient_name: recipientData.full_name,
            recipient_image: recipientData.profile_image_url,
            car_id: conversation.car_id,
            car_model: carModel,
            car_image: carImage,
            last_message: conversation.last_message,
            updated_at: conversation.updated_at,
            unread_count: unreadData.length
          };
        })
      );
      
      // Filter out null values (failed to fetch recipient)
      const validConversations = conversationsWithRecipients.filter(
        conversation => conversation !== null
      );
      
      setConversations(validConversations);
      setFilteredConversations(validConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleConversationPress = (conversation) => {
    navigation.navigate('Chat', {
      recipientId: conversation.recipient_id,
      recipientName: conversation.recipient_name,
      carId: conversation.car_id
    });
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      // Today: show time
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffInDays < 7) {
      // Within a week: show day name
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      // Older: show date
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };
  
  const renderConversationItem = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={
              item.recipient_image
                ? { uri: item.recipient_image }
                : avatarPlaceholder
            }
            style={styles.avatar}
          />
          {item.unread_count > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unread_count > 9 ? '9+' : item.unread_count}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text 
              style={[
                styles.recipientName,
                item.unread_count > 0 && styles.unreadText
              ]}
              numberOfLines={1}
            >
              {item.recipient_name}
            </Text>
            <Text style={styles.timeText}>{formatTime(item.updated_at)}</Text>
          </View>
          
          {item.car_model && (
            <View style={styles.carInfo}>
              <Ionicons name="car-outline" size={14} color={COLORS.textLight} />
              <Text style={styles.carModel} numberOfLines={1}>
                {item.car_model}
              </Text>
            </View>
          )}
          
          <Text 
            style={[
              styles.lastMessage,
              item.unread_count > 0 && styles.unreadText
            ]}
            numberOfLines={1}
          >
            {item.last_message || 'No messages yet'}
          </Text>
        </View>
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
    
    if (searchQuery.trim() !== '' && filteredConversations.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={50} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Results</Text>
          <Text style={styles.emptyText}>
            No conversations found matching "{searchQuery}"
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="chatbubble-outline" size={50} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No Conversations</Text>
        <Text style={styles.emptyText}>
          When you start chatting with car owners, your conversations will appear here.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={COLORS.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor={COLORS.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>
      
      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshing={isLoading}
        onRefresh={fetchConversations}
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: SIZES.md,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.background,
  },
  unreadCount: {
    color: COLORS.background,
    fontSize: SIZES.xs,
    fontWeight: 'bold',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  recipientName: {
    fontSize: SIZES.md,
    color: COLORS.secondary,
    flex: 1,
    marginRight: SPACING.sm,
  },
  timeText: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  carModel: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginLeft: 4,
  },
  lastMessage: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  unreadText: {
    fontWeight: 'bold',
    color: COLORS.text,
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

export default ConversationsScreen;
