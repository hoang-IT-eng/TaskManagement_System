import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import type { User } from '../types';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      const [usersData, statsData] = await Promise.all([
        apiService.getAllUsers(page, 20),
        apiService.getSystemStatistics()
      ]);
      setUsers(usersData.data);
      setTotal(usersData.total);
      setSystemStats(statsData);
    } catch (error) {
      console.error('Failed to load admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      await apiService.updateUserRole(userId, newRole);
      loadData();
      alert('User role updated successfully');
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="flex-center" style={{ minHeight: '400px' }}>
          <div className="loading" style={{ width: '40px', height: '40px', borderColor: 'var(--primary)' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
        ⚙️ Admin Panel
      </h1>
      <p style={{ color: 'var(--gray-600)', marginBottom: '32px' }}>
        Manage users and system settings
      </p>

      {/* System Statistics */}
      {systemStats && (
        <div className="grid grid-4 mb-4">
          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>👥</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)' }}>
              {systemStats.totalUsers}
            </div>
            <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Total Users</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📁</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
              {systemStats.totalProjects}
            </div>
            <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Total Projects</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--info)' }}>
              {systemStats.totalTasks}
            </div>
            <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Total Tasks</div>
          </div>

          <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)' }}>
              {Math.round(systemStats.completionRate)}%
            </div>
            <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Completion Rate</div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
          👥 User Management
        </h2>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--gray-200)', textAlign: 'left' }}>
                <th style={{ padding: '12px', fontWeight: '600', fontSize: '14px', color: 'var(--gray-700)' }}>
                  User
                </th>
                <th style={{ padding: '12px', fontWeight: '600', fontSize: '14px', color: 'var(--gray-700)' }}>
                  Email
                </th>
                <th style={{ padding: '12px', fontWeight: '600', fontSize: '14px', color: 'var(--gray-700)' }}>
                  Role
                </th>
                <th style={{ padding: '12px', fontWeight: '600', fontSize: '14px', color: 'var(--gray-700)' }}>
                  Created
                </th>
                <th style={{ padding: '12px', fontWeight: '600', fontSize: '14px', color: 'var(--gray-700)' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '500' }}>{user.fullName}</div>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--gray-600)', fontSize: '14px' }}>
                    {user.email}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge badge-${
                      user.role === 'Admin' ? 'danger' :
                      user.role === 'ProjectManager' ? 'warning' : 'info'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--gray-600)', fontSize: '14px' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {user.role !== 'Admin' && (
                      <select
                        className="input"
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.userId, e.target.value)}
                      >
                        <option value="Member">Member</option>
                        <option value="ProjectManager">ProjectManager</option>
                        <option value="Admin">Admin</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex-between mt-3" style={{ paddingTop: '20px', borderTop: '1px solid var(--gray-200)' }}>
          <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} users
          </div>
          <div className="flex" style={{ gap: '8px' }}>
            <button 
              className="btn btn-sm btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ← Previous
            </button>
            <button 
              className="btn btn-sm btn-secondary"
              disabled={page * 20 >= total}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;


