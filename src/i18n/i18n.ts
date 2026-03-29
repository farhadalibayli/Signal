import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import az from './locales/az.json';
import ru from './locales/ru.json';

const LANGUAGE_KEY = 'app_language';

const resources = {
  en: { translation: en },
  az: { translation: az },
  ru: { translation: ru },
};

export const initI18n = async () => {
  let savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (!savedLanguage) {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      savedLanguage = locales[0].languageCode;
    }
  }
  
  if (!savedLanguage || !['en', 'az', 'ru'].includes(savedLanguage)) {
    savedLanguage = 'en';
  }

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      }
    });
};

export default i18n;
