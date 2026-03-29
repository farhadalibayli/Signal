import React from 'react';
import { View, ActivityIndicator, StyleSheet, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { OfflineBanner } from './src/components/OfflineBanner';
import { AlertsProvider } from './src/context/AlertsContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import { SignalsProvider } from './src/context/SignalsContext';
import { initI18n } from './src/i18n/i18n';

function AppContent() {
  const { colors } = useTheme();
  const [i18nInitialized, setI18nInitialized] = React.useState(false);
  
  React.useEffect(() => {
    initI18n().then(() => setI18nInitialized(true));
  }, []);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  if (!fontsLoaded || !i18nInitialized) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={colors.background === '#0D0A1E' ? 'light-content' : 'dark-content'}
      />
      <SafeAreaProvider>
        <SignalsProvider>
          <AlertsProvider>
            <RootNavigator />
          </AlertsProvider>
        </SignalsProvider>
        <OfflineBanner />
      </SafeAreaProvider>
    </>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
