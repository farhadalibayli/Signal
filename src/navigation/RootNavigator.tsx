import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import OTPScreen from '../screens/OTPScreen';
import UsernameScreen from '../screens/UsernameScreen';
import PhotoScreen from '../screens/PhotoScreen';
import FindFriendsScreen from '../screens/FindFriendsScreen';
import TutorialScreen from '../screens/TutorialScreen';
import HomeScreen from '../screens/HomeScreen';
import ComposeSignalScreen from '../screens/ComposeSignalScreen';
import SignalDetailScreen from '../screens/SignalDetailScreen';
import CircleScreen from '../screens/CircleScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import DiscoveryScreen from '../screens/DiscoveryScreen';
import HelpFAQScreen from '../screens/HelpFAQScreen';
import ErrorScreen from '../screens/ErrorScreen';
import ChatScreen from '../screens/ChatScreen';
import ActivityHistoryScreen from '../screens/ActivityHistoryScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

import type { SignalData } from '../types/signal';
import { useTheme } from '../context/ThemeContext';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  OTP: { contact: string };
  Username: undefined;
  Photo: undefined;
  FindFriends: undefined;
  Tutorial: undefined;
  Home: { newSignal?: SignalData; removedSignalId?: string };
  ComposeSignal: undefined;
  SignalDetail: { signal: SignalData };
  Circle: { openTab?: number };
  Discovery: undefined;
  GroupDetail: { groupName: string };
  Alerts: undefined;
  Profile: undefined;
  Settings: undefined;
  EditProfile: undefined;
  HelpFAQ: undefined;
  Error: { title?: string; message?: string };
  Chat: { userId: string };
  ActivityHistory: undefined;
  UserProfile: { userId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <NavigationContainer
      theme={{
        ...DefaultTheme,
        dark: isDark,
        colors: {
          ...DefaultTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.primary,
        },
      }}
    >
      <Stack.Navigator
        id="root"
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="Username" component={UsernameScreen} />
        <Stack.Screen name="Photo" component={PhotoScreen} />
        <Stack.Screen name="FindFriends" component={FindFriendsScreen} />
        <Stack.Screen name="Tutorial" component={TutorialScreen} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="ComposeSignal"
          component={ComposeSignalScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="SignalDetail"
          component={SignalDetailScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="Circle" component={CircleScreen} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="Discovery"
          component={DiscoveryScreen}
          options={{ animation: 'slide_from_bottom', headerShown: false }}
        />
        <Stack.Screen
          name="GroupDetail"
          component={GroupDetailScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen name="Alerts" component={AlertsScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'fade' }} />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="EditProfile"
          component={EditProfileScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="HelpFAQ"
          component={HelpFAQScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Error"
          component={ErrorScreen}
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ActivityHistory"
          component={ActivityHistoryScreen}
          options={{ headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="UserProfile"
          component={UserProfileScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
