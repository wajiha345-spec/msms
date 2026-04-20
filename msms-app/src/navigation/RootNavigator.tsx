import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen  from '../screens/auth/LoginScreen';
import SetupScreen  from '../screens/onboarding/SetupScreen';
import BottomTabs   from './BottomTabs';
import { colors }   from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, loading, isNewInstall } = useAuth();

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
          // Authenticated — show main app
          <Stack.Screen name="Main" component={BottomTabs} />
        ) : isNewInstall ? (
          // Brand-new install with no account — show license key setup
          <>
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        ) : (
          // Returning user, just logged out — show login
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Setup" component={SetupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
