import { createI18n } from 'vue-i18n';

const messages = {
  en: {
    app: {
      title: 'Strzel Sobie',
    },
    navigation: {
      calendar: 'Calendar',
      userManagement: 'User Management',
      userVerification: 'User Verification',
      rangeSettings: 'Range Settings',
    },
    userMenu: {
      label: 'User menu',
      profile: 'My profile',
      logout: 'Logout',
    },
    language: 'Language',
    auth: {
      title: 'Strzel Sobie',
      subtitle: 'Log in or create an account to manage your reservations',
      login: 'Login',
      register: 'Register',
      operationFailed: 'Operation failed.',
    },
    footer: {
      privacyPolicy: 'Privacy Policy',
    },
  },
  pl: {
    app: {
      title: 'Strzel Sobie',
    },
    navigation: {
      calendar: 'Kalendarz',
      userManagement: 'Zarządzanie użytkownikami',
      userVerification: 'Weryfikacja użytkowników',
      rangeSettings: 'Ustawienia strzelnicy',
    },
    userMenu: {
      label: 'Menu użytkownika',
      profile: 'Mój profil',
      logout: 'Wyloguj',
    },
    language: 'Język',
    auth: {
      title: 'Strzel Sobie',
      subtitle: 'Zaloguj się lub utwórz konto, aby zarządzać rezerwacjami',
      login: 'Logowanie',
      register: 'Rejestracja',
      operationFailed: 'Nie udało się ukończyć operacji.',
    },
    footer: {
      privacyPolicy: 'Polityka Prywatności',
    },
  },
};

const i18n = createI18n({
  legacy: false,
  locale: 'pl',
  fallbackLocale: 'en',
  messages,
});

export default i18n;