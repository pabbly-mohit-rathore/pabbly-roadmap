import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/admin/Layout';
import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';
import useTeamAccessStore from './store/teamAccessStore';

// Lazy load all pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const RoadmapPage = lazy(() => import('./pages/RoadmapPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const InvitePage = lazy(() => import('./pages/InvitePage'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminFeedback = lazy(() => import('./pages/admin/Feedback'));
const AdminRoadmap = lazy(() => import('./pages/admin/Roadmap'));
const AdminBoardDetail = lazy(() => import('./pages/admin/BoardDetail'));
const AdminPostDetail = lazy(() => import('./pages/admin/PostDetail'));
const ChangelogEditor = lazy(() => import('./pages/admin/ChangelogEditor'));
const ChangelogView = lazy(() => import('./pages/admin/ChangelogView'));
const BoardManagement = lazy(() => import('./pages/admin/BoardManagement'));
const AdminBoardMembers = lazy(() => import('./pages/admin/BoardMembers'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const UserBoardsPage = lazy(() => import('./pages/user/BoardsPage'));
const UserRoadmapPage = lazy(() => import('./pages/user/RoadmapPage'));
const UserBoardDetail = lazy(() => import('./pages/user/BoardDetail'));
const UserPostDetail = lazy(() => import('./pages/user/PostDetail'));
const UserChangelog = lazy(() => import('./pages/user/Changelog'));
const UserChangelogDetail = lazy(() => import('./pages/user/ChangelogDetail'));

// Helper to check if user has invite access
function hasInviteAccess() {
  return Object.keys(localStorage || {}).some(key => key.startsWith('invite_'));
}

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

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/user/boards" />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/user/boards" />} />
          <Route path="/invite/:token" element={<InvitePage />} />

          {/* User Routes */}
          <Route path="/" element={
            isAuthenticated ? (
              isAdmin ? (
                <Navigate to="/admin/dashboard" />
              ) : (
                <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                  <Navbar />
                  <RoadmapPage />
                  <Toaster position="top-right" />
                </div>
              )
            ) : (
              <Navigate to="/login" />
            )
          } />

          <Route path="/board/:slug" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><BoardPage /><Toaster position="top-right" />
              </div>
            ) : <Navigate to="/login" />
          } />

          <Route path="/post/:slug" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><PostDetailPage /><Toaster position="top-right" />
              </div>
            ) : <Navigate to="/login" />
          } />

          <Route path="/roadmap" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><RoadmapPage /><Toaster position="top-right" />
              </div>
            ) : <Navigate to="/login" />
          } />

          <Route path="/profile" element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><ProfilePage /><Toaster position="top-right" />
              </div>
            ) : <Navigate to="/login" />
          } />

          {/* Changelog Editor - Full width, no sidebar */}
          <Route path="/admin/changelog/:id/edit" element={
            isAuthenticated && canAccessAdmin ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar /><ChangelogEditor /><Toaster position="top-right" />
              </div>
            ) : <Navigate to="/login" />
          } />

          {/* Changelog View */}
          <Route path="/admin/changelog/:id/view" element={
            isAuthenticated && canAccessAdmin ? (
              <><AdminLayout><ChangelogView /></AdminLayout><Toaster position="top-right" /></>
            ) : <Navigate to="/login" />
          } />

          {/* Admin Routes */}
          <Route path="/admin/*" element={
            isAuthenticated && canAccessAdmin ? (
              <>
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="feedback" element={<AdminFeedback />} />
                    <Route path="roadmap" element={<AdminRoadmap />} />
                    <Route path="board-management" element={<BoardManagement />} />
                    <Route path="boards/:boardId" element={<AdminBoardDetail />} />
                    <Route path="boards/:id/members" element={<AdminBoardMembers />} />
                    <Route path="posts/:postId" element={<AdminPostDetail />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="changelog/:id/view" element={<ChangelogView />} />
                    <Route path="settings" element={<AdminSettings />} />
                  </Routes>
                </AdminLayout>
                <Toaster position="top-right" />
              </>
            ) : <Navigate to="/login" />
          } />

          {/* User Protected Routes */}
          <Route path="/user/boards" element={
            isAuthenticated || hasInviteAccess() ? <><UserBoardsPage /><Toaster position="top-right" /></> : <Navigate to="/login" />
          } />
          <Route path="/user/roadmap" element={
            isAuthenticated || hasInviteAccess() ? <><UserRoadmapPage /><Toaster position="top-right" /></> : <Navigate to="/login" />
          } />
          <Route path="/user/boards/:boardId" element={
            isAuthenticated || hasInviteAccess() ? <><UserBoardDetail /><Toaster position="top-right" /></> : <Navigate to="/login" />
          } />
          <Route path="/user/posts/:slug" element={
            isAuthenticated || hasInviteAccess() ? <><UserPostDetail /><Toaster position="top-right" /></> : <Navigate to="/login" />
          } />
          <Route path="/user/changelog" element={
            isAuthenticated || hasInviteAccess() ? <><UserChangelog /><Toaster position="top-right" /></> : <Navigate to="/login" />
          } />
          <Route path="/user/changelog/:id" element={
            isAuthenticated || hasInviteAccess() ? <><UserChangelogDetail /><Toaster position="top-right" /></> : <Navigate to="/login" />
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to={isAdmin ? "/admin/dashboard" : "/"} />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
