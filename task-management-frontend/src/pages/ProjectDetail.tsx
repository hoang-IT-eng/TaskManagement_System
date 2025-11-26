import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import type { Project, ProjectTask, CreateTaskRequest, TaskAttachment } from '../types';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [taskFormData, setTaskFormData] = useState<CreateTaskRequest>({
    title: '',
    description: '',
    status: 'Todo',
    priority: 'Medium',
    dueDate: ''
  });

  useEffect(() => {
    if (id) {
      loadProjectData();
    }
  }, [id]);

  const loadProjectData = async () => {
    try {
      const [projectData, tasksData] = await Promise.all([
        apiService.getProject(Number(id)),
        apiService.getProjectTasks(Number(id))
      ]);
      setProject(projectData);
      setTasks(tasksData);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createTask(Number(id), taskFormData);
      setShowTaskModal(false);
      setTaskFormData({ title: '', description: '', status: 'Todo', priority: 'Medium', dueDate: '' });
      loadProjectData();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'success';
      case 'InProgress': return 'primary';
      case 'InReview': return 'info';
      case 'Cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'danger';
      case 'High': return 'warning';
      case 'Medium': return 'info';
      default: return 'secondary';
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

  if (!project) {
    return (
      <div className="container" style={{ paddingTop: '40px' }}>
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <h2>Project not found</h2>
          <Link to="/projects"><button className="btn btn-primary mt-2">Back to Projects</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px', paddingBottom: '40px' }}>
      {/* Project Header */}
      <div className="card mb-3">
        <div className="flex-between mb-3">
          <div>
            <div className="flex" style={{ gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
              <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>{project.name}</h1>
              <span className={`badge badge-${
                project.status === 'Completed' ? 'success' :
                project.status === 'InProgress' ? 'primary' :
                project.status === 'OnHold' ? 'warning' :
                project.status === 'Cancelled' ? 'danger' : 'secondary'
              }`}>
                {project.status}
              </span>
              <span className={`badge badge-${
                project.priority === 'Critical' ? 'danger' :
                project.priority === 'High' ? 'warning' :
                project.priority === 'Medium' ? 'info' : 'secondary'
              }`}>
                {project.priority}
              </span>
            </div>
            <p style={{ color: 'var(--gray-600)' }}>{project.description || 'No description'}</p>
          </div>
          <Link to="/projects">
            <button className="btn btn-secondary">← Back</button>
          </Link>
        </div>

        <div className="grid grid-4" style={{ marginTop: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Owner</div>
            <div style={{ fontWeight: '500' }}>👤 {project.ownerName}</div>
          </div>
          {project.budget && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Budget</div>
              <div style={{ fontWeight: '500' }}>💰 ${project.budget.toLocaleString()}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Created</div>
            <div style={{ fontWeight: '500' }}>{new Date(project.createdAt).toLocaleDateString()}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginBottom: '4px' }}>Tasks</div>
            <div style={{ fontWeight: '500' }}>📝 {tasks.length} tasks</div>
          </div>
        </div>
      </div>

      {/* Tasks Section */}
      <div className="card">
        <div className="flex-between mb-3">
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>📋 Tasks</h2>
          <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
            + Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--gray-500)' }}>
            <p>No tasks yet. Create your first task!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tasks.map((task) => (
              <div 
                key={task.taskId}
                className="card"
                style={{ 
                  borderLeft: `4px solid var(--${getStatusColor(task.status)})`
                }}
              >
                <div className="flex-between">
                  <div style={{ flex: 1 }}>
                    <div className="flex" style={{ gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600' }}>{task.title}</h4>
                      <span className={`badge badge-${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`badge badge-${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      {task.assigneeName && <span>👤 {task.assigneeName} • </span>}
                      {task.dueDate && (
                        <span>📅 Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-header">Create New Task</h2>

            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input
                  type="text"
                  className="input"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="input"
                    value={taskFormData.status}
                    onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value as any })}
                  >
                    <option value="Todo">Todo</option>
                    <option value="InProgress">In Progress</option>
                    <option value="InReview">In Review</option>
                    <option value="Done">Done</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="input"
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as any })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;


