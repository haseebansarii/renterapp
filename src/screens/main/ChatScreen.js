import React, { useState, useEffect, useRef } from 'react';
import avatarPlaceholder from '../../assets/avatar-placeholder.png';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { recipientId, recipientName, carId } = route.params;
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [car, setCar] = useState(null);
  
  const flatListRef = useRef(null);
  const messagesSubscription = useRef(null);
  
  useEffect(() => {
    fetchRecipientDetails();
    if (carId) {
      fetchCarDetails();
    }
    fetchMessages();
    
    return () => {
      if (messagesSubscription.current) {
        messagesSubscription.current.unsubscribe();
      }
    };
  }, []);
  
  const fetchRecipientDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recipientId)
        .single();
        
      if (error) throw error;
      
      setRecipient(data);
    } catch (error) {
      console.error('Error fetching recipient details:', error);
    }
  };
  
  const fetchCarDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('cars')
        .select(`
          id,
          model,
          car_images(image_url, is_primary)
        `)
        .eq('id', carId)
        .single();
        
      if (error) throw error;
      
      // Process car images to get primary image
      const carImages = data.car_images || [];
      const primaryImage = carImages.find(img => img.is_primary);
      const firstImage = carImages[0];
      
      setCar({
        ...data,
        primary_image: primaryImage ? primaryImage.image_url : 
                       firstImage ? firstImage.image_url : null
      });
    } catch (error) {
      console.error('Error fetching car details:', error);
    }
  };
  
  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      // Create or get conversation
      let conversationId;
      
      const { data: existingConversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${user.id})`)
        .single();
        
      if (conversationError && conversationError.code !== 'PGRST116') {
        throw conversationError;
      }
      
      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            user1_id: user.id,
            user2_id: recipientId,
            car_id: carId || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
          
        if (createError) throw createError;
        
        conversationId = newConversation.id;
      }
      
      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      
      setMessages(messagesData || []);
      
      // Subscribe to new messages
      messagesSubscription.current = supabase
        .channel(`messages:conversation_id=eq.${conversationId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          setMessages(prevMessages => [...prevMessages, payload.new]);
        })
        .subscribe();
      
      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('sender_id', recipientId)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    
    try {
      // Get conversation ID
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${user.id})`)
        .single();
        
      if (conversationError) throw conversationError;
      
      // Send message
      const { error: sendError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          receiver_id: recipientId,
          content: newMessage,
          created_at: new Date().toISOString(),
          is_read: false
        });
        
      if (sendError) throw sendError;
      
      // Update conversation last message
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversation.id);
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };
  
  const renderMessageItem = ({ item, index }) => {
    const isCurrentUser = item.sender_id === user.id;
    const showDate = index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(item.created_at);
    
    return (
      <>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageContainer,
          isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
        ]}>
          <View style={[
            styles.messageBubble,
            isCurrentUser ? styles.currentUserBubble : styles.otherUserBubble
          ]}>
            <Text style={[
              styles.messageText,
              isCurrentUser ? styles.currentUserText : styles.otherUserText
            ]}>
              {item.content}
            </Text>
          </View>
          <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
        </View>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {recipient ? (
            <>
              <Image
                source={
                  recipient.profile_image_url
                    ? { uri: recipient.profile_image_url }
                    : avatarPlaceholder
                }
                style={styles.recipientImage}
              />
              <View>
                <Text style={styles.recipientName}>{recipient.full_name}</Text>
                {car && (
                  <Text style={styles.carModel}>{car.model}</Text>
                )}
              </View>
            </>
          ) : (
            <>
              <View style={styles.recipientImagePlaceholder} />
              <Text style={styles.recipientName}>{recipientName}</Text>
            </>
          )}
        </View>
        
        {car && (
          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => navigation.navigate('CarDetails', { carId: car.id })}
          >
            <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textLight}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              editable={!isSending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newMessage.trim() || isSending) && styles.disabledSendButton
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <Ionicons name="send" size={20} color={COLORS.background} />
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    marginRight: SPACING.md,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  recipientImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    marginRight: SPACING.sm,
  },
  recipientName: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  carModel: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    padding: SPACING.md,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: SPACING.sm,
  },
  dateText: {
    fontSize: SIZES.sm,
    color: COLORS.textLight,
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 10,
  },
  messageContainer: {
    marginBottom: SPACING.sm,
    maxWidth: '80%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 15,
    padding: SPACING.md,
    ...SHADOWS.light,
  },
  currentUserBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 0,
  },
  otherUserBubble: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: SIZES.md,
  },
  currentUserText: {
    color: COLORS.background,
  },
  otherUserText: {
    color: COLORS.text,
  },
  messageTime: {
    fontSize: SIZES.xs,
    color: COLORS.textLight,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    fontSize: SIZES.md,
    color: COLORS.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  disabledSendButton: {
    backgroundColor: COLORS.textLight,
  },
});

export default ChatScreen;
