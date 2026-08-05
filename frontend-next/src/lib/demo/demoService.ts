export const DEMO_MODE_STORAGE_KEY = 'opspilot_demo_mode';
export const DEMO_TOKEN_KEY = 'opspilot_token';
export const DEMO_USER_KEY = 'opspilot_user';

export const DEMO_USER_PROFILE = {
  id: 'usr_demo_8820',
  email: 'demo@opspilot.io',
  name: 'Sarah Chen',
  company: 'Acme Corp',
  role: 'ADMIN',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  isSuperAdmin: true,
  isDemo: true,
};

/**
 * Configurable Demo Mode Service
 * Encapsulates all state storage, toggling, and environment checks for Demo Mode.
 */
export const demoService = {
  isEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(DEMO_MODE_STORAGE_KEY) === 'true';
  },

  enable(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(DEMO_TOKEN_KEY, 'demo_token_sec_key_998877');
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(DEMO_USER_PROFILE));
    localStorage.setItem(DEMO_MODE_STORAGE_KEY, 'true');
  },

  disable(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  },

  getUser() {
    return DEMO_USER_PROFILE;
  },
};
