// ============================================================
// AUTH STORE (Zustand)
// Ye user ki login state manage karta hai:
//   - User kaun hai
//   - Token kya hai
//   - Login/Logout functions
// ============================================================

import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  isBanned?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setBanned: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  // Initial state — localStorage se token check karo
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),

  // Login — user aur token save karo
  login: (user, accessToken, refreshToken) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, accessToken, isAuthenticated: true });
  },

  // Logout — sab clear karo
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  // Mark user as banned
  setBanned: () => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, isBanned: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));

// Listen for banned event from API interceptor (avoids circular import)
window.addEventListener('user-banned', () => {
  useAuthStore.getState().setBanned();
});

export default useAuthStore;
