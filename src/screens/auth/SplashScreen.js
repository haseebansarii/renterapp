import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES } from '../../theme';

const SplashScreen = () => {
  const navigation = useNavigation();
  const { onboardingComplete } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onboardingComplete) {
        navigation.replace('Login');
      } else {
        navigation.replace('Onboarding');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation, onboardingComplete]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Car Rental</Text>
      <Text style={styles.subtitle}>Find and rent cars easily</Text>
      <ActivityIndicator 
        style={styles.loader} 
        size="large" 
        color={COLORS.primary} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: SIZES.title,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    marginBottom: 40,
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
});

export default SplashScreen;
