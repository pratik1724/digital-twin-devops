import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const ROLES = [
  { value: 'admin', label: 'Admin', color: '#3b82f6' },
  { value: 'read_only', label: 'Read-only', color: '#6b7280' }
];

function RoleBadge({ role }) {
  const roleInfo = ROLES.find(r => r.value === role) || ROLES[1];
  return (
    <span 
      className="role-badge"
      style={{ backgroundColor: `${roleInfo.color}20`, color: roleInfo.color }}
    >
      {roleInfo.label}
    </span>
  );
}

function CreateUserModal({ isOpen, onClose, onUserCreated }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'read_only'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newUser = await response.json();
        onUserCreated(newUser);
        setFormData({ username: '', password: '', role: 'read_only' });
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }

    setIsLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="user-modal-overlay">
      <div className="user-modal">
        <div className="user-modal-header">
          <h2>Create New User</h2>
          <button 
            className="user-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="user-form">
          {error && (
            <div className="user-form-error">
              {error}
            </div>
          )}
          
          <div className="user-form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              required
              minLength={3}
              maxLength={50}
              className="user-form-input"
              placeholder="Enter username"
            />
          </div>
          
          <div className="user-form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength={6}
              maxLength={100}
              className="user-form-input"
              placeholder="Enter password"
            />
          </div>
          
          <div className="user-form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              className="user-form-select"
            >
              {ROLES.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="user-form-actions">
            <button
              type="button"
              onClick={onClose}
              className="user-form-button user-form-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="user-form-button user-form-button-primary"
            >
              {isLoading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserRow({ user, onDeleteUser, currentUserId }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleteUser(user.id);
      } else {
        alert('Failed to delete user');
      }
    } catch (err) {
      alert('Network error. Please try again.');
    }
    setIsDeleting(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isCurrentUser = user.id === currentUserId;

  return (
    <tr className="user-row">
      <td className="user-cell">
        <div className="user-info">
          <span className="user-name">{user.username}</span>
          {isCurrentUser && <span className="user-current-badge">You</span>}
        </div>
      </td>
      <td className="user-cell">
        <RoleBadge role={user.role} />
      </td>
      <td className="user-cell user-cell-secondary">
        {formatDate(user.created_at)}
      </td>
      <td className="user-cell user-cell-secondary">
        {user.created_by || 'System'}
      </td>
      <td className="user-cell">
        {!isCurrentUser && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="user-delete-button"
          >
            {isDeleting ? '...' : 'Delete'}
          </button>
        )}
      </td>
    </tr>
  );
}

export function UserManagement({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/users`);
      if (response.ok) {
        const userData = await response.json();
        setUsers(userData);
      } else {
        setError('Failed to load users');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setIsLoading(false);
  };

  const handleUserCreated = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUserDeleted = (userId) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  if (!isOpen) return null;

  return (
    <div className="user-management-overlay">
      <div className="user-management-panel">
        <div className="user-management-header">
          <h2>User Management</h2>
          <button 
            className="user-management-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        
        <div className="user-management-actions">
          <button
            onClick={() => setShowCreateModal(true)}
            className="user-create-button"
          >
            + Create User
          </button>
        </div>
        
        <div className="user-management-content">
          {error && (
            <div className="user-management-error">
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="user-management-loading">
              Loading users...
            </div>
          ) : (
            <div className="user-table-container">
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onDeleteUser={handleUserDeleted}
                      currentUserId={currentUser?.id}
                    />
                  ))}
                </tbody>
              </table>
              
              {users.length === 0 && !isLoading && (
                <div className="user-empty-state">
                  No users found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  );
}

export default UserManagement;