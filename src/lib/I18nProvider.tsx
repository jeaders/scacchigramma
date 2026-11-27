import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, LANG_KEY, normalizeLang, translate, type Lang, type TranslationKey } from "./i18n";

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Lingua iniziale: `?lang=` nell'URL, poi la scelta salvata, poi il default della build. */
function initialLang(): Lang {
  try {
    const fromUrl = normalizeLang(new URLSearchParams(window.location.search).get("lang"));
    if (fromUrl) return fromUrl;
    const stored = normalizeLang(localStorage.getItem(LANG_KEY));
    if (stored) return stored;
  } catch {
    /* storage o URL non disponibili: si usa il default della build */
  }
  return DEFAULT_LANG;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignora */
    }
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      toggleLang: () => setLang((l) => (l === "it" ? "en" : "it")),
      t: (key, params) => translate(lang, key, params),
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n deve essere usato dentro <I18nProvider>");
  return ctx;
}
