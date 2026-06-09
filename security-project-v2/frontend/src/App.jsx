import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar      from './components/Layout/Sidebar';
import Navbar       from './components/Layout/Navbar';
import ToastNotifications from './components/Notifications/Toast';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Home         from './pages/Home';
import SQLInjection from './pages/SQLInjection';
import XSSAttacks   from './pages/XSSAttacks';
import AttackLogs   from './pages/AttackLogs';
import CSRF         from './pages/CSRF';
import BruteForce   from './pages/BruteForce';
import PathTraversal from './pages/PathTraversal';
import Profile      from './pages/Profile';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => (
  <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
    <ToastNotifications />
  </div>
);

const Protected = ({ children }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

export default function App() {
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />

      {/* Routes protégées */}
      <Route path="/"               element={<Protected><Home /></Protected>} />
      <Route path="/sqli"           element={<Protected><SQLInjection /></Protected>} />
      <Route path="/xss"            element={<Protected><XSSAttacks /></Protected>} />
      <Route path="/logs"           element={<Protected><AttackLogs /></Protected>} />
      <Route path="/csrf"           element={<Protected><CSRF /></Protected>} />
      <Route path="/brute-force"    element={<Protected><BruteForce /></Protected>} />
      <Route path="/path-traversal" element={<Protected><PathTraversal /></Protected>} />
      <Route path="/profile"        element={<Protected><Profile /></Protected>} />
      <Route path="*"               element={<Navigate to="/" replace />} />
    </Routes>
  );
}
