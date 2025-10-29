import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserManagement } from '../components/user/UserManagement.jsx';

const BRAND = process.env.REACT_APP_BRAND_NAME || "AnukaranAI";
const BRAND_LOGO = process.env.REACT_APP_BRAND_LOGO || "/brand.png";

// Digital Twin configurations
const DIGITAL_TWINS = [
  {
    id: 'smr',
    title: 'Dry Methane Reformer Digital Twin',
    description: 'A focused dashboard with live metrics, a process flow, and a 3D scene viewer for monitoring DMR industrial processes.',
    route: '/dashboard',
    backgroundImage: 'https://images.unsplash.com/photo-1598528949011-f7e74c61aaea?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwxfHxyZWZpbmVyeSUyMGluZHVzdHJpYWwlMjBwbGFudHxlbnwwfHx8fDE3NTc0Mjg3NDZ8MA&ixlib=rb-4.1.0&q=85&w=800',
    category: 'Chemical Processing',
    status: 'Active'
  }
  // Future digital twins can be added here
  // {
  //   id: 'reactor',
  //   title: 'Nuclear Reactor Digital Twin',
  //   description: 'Advanced reactor monitoring and simulation platform.',
  //   route: '/reactor-dashboard',
  //   backgroundImage: 'url-to-reactor-image',
  //   category: 'Nuclear Energy',
  //   status: 'Coming Soon'
  // }
];

function DigitalTwinCard({ digitalTwin, onClick }) {
  return (
    <div 
      className="digital-twin-card"
      onClick={() => onClick(digitalTwin)}
    >
      <div 
        className="digital-twin-card-header"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${digitalTwin.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="digital-twin-card-status">
          <span className={`status-badge ${digitalTwin.status === 'Active' ? 'status-active' : 'status-coming-soon'}`}>
            {digitalTwin.status}
          </span>
        </div>
        <div className="digital-twin-card-category">
          {digitalTwin.category}
        </div>
      </div>
      
      <div className="digital-twin-card-content">
        <h3 className="digital-twin-card-title">{digitalTwin.title}</h3>
        <p className="digital-twin-card-description">{digitalTwin.description}</p>
        
        <div className="digital-twin-card-footer">
          <button className="digital-twin-card-button">
            {digitalTwin.status === 'Active' ? 'Open Dashboard' : 'Coming Soon'}
            <span className="digital-twin-card-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function DigitalTwinsLanding() {
  const navigate = useNavigate();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Load user info from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem('dmr_user_data') || localStorage.getItem('smr_user_data');
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('dmr_authenticated');
    localStorage.removeItem('dmr_user'); 
    localStorage.removeItem('dmr_user_data');
    // Clean up old SMR keys for migration
    localStorage.removeItem('smr_authenticated');
    localStorage.removeItem('smr_user');
    localStorage.removeItem('smr_user_data');
    navigate('/');
  };

  const handleDigitalTwinClick = (digitalTwin) => {
    if (digitalTwin.status === 'Active') {
      navigate(digitalTwin.route);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="digital-twins-landing">
      <header className="digital-twins-header">
        <div className="brand" aria-label={BRAND}>
          <img src={BRAND_LOGO} alt="brand" className="brand-logo" onError={(e)=>{e.currentTarget.style.display='none'}} />
          <span className="digital-twins-brand-text">AnukaranAI</span>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <button 
              className="btn-outline"
              onClick={() => setShowUserManagement(true)}
              title="User Management"
            >
              ⚙️
            </button>
          )}
          <button className="btn-outline" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <main className="digital-twins-main">
        <div className="digital-twins-hero">
          <h1 className="digital-twins-title">Digital Twin Platform</h1>
          <p className="digital-twins-subtitle">
            Choose from our collection of advanced digital twin solutions. Each provides 
            real-time monitoring, predictive analytics, and AI-powered insights.
          </p>
        </div>

        <div className="digital-twins-grid">
          {DIGITAL_TWINS.map((digitalTwin) => (
            <DigitalTwinCard
              key={digitalTwin.id}
              digitalTwin={digitalTwin}
              onClick={handleDigitalTwinClick}
            />
          ))}
          
          {/* Placeholder cards for future digital twins */}
          <div className="digital-twin-card digital-twin-card-placeholder">
            <div className="digital-twin-card-header digital-twin-placeholder-header">
              <div className="digital-twin-placeholder-icon">🏭</div>
            </div>
            <div className="digital-twin-card-content">
              <h3 className="digital-twin-card-title">More Digital Twins</h3>
              <p className="digital-twin-card-description">
                Additional industrial process monitoring and simulation platforms coming soon.
              </p>
              <div className="digital-twin-card-footer">
                <button className="digital-twin-card-button" disabled>
                  Coming Soon
                  <span className="digital-twin-card-arrow">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="digital-twins-features">
          <div className="digital-twins-feature">
            <div className="digital-twins-feature-icon">📊</div>
            <h3>Real-time Monitoring</h3>
            <p>Live data streams and interactive dashboards</p>
          </div>
          <div className="digital-twins-feature">
            <div className="digital-twins-feature-icon">🔮</div>
            <h3>Predictive Analytics</h3>
            <p>AI-powered insights and forecasting</p>
          </div>
          <div className="digital-twins-feature">
            <div className="digital-twins-feature-icon">🎯</div>
            <h3>Process Optimization</h3>
            <p>Performance optimization and efficiency gains</p>
          </div>
        </div>
      </main>
      
      <UserManagement
        isOpen={showUserManagement}
        onClose={() => setShowUserManagement(false)}
        currentUser={currentUser}
      />
    </div>
  );
}

export default DigitalTwinsLanding;