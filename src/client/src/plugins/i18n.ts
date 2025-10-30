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
      rangeInfo: 'Range info',
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
    rangeLanding: {
      loadingTitle: 'Loading range data...',
      description: 'Learn the essentials about the range and available lanes.',
      totalTracks: 'Total lanes: {count}',
      emptyState: 'No range data available.',
      actions: {
        refresh: 'Refresh range data',
        openCalendar: 'Open calendar',
      },
      operatingHours: {
        title: 'Operating hours',
        closed: 'Closed',
      },
      days: {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
      },
    },
    admin: {
      userRoles: {
        guestImmutableHint: 'The {role} role is always assigned.',
        currentRolesLabel: 'Assigned roles',
        assignRole: 'Assign the {role} role',
        removeRole: 'Remove the {role} role',
        suggestedRole: 'Suggested role: {role}',
        noSuggestedRole: 'No suggested role.',
        roleAssigned: 'User {email} received the {role} role.',
        roleRemoved: 'User {email} no longer has the {role} role.',
      },
      rangeSettings: {
        title: 'Range settings',
        totalTracksLabel: 'Total number of lanes',
        operatingHoursHeading: 'Operating hours',
        openLabel: 'Open',
        closedLabel: 'Closed',
        openTimeLabel: 'Opening time',
        closeTimeLabel: 'Closing time',
        recordAction: 'Save record without reservation',
        submitAction: 'Save changes',
        refreshAction: 'Refresh',
        successMessage: 'Range settings saved.',
        errorMessage: 'Failed to save range settings.',
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
      rangeInfo: 'Strzelnica',
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
    rangeLanding: {
      loadingTitle: 'Ładujemy dane strzelnicy...',
      description: 'Poznaj podstawowe informacje o strzelnicy i dostępnych torach.',
      totalTracks: 'Łączna liczba torów: {count}',
      emptyState: 'Brak danych o strzelnicy.',
      actions: {
        refresh: 'Odśwież dane strzelnicy',
        openCalendar: 'Przejdź do kalendarza',
      },
      operatingHours: {
        title: 'Godziny otwarcia',
        closed: 'Zamknięte',
      },
      days: {
        monday: 'Poniedziałek',
        tuesday: 'Wtorek',
        wednesday: 'Środa',
        thursday: 'Czwartek',
        friday: 'Piątek',
        saturday: 'Sobota',
        sunday: 'Niedziela',
      },
    },
    admin: {
      userRoles: {
        guestImmutableHint: 'Rola {role} jest przypisana każdemu użytkownikowi.',
        currentRolesLabel: 'Przypisane role',
        assignRole: 'Nadaj rolę {role}',
        removeRole: 'Usuń rolę {role}',
        suggestedRole: 'Sugerowana rola: {role}',
        noSuggestedRole: 'Brak proponowanej roli.',
        roleAssigned: 'Użytkownik {email} otrzymał rolę {role}.',
        roleRemoved: 'Użytkownik {email} nie ma już roli {role}.',
      },
      rangeSettings: {
        title: 'Ustawienia strzelnicy',
        totalTracksLabel: 'Łączna liczba torów',
        operatingHoursHeading: 'Godziny otwarcia',
        openLabel: 'Otwarte',
        closedLabel: 'Zamknięte',
        openTimeLabel: 'Godzina otwarcia',
        closeTimeLabel: 'Godzina zamknięcia',
        recordAction: 'Zapisz bez rezerwacji',
        submitAction: 'Zapisz zmiany',
        refreshAction: 'Odśwież',
        successMessage: 'Ustawienia strzelnicy zostały zapisane.',
        errorMessage: 'Nie udało się zapisać ustawień strzelnicy.',
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
