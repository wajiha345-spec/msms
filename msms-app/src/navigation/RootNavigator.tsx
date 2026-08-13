import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen  from '../screens/auth/LoginScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import SetupScreen  from '../screens/onboarding/SetupScreen';
import TrialSignupScreen  from '../screens/onboarding/TrialSignupScreen';
import TrialExpiredScreen from '../screens/onboarding/TrialExpiredScreen';
import BottomTabs   from './BottomTabs';
import DesktopShell from './DesktopShell';
import { colors }   from '../theme/colors';

// Desktop (Electron/web) gets a sidebar shell instead of bottom tabs; native
// Android/iOS render BottomTabs exactly as before. Decided once at module
// load — Platform.OS doesn't change at runtime.
const MainComponent = Platform.OS === 'web' ? DesktopShell : BottomTabs;

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token, loading, isNewInstall, isTrialExpired, isInstallmentOverdue } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer documentTitle={{ formatter: () => 'SmartShop' }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {token ? (
          isTrialExpired || isInstallmentOverdue ? (
            // Trial ran out, or a license installment is overdue — lock the
            // app until a license key is entered (full payment) or the
            // overdue installment is paid on the website (installment
            // payments are handled entirely outside the app — see
            // TrialExpiredScreen).
            <Stack.Screen name="TrialExpired" component={TrialExpiredScreen} />
          ) : (
            // Authenticated — show main app
            <Stack.Screen name="Main" component={MainComponent} />
          )
        ) : isNewInstall ? (
          // Brand-new install with no account — let them choose Login / Create Account / Free Trial
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
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
