import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Project, CreateProjectRequest } from '../types';

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    name: '',
    description: '',
    status: 'Planning',
    priority: 'Medium',
    startDate: '',
    endDate: '',
    budget: undefined
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createProject(formData);
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        status: 'Planning',
        priority: 'Medium',
        startDate: '',
        endDate: '',
        budget: undefined
      });
      loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('Failed to create project');
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
      <div className="flex-between mb-4">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
            📂 All Projects
          </h1>
          <p style={{ color: 'var(--gray-600)' }}>Manage your projects</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            No projects yet
          </h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: '20px' }}>
            Create your first project to get started
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-3">
          {projects.map((project) => (
            <Link 
              key={project.projectId} 
              to={`/projects/${project.projectId}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div 
                className="card" 
                style={{ 
                  borderLeft: `4px solid var(--primary)`,
                  cursor: 'pointer',
                  height: '100%',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                }}
              >
                <div className="flex-between mb-2">
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>{project.name}</h3>
                  <span className={`badge badge-${
                    project.status === 'Completed' ? 'success' :
                    project.status === 'InProgress' ? 'primary' :
                    project.status === 'OnHold' ? 'warning' :
                    project.status === 'Cancelled' ? 'danger' : 'secondary'
                  }`}>
                    {project.status}
                  </span>
                </div>

                <p style={{ 
                  color: 'var(--gray-600)', 
                  fontSize: '14px', 
                  marginBottom: '12px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {project.description || 'No description'}
                </p>

                <div style={{ marginTop: 'auto' }}>
                  <div className="flex-between" style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '8px' }}>
                    <span>👤 {project.ownerName}</span>
                    <span className={`badge badge-${
                      project.priority === 'Critical' ? 'danger' :
                      project.priority === 'High' ? 'warning' :
                      project.priority === 'Medium' ? 'info' : 'secondary'
                    }`}>
                      {project.priority}
                    </span>
                  </div>

                  {project.budget && (
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      💰 Budget: ${project.budget.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-header">Create New Project</h2>

            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Planning">Planning</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="OnHold">On Hold</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="input"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Budget</label>
                <input
                  type="number"
                  className="input"
                  value={formData.budget || ''}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;


