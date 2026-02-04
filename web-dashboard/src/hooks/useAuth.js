import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ email, password });
          const { user, accessToken, refreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Erreur de connexion';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // Login with CIN (for agents and supervisors)
      loginByCin: async (cin) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.loginByCin({ cin });
          const { user, accessToken, refreshToken } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({ user, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'CIN invalide ou utilisateur non trouvé';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('token');
          localStorage.removeItem('checkInToken');
          localStorage.removeItem('checkInUser');
          set({ user: null, isAuthenticated: false });
        }
      },

      fetchProfile: async () => {
        try {
          const response = await authAPI.getProfile();
          set({ user: response.data.data, isAuthenticated: true });
        } catch (error) {
          set({ user: null, isAuthenticated: false });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.updateProfile(data);
          set({ user: response.data.data, isLoading: false });
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Erreur de mise à jour';
          set({ error: message, isLoading: false });
          return { success: false, error: message };
        }
      },

      // ✅ Nouvelle méthode pour l'authentification via CIN (sans email/password)
      setAuthenticatedUser: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('accessToken', token);
        set({ user, isAuthenticated: true, isLoading: false });
        return { success: true };
      },

      clearError: () => set({ error: null }),

      hasRole: (roles) => {
        const user = get().user;
        if (!user) return false;
        if (Array.isArray(roles)) {
          return roles.includes(user.role);
        }
        return user.role === roles;
      },

      isAdmin: () => get().user?.role === 'admin',
      isSupervisor: () => ['admin', 'supervisor'].includes(get().user?.role),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;

// ✅ Initialiser l'état d'authentification au chargement de la page
// Vérifie si un token existe dans localStorage et restaure l'session
if (typeof window !== 'undefined') {
  const checkInUser = localStorage.getItem('checkInUser');
  const checkInToken = localStorage.getItem('checkInToken');
  
  if (checkInUser && checkInToken) {
    try {
      const user = JSON.parse(checkInUser);
      useAuthStore.getState().setAuthenticatedUser(user, checkInToken);
    } catch (err) {
      console.error('Error restoring check-in session:', err);
    }
  }
}
