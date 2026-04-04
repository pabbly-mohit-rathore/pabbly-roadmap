import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/admin/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import BoardPage from './pages/BoardPage';
import PostDetailPage from './pages/PostDetailPage';
import RoadmapPage from './pages/RoadmapPage';
import ProfilePage from './pages/ProfilePage';
import InvitePage from './pages/InvitePage';
import AdminDashboard from './pages/admin/Dashboard';
import AdminFeedback from './pages/admin/Feedback';
import AdminRoadmap from './pages/admin/Roadmap';
import AdminBoardDetail from './pages/admin/BoardDetail';
import AdminPostDetail from './pages/admin/PostDetail';
import ChangelogEditor from './pages/admin/ChangelogEditor';
import ChangelogView from './pages/admin/ChangelogView';
import BoardManagement from './pages/admin/BoardManagement';
import AdminBoardMembers from './pages/admin/BoardMembers';
import AdminSettings from './pages/admin/Settings';
import AdminUsers from './pages/admin/Users';
import UserBoardsPage from './pages/user/BoardsPage';
import UserRoadmapPage from './pages/user/RoadmapPage';
import UserBoardDetail from './pages/user/BoardDetail';
import UserPostDetail from './pages/user/PostDetail';
import UserChangelog from './pages/user/Changelog';
import UserChangelogDetail from './pages/user/ChangelogDetail';
import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';

// Helper to check if user has invite access
function hasInviteAccess() {
  const hasInviteInLocalStorage = Object.keys(localStorage || {}).some(key =>
    key.startsWith('invite_')
  );
  return hasInviteInLocalStorage;
}

// Route wrapper for protected routes - allow access with invite token
function ProtectedUserRoute({ Component }: { Component: React.ComponentType }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasInvite = hasInviteAccess();

  if (!isAuthenticated && !hasInvite) {
    return <Navigate to="/login" />;
  }

  return <Component />;
}

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

        <Route
          path="/board/:slug"
          element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar />
                <BoardPage />
                <Toaster position="top-right" />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/post/:slug"
          element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar />
                <PostDetailPage />
                <Toaster position="top-right" />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/roadmap"
          element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar />
                <RoadmapPage />
                <Toaster position="top-right" />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar />
                <ProfilePage />
                <Toaster position="top-right" />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Changelog Editor - Full width, no sidebar */}
        <Route
          path="/admin/changelog/:id/edit"
          element={
            isAuthenticated && isAdmin ? (
              <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-950' : 'bg-[#fafafa]'}`}>
                <Navbar />
                <ChangelogEditor />
                <Toaster position="top-right" />
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Changelog View - Full width with AdminLayout */}
        <Route
          path="/admin/changelog/:id/view"
          element={
            isAuthenticated && isAdmin ? (
              <>
                <AdminLayout>
                  <ChangelogView />
                </AdminLayout>
                <Toaster position="top-right" />
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
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* User Protected Routes - Allow with invite access */}
        <Route
          path="/user/boards"
          element={
            isAuthenticated || hasInviteAccess() ? (
              <>
                <UserBoardsPage />
                <Toaster position="top-right" />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/user/roadmap"
          element={
            isAuthenticated || hasInviteAccess() ? (
              <>
                <UserRoadmapPage />
                <Toaster position="top-right" />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/user/boards/:boardId"
          element={
            isAuthenticated || hasInviteAccess() ? (
              <>
                <UserBoardDetail />
                <Toaster position="top-right" />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route
          path="/user/posts/:slug"
          element={
            isAuthenticated || hasInviteAccess() ? (
              <>
                <UserPostDetail />
                <Toaster position="top-right" />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* User Changelog Routes */}
        <Route
          path="/user/changelog"
          element={
            isAuthenticated || hasInviteAccess() ? (
              <>
                <UserChangelog />
                <Toaster position="top-right" />
              </>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/user/changelog/:id"
          element={
            isAuthenticated || hasInviteAccess() ? (
              <>
                <UserChangelogDetail />
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
