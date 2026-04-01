import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/admin/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminFeedback from './pages/admin/Feedback';
import AdminRoadmap from './pages/admin/Roadmap';
import AdminUsers from './pages/admin/Users';
import AdminChangeLog from './pages/admin/ChangeLog';
import AdminReporting from './pages/admin/Reporting';
import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';

function App() {
  const theme = useThemeStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/" />} />
        <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/" />} />

        {/* User Routes */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <>
                <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                  <Navbar />
                  <HomePage />
                  <Toaster position="top-right" />
                </div>
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/*"
          element={
            isAuthenticated && isAdmin ? (
              <>
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="feedback" element={<AdminFeedback />} />
                    <Route path="roadmap" element={<AdminRoadmap />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="changelog" element={<AdminChangeLog />} />
                    <Route path="reporting" element={<AdminReporting />} />
                  </Routes>
                </AdminLayout>
                <Toaster position="top-right" />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAdmin ? "/admin/dashboard" : "/"} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
