# Frontend - SMR Dashboard React Application

## Overview

The frontend is a modern React 18 application that provides the user interface for the SMR Dashboard Digital Twin Platform. It features a responsive design with dark theme, interactive data visualizations, and three distinct simulation interfaces.

## 📁 Folder Structure

```
frontend/
├── README.md                         # This documentation
├── package.json                      # Dependencies and scripts
├── .env                             # Environment variables
├── .env.example                     # Environment template
├── tailwind.config.js               # Tailwind CSS configuration
├── postcss.config.js                # PostCSS configuration
├── craco.config.js                  # CRACO configuration for webpack
├── public/
│   ├── index.html                   # Main HTML template
│   └── viewer/
│       └── index.html               # TwinMaker 3D viewer embed
└── src/
    ├── index.js                     # Application entry point
    ├── App.js                       # Main application component & routing
    ├── App.css                      # Global styles and component styling
    ├── index.css                    # Base CSS and Tailwind imports
    ├── components/                  # Reusable UI components
    │   ├── auth/                    # Authentication components
    │   │   ├── LoginGate.jsx        # Authentication wrapper
    │   │   ├── LoginForm.jsx        # Login form component
    │   │   └── ProtectedRoute.jsx   # Route protection component
    │   ├── expert/                  # RAG Assistant components
    │   │   └── SMRExpert.jsx        # RAG chat interface
    │   ├── metrics/                 # Dashboard metrics components
    │   │   ├── KPIGrid.jsx          # Main metrics grid layout
    │   │   ├── TrendsPanel.jsx      # Sparkline chart component
    │   │   └── MetricDetailModal.jsx # Enhanced detail modal with zoom/pan
    │   ├── process/                 # Process flow components
    │   │   ├── ProcessFlow.jsx      # Process flow diagram
    │   │   └── ProcessTree.jsx      # Hierarchical process view
    │   ├── scene/                   # 3D visualization components
    │   │   ├── Scene3D.jsx          # Three.js 3D scene wrapper
    │   │   └── SceneViewer.jsx      # 3D viewer integration
    │   ├── ui/                      # Base UI components (shadcn/ui)
    │   │   ├── calendar.jsx         # Calendar component
    │   │   ├── hover-card.jsx       # Hover card component
    │   │   ├── input.jsx            # Input field component
    │   │   ├── toast.jsx            # Toast notification component
    │   │   ├── toaster.jsx          # Toast container
    │   │   └── tooltip.jsx          # Tooltip component
    │   └── user/                    # User management components
    │       └── UserManagement.jsx   # Admin user management interface
    ├── pages/                       # Main application pages
    │   ├── Dashboard.jsx            # Main metrics dashboard page
    │   ├── Landing.jsx              # Application landing page
    │   ├── Metrics.jsx              # Detailed metrics view page
    │   ├── SimulationConsole.jsx    # Enhanced simulation console
    │   └── DigitalTwinsLanding.jsx  # Digital twins platform landing
    ├── lib/                         # Data handling and utilities
    │   ├── csvDataReader.js         # CSV data processing and caching
    │   ├── sitewise.js              # Unified data source interface
    │   └── mockSitewise.js          # Mock data provider for testing
    ├── config/                      # Configuration files
    │   ├── smr-map.js               # Metrics mapping and configuration
    │   ├── auth.json                # Authentication configuration
    │   ├── aws-temp-creds.js        # AWS credentials (temporary)
    │   └── tag_mapping.json         # Tag mapping configuration
    ├── hooks/                       # Custom React hooks
    │   └── use-toast.js             # Toast notification hook
    ├── services/                    # External service integrations
    │   └── twinMakerDataSource.js   # AWS TwinMaker integration
    └── utils/                       # Utility functions
```

## 🧩 Core Components

### Authentication Layer (`/components/auth/`)

#### **LoginForm.jsx**
- **Purpose**: Handles user authentication with username/password
- **Features**: Form validation, loading states, error handling
- **Integration**: Connects to `/api/auth/login` endpoint
- **Data Flow**: User input → Form validation → API call → User context update

#### **ProtectedRoute.jsx** 
- **Purpose**: Route protection based on authentication status
- **Logic**: Checks localStorage for authentication token, redirects to login if not found
- **Usage**: Wraps protected pages in App.js routing

### Metrics Dashboard (`/components/metrics/`)

#### **KPIGrid.jsx**
- **Purpose**: Main metrics display component with card layout
- **Features**: 
  - Renders 25+ metric cards in sectioned layout (Inlet/Outlet)
  - Handles modal opening for detailed views
  - Real-time data updates via sitewise.js integration
- **Data Flow**: `sitewise.js` → `getLiveValue()` + `getAggregates()` → Card rendering

#### **TrendsPanel.jsx** 
- **Purpose**: Sparkline chart component for time-series data visualization
- **Features**:
  - SVG-based chart rendering with automatic scaling
  - Loading states and error handling
  - Responsive design with minimum dimensions
- **Data Processing**: `points[] → validation → scaling → SVG path generation`

#### **MetricDetailModal.jsx**
- **Purpose**: Enhanced modal with detailed metric analysis
- **Features**:
  - Zoom and pan capabilities via canvas
  - Interactive chart controls (Zoom In/Out/Reset)
  - Statistics display (Min/Max/Avg)
  - Set Value and Process Value comparison

### Enhanced Simulation Console (`/pages/SimulationConsole.jsx`)

#### **Three Simulation Types Architecture**
```javascript
SimulationConsole
├── Dropdown Selector (CFD/ML/FOP)
├── CFD Simulation (Original)
│   ├── SimulationInputPanel → Parameter inputs
│   └── SimulationResultsPanel → 3D visualization + results
├── ML Simulation 
│   ├── MLSimulationPanel → Model info display
│   └── MLResultsPanel → Predictions + bar chart
└── FOP Simulation
    ├── FOPSimulationPanel → Cantera parameter inputs
    └── FOPResultsPanel → Conversions + outlet composition
```

#### **Simulation Data Flow**:
1. **User Selection**: Dropdown changes `simulationType` state
2. **Parameter Input**: Appropriate form renders based on selection
3. **Execution**: Button click triggers API call to respective endpoint
4. **Results Display**: Backend response parsed and visualized

## 📊 Data Architecture

### CSV Data Integration (`/lib/csvDataReader.js`)
- **Purpose**: CSV data processing and caching system
- **Features**:
  - Synchronous data loading from `/data/smr_metrics/latest.csv`
  - Time-series data parsing with timestamp handling
  - Metric key normalization for Process/Set values
- **Key Methods**:
  ```javascript
  loadCSVDataSync()     // Initial data loading
  getLiveValue(key)     // Current metric value retrieval
  getAggregates(key)    // Historical trend data
  getCurrentTimestamp() // Playback time management
  ```

### Unified Data Interface (`/lib/sitewise.js`)
- **Purpose**: Abstracts data source (CSV/AWS SiteWise)
- **Features**: Consistent API for components, error handling
- **Integration**: All metric components use this interface

### Configuration Management (`/config/smr-map.js`)
- **Purpose**: Central metrics configuration and mapping
- **Structure**:
  ```javascript
  export const inletMetrics = [...]   // Inlet flowrates, temperatures
  export const outletMetrics = [...]  // Outlet flowrates, bed temperature  
  export const setValues = {...}      // Set point configurations
  ```

## 🎨 Styling & UI

### Technology Stack
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn/UI**: Modern component library
- **Dark Theme**: Consistent color scheme throughout
- **Responsive Design**: Mobile-first approach

### Key Style Categories
```css
/* Simulation Console Styles */
.simulation-console, .simulation-panel, .simulation-selector

/* Metrics Dashboard Styles */  
.metric-card, .trends-panel, .modal-overlay

/* Authentication Styles */
.login-form, .protected-route
```

## 🚀 Development Setup

### Prerequisites & Installation
```bash
Node.js 18+
Yarn package manager

# Installation
cd frontend
yarn install
```

### Available Scripts
```bash
yarn start          # Start development server (port 3000)
yarn build          # Production build
yarn test           # Run test suite
yarn eject          # Eject from CRA (not recommended)
```

### Environment Variables
```bash
# .env file
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_BRAND_NAME=AnukaranAI
REACT_APP_BRAND_LOGO=/brand.png
REACT_APP_DEV_MODE=true
```

## 🔄 Application Flow

### Authentication Flow
```
Login Page → Credentials → /api/auth/login → localStorage → Protected Routes
```

### Metrics Dashboard Flow
```
1. csvDataReader loads /data/smr_metrics/latest.csv
2. sitewise.js provides unified interface
3. KPIGrid renders metric cards with sparklines
4. "Click for Details" opens enhanced modal with zoom/pan
```

### Simulation Execution Flow
```
1. User selects simulation type (CFD/ML/FOP)
2. Appropriate input form renders
3. Parameters submitted to backend API
4. Results displayed with charts and statistics
```

## 🧪 Testing & Quality

### Component Testing Strategy
- Unit tests for critical components
- Integration tests for API interactions
- End-to-end testing for simulation workflows

### Common Issues & Solutions
```javascript
// Metrics not displaying → Check smr-map.js propertyId mapping
// Sparklines not rendering → Verify getAggregates() data format
// Simulation errors → Check backend API endpoints
// Performance issues → Implement React.memo and data caching
```

## 📱 Responsive Design

### Breakpoint Strategy
- Mobile First: 640px, 768px, 1024px, 1280px
- **KPIGrid**: Auto-responsive columns
- **SimulationConsole**: Two-column desktop, single-column mobile
- **Navigation**: Collapsible menu on smaller screens

## 🔮 Future Enhancements

### Technical Improvements
1. **TypeScript Migration**: Add type safety
2. **State Management**: Redux/Zustand for complex state
3. **PWA Support**: Offline capabilities
4. **Performance**: Code splitting and lazy loading

### Feature Enhancements
1. **Real-time Updates**: WebSocket integration
2. **Advanced Charts**: D3.js/Chart.js integration
3. **Export Capabilities**: CSV/PDF export
4. **Collaborative Features**: Multi-user sharing

---

**Related Documentation:**
- [Backend API](../backend/README.md)
- [Simulation Scripts](../simulation/README.md)
- [Main Project](../README.md)
