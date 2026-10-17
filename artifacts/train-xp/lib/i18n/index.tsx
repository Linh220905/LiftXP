import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { Platform, NativeModules } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { type SupportedLocale, type TranslationDictionary } from "./types";
import { vi } from "./locales/vi";
import { en } from "./locales/en";

const LOCALE_STORAGE_KEY = "@train-xp/locale";

export const translations: Record<SupportedLocale, TranslationDictionary> = {
  vi,
  en,
};

export function getDeviceLocale(): SupportedLocale {
  try {
    let tag = "";
    if (Platform.OS === "ios") {
      tag =
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        "";
    } else if (Platform.OS === "android") {
      tag = NativeModules.I18nManager?.localeIdentifier || "";
    }
    if (!tag && typeof Intl !== "undefined") {
      tag = Intl.DateTimeFormat?.().resolvedOptions?.().locale || "";
    }
    if (!tag && typeof navigator !== "undefined") {
      tag = navigator.language || navigator.languages?.[0] || "";
    }
    if (tag && tag.toLowerCase().replace("_", "-").startsWith("en")) {
      return "en";
    }
  } catch {}
  return "vi";
}

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const localeVersion = useRef(0);
  const [locale, setLocaleState] = useState<SupportedLocale>(getDeviceLocale);

  useEffect(() => {
    let mounted = true;
    const version = localeVersion.current;
    void AsyncStorage.getItem(LOCALE_STORAGE_KEY)
      .then((stored) => {
        if (
          mounted &&
          version === localeVersion.current &&
          (stored === "vi" || stored === "en")
        ) {
          setLocaleState(stored);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const setLocale = async (newLocale: SupportedLocale) => {
    localeVersion.current++;
    setLocaleState(newLocale);
    await AsyncStorage.setItem(LOCALE_STORAGE_KEY, newLocale).catch(
      () => undefined,
    );
  };

  const t = useMemo(() => translations[locale] || translations.vi, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    // Fallback safe dictionary if used outside provider
    return {
      locale: "vi" as SupportedLocale,
      setLocale: async () => {},
      t: translations.vi,
    };
  }
  return context;
}
