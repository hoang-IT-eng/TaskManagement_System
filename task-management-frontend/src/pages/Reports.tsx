import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { ProjectStatistics, UserTaskStatistics } from '../types';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [projectStats, setProjectStats] = useState<ProjectStatistics[]>([]);
  const [userStats, setUserStats] = useState<UserTaskStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    try {
      const [projectsData, userData] = await Promise.all([
        apiService.getMyProjectsStatistics(),
        user ? apiService.getUserStatistics(user.userId) : Promise.resolve(null)
      ]);
      setProjectStats(projectsData);
      if (userData) setUserStats(userData);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
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
        📊 Reports & Statistics
      </h1>
      <p style={{ color: 'var(--gray-600)', marginBottom: '32px' }}>
        Track your progress and performance
      </p>

      {/* User Statistics */}
      {userStats && (
        <div className="card mb-4">
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
            👤 Your Performance
          </h2>

          <div className="grid grid-4">
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary)' }}>
                {userStats.assignedTasks}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Assigned Tasks</div>
            </div>

            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
                {userStats.completedTasks}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Completed</div>
            </div>

            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--info)' }}>
                {userStats.inProgressTasks}
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>In Progress</div>
            </div>

            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--warning)' }}>
                {Math.round(userStats.completionRate)}%
              </div>
              <div style={{ fontSize: '14px', color: 'var(--gray-600)' }}>Completion Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Project Statistics */}
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
          📂 Projects Overview
        </h2>

        {projectStats.length === 0 ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--gray-500)' }}>
            <p>No projects to display</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {projectStats.map((project) => (
              <div 
                key={project.projectId}
                className="card"
                style={{ borderLeft: `4px solid var(--primary)` }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>
                  {project.projectName}
                </h3>

                <div style={{ marginBottom: '16px' }}>
                  <div className="flex-between" style={{ fontSize: '14px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--gray-600)' }}>Total Tasks:</span>
                    <span style={{ fontWeight: '600' }}>{project.totalTasks}</span>
                  </div>
                  <div className="flex-between" style={{ fontSize: '14px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--gray-600)' }}>Completed:</span>
                    <span style={{ fontWeight: '600', color: 'var(--success)' }}>
                      {project.completedTasks}
                    </span>
                  </div>
                  <div className="flex-between" style={{ fontSize: '14px' }}>
                    <span style={{ color: 'var(--gray-600)' }}>Completion Rate:</span>
                    <span style={{ fontWeight: '600', color: 'var(--primary)' }}>
                      {Math.round(project.completionRate)}%
                    </span>
                  </div>
                </div>

                <div style={{
                  height: '8px',
                  background: 'var(--gray-200)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${project.completionRate}%`,
                    background: project.completionRate === 100 
                      ? 'var(--success)' 
                      : 'var(--primary)',
                    transition: 'width 0.3s'
                  }}></div>
                </div>

                {project.tasksByStatus && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray-200)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '8px' }}>
                      Tasks by Status:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {Object.entries(project.tasksByStatus).map(([status, count]) => (
                        <span key={status} className="badge badge-secondary" style={{ fontSize: '11px' }}>
                          {status}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;


