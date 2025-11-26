import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Reports from './pages/Reports';
import AdminPanel from './pages/AdminPanel';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="loading" style={{ width: '40px', height: '40px', borderColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="loading" style={{ width: '40px', height: '40px', borderColor: 'var(--primary)' }}></div>
      </div>
    );
  }

  return isAuthenticated && user?.role === 'Admin' ? <>{children}</> : <Navigate to="/dashboard" />;
};

function AppContent() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/dashboard" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        
        <Route path="/projects" element={
          <PrivateRoute><Projects /></PrivateRoute>
        } />
        
        <Route path="/projects/:id" element={
          <PrivateRoute><ProjectDetail /></PrivateRoute>
        } />
        
        <Route path="/reports" element={
          <PrivateRoute><Reports /></PrivateRoute>
        } />
        
        <Route path="/admin" element={
          <AdminRoute><AdminPanel /></AdminRoute>
        } />
        
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;


