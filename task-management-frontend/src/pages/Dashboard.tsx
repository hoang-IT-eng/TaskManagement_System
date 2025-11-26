import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Project, ProjectStatistics } from '../types';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [statistics, setStatistics] = useState<ProjectStatistics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, statsData] = await Promise.all([
        apiService.getProjects(),
        apiService.getMyProjectsStatistics()
      ]);
      setProjects(projectsData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Planning': 'badge-secondary',
      'InProgress': 'badge-primary',
      'Completed': 'badge-success',
      'OnHold': 'badge-warning',
      'Cancelled': 'badge-danger'
    };
    return colors[status] || 'badge-secondary';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Low': 'badge-secondary',
      'Medium': 'badge-info',
      'High': 'badge-warning',
      'Critical': 'badge-danger'
    };
    return colors[priority] || 'badge-secondary';
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
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            Welcome back, {user?.fullName}! 👋
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>Here's what's happening with your projects</p>
        </div>
        <Link to="/projects/new">
          <button className="btn btn-primary btn-lg">+ New Project</button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-4 mb-4">
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📊</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)' }}>
            {projects.length}
          </div>
          <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Total Projects</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
            {statistics.reduce((sum, s) => sum + s.completedTasks, 0)}
          </div>
          <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Completed Tasks</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📝</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--info)' }}>
            {statistics.reduce((sum, s) => sum + s.totalTasks, 0)}
          </div>
          <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Total Tasks</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📈</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)' }}>
            {statistics.length > 0 
              ? Math.round(statistics.reduce((sum, s) => sum + s.completionRate, 0) / statistics.length) 
              : 0}%
          </div>
          <div style={{ color: 'var(--gray-600)', fontSize: '14px' }}>Avg Completion</div>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>
          📂 Recent Projects
        </h2>

        {projects.length === 0 ? (
          <div className="text-center" style={{ padding: '40px' }}>
            <p style={{ color: 'var(--gray-500)', marginBottom: '16px' }}>
              No projects yet. Create your first project to get started!
            </p>
            <Link to="/projects/new">
              <button className="btn btn-primary">+ Create Project</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-2">
            {projects.slice(0, 6).map((project) => {
              const projectStats = statistics.find(s => s.projectId === project.projectId);
              
              return (
                <div 
                  key={project.projectId} 
                  className="card" 
                  style={{ 
                    borderLeft: `4px solid var(--primary)`,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  onClick={() => window.location.href = `/projects/${project.projectId}`}
                >
                  <div className="flex-between mb-2">
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{project.name}</h3>
                    <span className={`badge ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>

                  <p style={{ 
                    color: 'var(--gray-600)', 
                    fontSize: '14px', 
                    marginBottom: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {project.description || 'No description'}
                  </p>

                  <div className="flex-between" style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    <span>👤 {project.ownerName}</span>
                    <span className={`badge ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>

                  {projectStats && (
                    <div style={{ 
                      marginTop: '12px', 
                      paddingTop: '12px', 
                      borderTop: '1px solid var(--gray-200)' 
                    }}>
                      <div className="flex-between" style={{ fontSize: '13px' }}>
                        <span style={{ color: 'var(--gray-600)' }}>
                          {projectStats.completedTasks}/{projectStats.totalTasks} tasks
                        </span>
                        <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                          {Math.round(projectStats.completionRate)}%
                        </span>
                      </div>
                      <div style={{ 
                        marginTop: '6px',
                        height: '4px',
                        background: 'var(--gray-200)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${projectStats.completionRate}%`,
                          background: 'var(--success)',
                          transition: 'width 0.3s'
                        }}></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {projects.length > 6 && (
          <div className="text-center mt-3">
            <Link to="/projects">
              <button className="btn btn-secondary">View All Projects →</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;


