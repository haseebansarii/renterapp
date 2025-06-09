import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const VerifyPhoneScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { verifyPhone } = useAuth();
  
  const { phoneNumber = '' } = route.params || {};
  
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef([]);
  
  useEffect(() => {
    // Simulate OTP sending
    Alert.alert('OTP Sent', `A verification code has been sent to ${phoneNumber}`);
    
    // Start countdown timer
    startCountdown();
    
    return () => {
      // Clear timer on unmount
      if (countdownTimer.current) {
        clearInterval(countdownTimer.current);
      }
    };
  }, []);
  
  const countdownTimer = useRef(null);
  
  const startCountdown = () => {
    setTimeLeft(60);
    setCanResend(false);
    
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
    }
    
    countdownTimer.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(countdownTimer.current);
          setCanResend(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleOtpChange = (text, index) => {
    // Allow only numbers
    const formattedText = text.replace(/[^0-9]/g, '');
    
    if (formattedText.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = formattedText;
      setOtp(newOtp);
      
      // Auto focus next input
      if (formattedText.length === 1 && index < 3) {
        inputRefs.current[index + 1].focus();
      }
    }
  };
  
  const handleKeyPress = (e, index) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otp[index] === '') {
      inputRefs.current[index - 1].focus();
    }
  };
  
  const handleResendOtp = () => {
    if (!canResend) return;
    
    setResendLoading(true);
    
    // Simulate OTP resending
    setTimeout(() => {
      Alert.alert('OTP Resent', `A new verification code has been sent to ${phoneNumber}`);
      setResendLoading(false);
      startCountdown();
    }, 1500);
  };
  
  const handleVerify = async () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the complete 4-digit verification code');
      return;
    }
    
    setIsLoading(true);
    try {
      // For demo purposes, we'll accept any 4-digit code
      // In a real app, this would validate against the actual OTP
      const { data, error } = await verifyPhone(phoneNumber, otpValue);
      
      if (error) throw error;
      
      Alert.alert(
        'Verification Successful',
        'Your phone number has been verified successfully.',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigation will be handled by the AuthContext
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error verifying phone:', error);
      Alert.alert('Verification Failed', error.message || 'Failed to verify phone number');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.secondary} />
        </TouchableOpacity>
        
        <View style={styles.content}>
          <Ionicons name="phone-portrait-outline" size={60} color={COLORS.primary} />
          
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            We've sent a 4-digit verification code to
          </Text>
          <Text style={styles.phoneNumber}>{phoneNumber}</Text>
          
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                autoFocus={index === 0}
              />
            ))}
          </View>
          
          <TouchableOpacity 
            style={styles.verifyButton} 
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.background} size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
          
          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity 
                onPress={handleResendOtp}
                disabled={resendLoading}
                style={styles.resendButton}
              >
                {resendLoading ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Text style={styles.resendText}>Resend Code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.timerText}>
                Resend code in {formatTime(timeLeft)}
              </Text>
            )}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  backButton: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: SPACING.xl * 2,
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
    textAlign: 'center',
  },
  phoneNumber: {
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: SPACING.xl,
  },
  otpInput: {
    width: 55,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    backgroundColor: COLORS.inputBackground,
    color: COLORS.secondary,
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    height: 55,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  verifyButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
  },
  resendButton: {
    padding: SPACING.sm,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  timerText: {
    color: COLORS.textLight,
    fontSize: SIZES.md,
  },
});

export default VerifyPhoneScreen;
