import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '1rem 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div className="container flex-between">
        <Link to="/" style={{ textDecoration: 'none', color: 'white' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            📋 Task Management
          </h1>
        </Link>

        {isAuthenticated && (
          <div className="flex" style={{ gap: '24px', alignItems: 'center' }}>
            <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>
              Dashboard
            </Link>
            <Link to="/projects" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>
              Projects
            </Link>
            <Link to="/reports" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>
              Reports
            </Link>
            {user?.role === 'Admin' && (
              <Link to="/admin" style={{ color: 'white', textDecoration: 'none', fontWeight: 500 }}>
                Admin
              </Link>
            )}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '14px' }}>👤 {user?.fullName}</span>
              <button 
                onClick={handleLogout}
                className="btn btn-sm"
                style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}
              >
                Logout
              </button>
            </div>
          </div>
        )}

        {!isAuthenticated && (
          <div className="flex" style={{ gap: '12px' }}>
            <Link to="/login">
              <button className="btn btn-sm" style={{ background: 'white', color: '#667eea' }}>
                Login
              </button>
            </Link>
            <Link to="/register">
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                Register
              </button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;


