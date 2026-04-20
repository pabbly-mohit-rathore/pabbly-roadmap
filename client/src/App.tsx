import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import CustomToaster from './components/ui/CustomToaster';
import BannedDialog from './components/ui/BannedDialog';
import { useEffect, lazy, Suspense } from 'react';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/admin/Layout';
import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';
import useTeamAccessStore from './store/teamAccessStore';
import pushNotifications from './services/pushNotification.service';
import useFeedSocket from './hooks/useFeedSocket';

// Lazy load all pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminFeedback = lazy(() => import('./pages/admin/Feedback'));
const AdminRoadmap = lazy(() => import('./pages/admin/Roadmap'));
const AdminBoardDetail = lazy(() => import('./pages/admin/BoardDetail'));
const AdminPostDetail = lazy(() => import('./pages/admin/PostDetail'));
const ChangelogEditor = lazy(() => import('./pages/admin/ChangelogEditor'));
const PostEditor = lazy(() => import('./pages/admin/PostEditor'));
const ChangelogView = lazy(() => import('./pages/admin/ChangelogView'));
const BoardManagement = lazy(() => import('./pages/admin/BoardManagement'));
const AdminBoardMembers = lazy(() => import('./pages/admin/BoardMembers'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const ProfileSettingsPage = lazy(() => import('./pages/admin/ProfileSettingsPage'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const UserFeatureRequests = lazy(() => import('./pages/user/FeatureRequests'));
const UserRoadmapPage = lazy(() => import('./pages/user/RoadmapPage'));
const UserPostDetail = lazy(() => import('./pages/user/PostDetail'));

function App() {
  const theme = useThemeStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'admin';
  const isTeamAccess = useTeamAccessStore((state) => state.isTeamAccess);
  const canAccessAdmin = isAdmin || isTeamAccess;

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Warm up backend on app load (Render cold start can take 30-60s)
  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    fetch(`${apiBase.replace('/api', '')}/health`).catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <PushNavigationBridge />
      <FeedSocketBridge enabled={isAuthenticated} />
      <Suspense fallback={null}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/user/roadmap" />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/user/roadmap" />} />

          {/* Root redirect */}
          <Route path="/" element={
            isAuthenticated ? (
              isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/user/roadmap" />
            ) : <Navigate to="/user/roadmap" />
          } />

          <Route path="/board/:slug" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><BoardPage />              </div>
            ) : <Navigate to="/login" />
          } />

          <Route path="/post/:slug" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><PostDetailPage />              </div>
            ) : <Navigate to="/login" />
          } />

          <Route path="/roadmap" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><RoadmapPage />              </div>
            ) : <Navigate to="/login" />
          } />

          <Route path="/profile" element={<Navigate to="/admin/profile-settings?tab=profile" replace />} />

          {/* Changelog Editor - Full width, no sidebar */}
          <Route path="/admin/changelog/:id/edit" element={
            isAuthenticated && canAccessAdmin ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><ChangelogEditor />              </div>
            ) : <Navigate to="/login" />
          } />

          {/* Post Editor - Full width, no sidebar */}
          <Route path="/admin/posts/:id/edit" element={
            isAuthenticated && canAccessAdmin ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><PostEditor />              </div>
            ) : <Navigate to="/login" />
          } />

          {/* Changelog View */}
          <Route path="/admin/changelog/:id/view" element={
            isAuthenticated && canAccessAdmin ? (
              <AdminLayout><ChangelogView /></AdminLayout>
            ) : <Navigate to="/login" />
          } />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            isAuthenticated && canAccessAdmin ? (
              <>
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="all-posts" element={<AdminFeedback />} />
                    <Route path="feedback" element={<Navigate to="/admin/all-posts" replace />} />
                    <Route path="roadmap" element={<AdminRoadmap />} />
                    <Route path="board-management" element={<BoardManagement />} />
                    <Route path="boards/:boardId" element={<AdminBoardDetail />} />
                    <Route path="boards/:id/members" element={<AdminBoardMembers />} />
                    <Route path="posts/:postId" element={<AdminPostDetail />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="changelog/:id/view" element={<ChangelogView />} />
                    <Route path="settings" element={isTeamAccess && !isAdmin ? <Navigate to="/admin/dashboard" replace /> : <AdminSettings />} />
                    <Route path="profile-settings" element={<ProfileSettingsPage />} />
                  </Routes>
                </AdminLayout>
                              </>
            ) : <Navigate to="/login" />
          } />

          {/* User Routes - Login required */}
          <Route path="/user/all-posts" element={
            isAuthenticated ? <UserFeatureRequests /> : <Navigate to="/login" />
          } />
          <Route path="/user/roadmap" element={
            isAuthenticated ? <UserRoadmapPage /> : <Navigate to="/login" />
          } />
          <Route path="/user/posts/:slug" element={
            isAuthenticated ? <UserPostDetail /> : <Navigate to="/login" />
          } />
          {/* User Post Editor - Full width, no sidebar (login required) */}
          <Route path="/user/posts/:id/edit" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><PostEditor />              </div>
            ) : <Navigate to="/login" />
          } />

          {/* Redirects for old routes */}
          <Route path="/user/feature-requests" element={<Navigate to="/user/all-posts" replace />} />
          <Route path="/user/dashboard" element={<Navigate to="/user/all-posts" replace />} />
          <Route path="/user/boards" element={<Navigate to="/user/all-posts" replace />} />
          <Route path="/user/changelog" element={<Navigate to="/user/all-posts" replace />} />
          <Route path="/user/settings" element={<Navigate to="/user/all-posts" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAdmin ? "/admin/dashboard" : "/user/all-posts"} />} />
        </Routes>
      </Suspense>
      <CustomToaster />
      <BannedDialog />
    </BrowserRouter>
  );
}

// Global socket bridge — joins 'feed' room and syncs vote/comment counts across all pages
function FeedSocketBridge({ enabled }: { enabled: boolean }) {
  useFeedSocket(enabled);
  return null;
}

// Listens for 'navigate' messages from the service worker (push click) and routes to the URL
function PushNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!pushNotifications.isSupported()) return;
    pushNotifications.registerServiceWorker().catch(() => {});

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'navigate' && typeof event.data.url === 'string') {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [navigate]);

  return null;
}

export default App;
