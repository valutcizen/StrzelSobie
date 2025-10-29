import { createI18n } from 'vue-i18n';

const messages = {
  en: {
    app: {
      title: 'Strzel Sobie',
    },
    roles: {
      guest: 'Guest',
      member: 'Member',
      coordinator: 'Coordinator',
      confirmator: 'Confirmator',
      shootingRangeAdmin: 'Shooting Range Administrator',
      clubCommunityAdmin: 'Club/Community Administrator',
    },
    navigation: {
      calendar: 'Calendar',
      userManagement: 'User Management',
      rangeUserManagement: 'Range Role Management',
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
      invalidCredentials: 'Invalid email or password.',
      invalidBody: 'Invalid input data.',
    },
    footer: {
      privacyPolicy: 'Privacy Policy',
    },
    admin: {
      userRoles: {
        guestImmutableHint: 'The {role} role is always assigned.',
        currentRolesLabel: 'Assigned roles',
        assignRole: 'Assign the {role} role',
        suggestedRole: 'Suggested role: {role}',
        noSuggestedRole: 'No suggested role.',
        roleAssigned: 'User {email} received the {role} role.',
      },
    },
  },
  pl: {
    app: {
      title: 'Strzel Sobie',
    },
    roles: {
      guest: 'Gość',
      member: 'Członek',
      coordinator: 'Koordynator',
      confirmator: 'Potwierdzający',
      shootingRangeAdmin: 'Administrator strzelnicy',
      clubCommunityAdmin: 'Administrator klubu/społeczności',
    },
    navigation: {
      calendar: 'Kalendarz',
      userManagement: 'Zarządzanie użytkownikami',
      rangeUserManagement: 'Zarządzanie rolami strzelnicy',
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
      invalidCredentials: 'Nieprawidłowy email lub hasło.',
      invalidBody: 'Błędne dane wejściowe.',
    },
    footer: {
      privacyPolicy: 'Polityka Prywatności',
    },
    admin: {
      userRoles: {
        guestImmutableHint: 'Rola {role} jest przypisana każdemu użytkownikowi.',
        currentRolesLabel: 'Przypisane role',
        assignRole: 'Nadaj rolę {role}',
        suggestedRole: 'Sugerowana rola: {role}',
        noSuggestedRole: 'Brak proponowanej roli.',
        roleAssigned: 'Użytkownik {email} otrzymał rolę {role}.',
      },
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
