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
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING, SHADOWS } from '../../theme';

const VerifyEmailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { verifyEmailOtp } = useAuth();
  
  const { email = '' } = route.params || {};
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6-digit OTP
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const inputRefs = useRef([]);
  
  useEffect(() => {
    // Notify user that OTP has been sent
    Alert.alert('OTP Sent', `A verification code has been sent to ${email}`);
    
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
    // Clear any previous error message when user starts typing
    if (errorMessage) {
      setErrorMessage('');
    }
    
    // Allow only numbers
    const formattedText = text.replace(/[^0-9]/g, '');
    
    if (formattedText.length <= 1) {
      const newOtp = [...otp];
      newOtp[index] = formattedText;
      setOtp(newOtp);
      
      // Auto focus next input
      if (formattedText.length === 1 && index < 5) {
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
  
  const handleResendOtp = async () => {
    if (!canResend) return;
    
    setResendLoading(true);
    setErrorMessage('');
    
    try {
      // Request Supabase to resend the OTP
      const { error } = await supabase.auth.signUp({
        email,
        password: route.params.password || '', // You might need to pass the password from the register screen
      });
      
      if (error) throw error;
      
      Alert.alert('OTP Resent', `A new verification code has been sent to ${email}`);
      startCountdown();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };
  
  const clearOtp = () => {
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
  };
  
  const handleVerify = async () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code');
      return;
    }
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const { data, error } = await verifyEmailOtp(email, otpValue);
      
      if (error) throw error;
      
      Alert.alert(
        'Verification Successful',
        'Your email has been verified successfully.',
        [
          {
            text: 'Continue',
            onPress: () => navigation.navigate('ProfileSetup')
          }
        ]
      );
    } catch (error) {
      // Display error message on screen instead of console
      setErrorMessage(error.message || 'Failed to verify email. Please try again.');
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
          <Ionicons name="mail-outline" size={60} color={COLORS.primary} />
          
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to
          </Text>
          <Text style={styles.email}>{email}</Text>
          
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  errorMessage ? styles.otpInputError : null
                ]}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                autoFocus={index === 0}
              />
            ))}
          </View>
          
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}
          
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
          
          {errorMessage ? (
            <TouchableOpacity 
              style={styles.tryAgainButton} 
              onPress={clearOtp}
            >
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
          ) : null}
          
          <View style={styles.resendContainer}>
            {canResend ? (
              <TouchableOpacity 
                onPress={handleResendOtp}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <Text style={styles.resendText}>Resend Code</Text>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdownText}>
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
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  email: {
    fontSize: SIZES.md,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.xl,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.md,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.inputBackground,
    fontSize: SIZES.lg,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  otpInputError: {
    borderColor: COLORS.error,
  },
  errorContainer: {
    width: '100%',
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: SIZES.sm,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    height: 55,
    ...SHADOWS.medium,
  },
  verifyButtonText: {
    color: COLORS.background,
    fontSize: SIZES.md,
    fontWeight: 'bold',
  },
  tryAgainButton: {
    marginBottom: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  tryAgainText: {
    color: COLORS.primary,
    fontSize: SIZES.md,
    fontWeight: '500',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  countdownText: {
    color: COLORS.textLight,
    fontSize: SIZES.sm,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
});

export default VerifyEmailScreen; 