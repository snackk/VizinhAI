import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pt from './locales/pt.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: pt },
      en: { translation: en },
      fr: { translation: fr }
    },
    lng: 'pt',
    fallbackLng: 'pt',
    keySeparator: '.',
    interpolation: {
      escapeValue: false,
      prefix: '{{',
      suffix: '}}'
    }
  });

export default i18n;

