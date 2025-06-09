import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  Dimensions 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SPACING } from '../../theme';

const { width } = Dimensions.get('window');

const onboardingData = [
  {
    id: '1',
    title: 'Find Your Perfect Car',
    description: 'Browse through a wide selection of cars available for rent in your area.',
    image: require('../../assets/onboarding-1.png'),
  },
  {
    id: '2',
    title: 'Easy Booking Process',
    description: 'Book your desired car with just a few taps and get instant confirmation.',
    image: require('../../assets/onboarding-2.png'),
  },
  {
    id: '3',
    title: 'Start Your Journey',
    description: 'Pick up your car and enjoy your trip with our hassle-free rental service.',
    image: require('../../assets/onboarding-3.png'),
  },
];

const OnboardingScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const navigation = useNavigation();
  const { completeOnboarding } = useAuth();

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = async () => {
    await completeOnboarding();
    navigation.replace('Login');
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        <Image source={item.image} style={styles.image} resizeMode="contain" />
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === currentIndex ? COLORS.primary : COLORS.border },
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />
      
      {renderDots()}
      
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        {currentIndex === onboardingData.length - 1 ? (
          <Text style={styles.nextButtonText}>Get Started</Text>
        ) : (
          <Ionicons name="arrow-forward" size={24} color={COLORS.background} />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  slide: {
    width,
    alignItems: 'center',
    padding: SPACING.xl,
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  description: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
    lineHeight: 22,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    fontSize: SIZES.md,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
    alignSelf: 'center',
  },
  nextButtonText: {
    color: COLORS.background,
    fontWeight: 'bold',
    fontSize: SIZES.sm,
  },
});

export default OnboardingScreen;
