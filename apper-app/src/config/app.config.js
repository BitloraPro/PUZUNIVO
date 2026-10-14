export const APP_CONFIG = {
  name: 'PUZUNIVO',
  tagline: 'Think. Play. Discover.',
  emoji: '🧠',
  icon: 'BrainCircuit',
  defaultTheme: 'dark',
  defaultLoginRoute: '/player/login',
};
export const AUTH_PROFILES = [
  {
    key: 'player',
    name: 'Player_c',
    profileSlug: "|ABkqmN2OZnUF0yTaf95wI5ov6QEKPnQZsAuH1PeJp6Y=",
    redirectAfterAuth: '/games',
    authPage: {
      loginTitle: 'Welcome back',
      signupTitle: 'Join PUZUNIVO',
      loginDescription: 'Think. Play. Discover.',
      signupDescription: 'Your next puzzle adventure starts here.',
    },
    altLinksLeadIn: null,
    altLinks: [],
    reportsTo: "Admin_c",
    hasSignup: true,
  },
  {
    key: 'admin',
    name: 'Admin_c',
    profileSlug: "|ABkqmN2OZnUF0yTaf95wI9iScmdr3tTpG1cNLiYuQdM=",
    redirectAfterAuth: '/admin',
    authPage: {
      loginTitle: 'Welcome back',
      signupTitle: 'Admin registration unavailable',
      loginDescription: 'PUZUNIVO secure account sign-in.',
      signupDescription: 'Administrator accounts are invitation-only.',
    },
    altLinksLeadIn: null,
    altLinks: [],
    reportsTo: null,
    hasSignup: false,
  }
];
export const GENERIC_AUTH = {
  loginTitle: 'Welcome back',
  signupTitle: 'Create your PUZUNIVO account',
  loginDescription: 'Keep your puzzle journey in one place.',
  signupDescription: 'Play, think, and grow every day.',
  redirectAfterAuth: '/games',
};