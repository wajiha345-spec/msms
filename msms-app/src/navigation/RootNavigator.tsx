import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen  from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import SetupScreen  from '../screens/onboarding/SetupScreen';
import TrialSignupScreen  from '../screens/onboarding/TrialSignupScreen';
import TrialExpiredScreen from '../screens/onboarding/TrialExpiredScreen';
import BottomTabs   from './BottomTabs';
import { colors }   from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, loading, isNewInstall, isTrialExpired } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          isTrialExpired ? (
            // Trial ran out — lock the app until a license key is entered
            <Stack.Screen name="TrialExpired" component={TrialExpiredScreen} />
          ) : (
            // Authenticated — show main app
            <Stack.Screen name="Main" component={BottomTabs} />
          )
        ) : isNewInstall ? (
          // Brand-new install with no account — show trial signup first
          <>
            <Stack.Screen name="TrialSignup" component={TrialSignupScreen} />
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          // Returning user, just logged out — show login
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="TrialSignup" component={TrialSignupScreen} />
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
