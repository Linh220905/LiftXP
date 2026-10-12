import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type SupportedLocale, type TranslationDictionary } from './types';
import { vi } from './locales/vi';
import { en } from './locales/en';

const LOCALE_STORAGE_KEY = '@train-xp/locale';

const translations: Record<SupportedLocale, TranslationDictionary> = {
  vi,
  en,
};

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('vi'); // Default Vietnamese

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((stored) => {
      if (stored === 'vi' || stored === 'en') {
        setLocaleState(stored);
      }
    });
  }, []);

  const setLocale = async (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  };

  const t = useMemo(() => translations[locale] || translations.vi, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback safe dictionary if used outside provider
    return {
      locale: 'vi' as SupportedLocale,
      setLocale: async () => {},
      t: translations.vi,
    };
  }
  return context;
}
