Test
# SMR Dashboard - Digital Twin Platform

## Overview

The SMR (Steam Methane Reforming) Dashboard is a comprehensive digital twin platform that provides real-time monitoring, simulation capabilities, and AI-powered insights for industrial reactor operations. Built with a modern React frontend and FastAPI backend, it offers three distinct simulation types and advanced data visualization.

## 🏗️ Architecture Overview

```
Frontend (React) → API Layer (FastAPI) → Simulation Engine (Python/Cantera) → Database (MongoDB)
                ↓
            Data Sources (CSV/AWS SiteWise) → Metrics Dashboard → 3D Visualization
```

## 📁 Project Structure

```
/app/
├── README.md                          # This file - Master documentation
├── frontend/                          # React.js frontend application
│   ├── src/
│   │   ├── components/               # Reusable UI components
│   │   │   ├── auth/                # Authentication components
│   │   │   ├── expert/              # RAG assistant (SMR IntelliAssist)
│   │   │   ├── metrics/             # Dashboard metrics components
│   │   │   ├── process/             # Process flow components
│   │   │   ├── scene/               # 3D visualization components
│   │   │   ├── ui/                  # Base UI components
│   │   │   └── user/                # User management components
│   │   ├── pages/                   # Main application pages
│   │   │   ├── Dashboard.jsx        # Main metrics dashboard
│   │   │   ├── SimulationConsole.jsx # Enhanced simulation console
│   │   │   ├── Metrics.jsx          # Detailed metrics view
│   │   │   └── DigitalTwinsLanding.jsx # Landing page
│   │   ├── lib/                     # Data handling and utilities
│   │   │   ├── csvDataReader.js     # CSV data processing
│   │   │   ├── sitewise.js          # Data source interface
│   │   │   └── mockSitewise.js      # Mock data for testing
│   │   ├── config/                  # Configuration files
│   │   │   ├── smr-map.js           # Metrics mapping configuration
│   │   │   ├── auth.json            # Authentication configuration
│   │   │   └── tag_mapping.json     # Tag mapping configuration
│   │   └── services/                # External service integrations
│   ├── public/                      # Static assets
│   │   ├── viewer/                  # TwinMaker 3D viewer
│   │   └── index.html               # Main HTML template
│   ├── package.json                 # Frontend dependencies
│   └── .env                         # Environment variables
├── backend/                          # FastAPI backend server
│   ├── server.py                    # Main FastAPI application
│   ├── rag_service.py               # RAG assistant service
│   ├── document_processor.py        # Document processing utilities
│   ├── text_chunker.py              # Text chunking for RAG
│   ├── chroma_manager.py            # ChromaDB vector store manager
│   ├── requirements.txt             # Backend dependencies
│   └── .env                         # Backend environment variables
├── simulation/                       # Simulation engines
│   └── pfr_drm_cantera.py           # First Order Principle simulation
├── data/                            # Data storage
│   └── smr_metrics/                 # Metrics CSV data files
│       ├── latest.csv               # Current metrics data (symlink)
│       └── complete_mock_6h.csv     # Complete 6-hour dataset
├── rag_app/                         # RAG knowledge base
│   └── data/                        # Knowledge base documents
│       ├── smr_overview.txt         # SMR process overview
│       ├── flow_control_systems.txt # Flow control documentation
│       └── safety_procedures.txt    # Safety procedures
├── tests/                           # Test files
├── scripts/                         # Utility scripts
├── docker-compose.yml               # Container orchestration
├── Dockerfile.frontend              # Frontend container definition
├── Dockerfile.backend               # Backend container definition
└── smr.glb                          # 3D model for visualization
```

## 🚀 Key Features

### 1. **Real-time Metrics Dashboard**
- Live data visualization with sparkline charts
- 25+ process metrics (inlet/outlet flowrates, temperatures, pressures)
- Interactive detail modals with zoom/pan capabilities
- CSV-based data integration with 6-hour historical trends

### 2. **Enhanced Simulation Console** (Three Simulation Types)

#### **CFD Simulation** (Default)
- Computational Fluid Dynamics modeling
- Interactive parameter input (flowrates, temperature, pressure)
- 3D visualization with rotating reactor geometry
- Results display with mesh information and convergence status

#### **Machine Learning ANN Simulation**
- Artificial Neural Network predictions
- Dummy model demonstrating ML integration
- Interactive bar charts showing predictions
- Model accuracy and performance metrics

#### **First Order Principle Simulation**
- Cantera-based kinetic modeling
- Parameter inputs: T_C, P_bar, flowrates, GHSV
- Backend integration with Python script execution
- Detailed results: conversions, yields, outlet composition

### 3. **SMR IntelliAssist (RAG Assistant)**
- AI-powered knowledge base queries
- Context-aware responses about SMR processes
- Document processing and vector search
- Integration with process documentation

### 4. **3D Digital Twin Visualization**
- Interactive 3D reactor model (smr.glb)
- Real-time data overlay
- Scene navigation and inspection tools

### 5. **Authentication & Role-Based Access**
- Admin and read-only user roles
- Secure authentication system
- User management capabilities

## 🔄 Application Flow

### Data Flow Architecture
```
1. CSV Data → csvDataReader.js → sitewise.js → React Components
2. User Input → Frontend → FastAPI → Simulation Scripts → Results Display
3. RAG Queries → ChromaDB → Vector Search → AI Response → Frontend
```

### Simulation Execution Flow
```
1. User selects simulation type via dropdown
2. Frontend renders appropriate input form
3. User configures parameters and clicks "Run Simulation"
4. Frontend sends POST request to backend API
5. Backend processes request:
   - CFD: Returns mock results with processing simulation
   - ML: Returns dummy predictions with model metrics
   - FOP: Executes pfr_drm_cantera.py script with parameters
6. Results parsed and displayed in structured format
7. Charts and visualizations updated in real-time
```

### Dashboard Metrics Flow
```
1. csvDataReader loads data from /data/smr_metrics/latest.csv
2. sitewise.js provides unified data interface
3. KPIGrid component renders metric cards with:
   - Current values from getLiveValue()
   - Trend data from getAggregates()
   - Sparkline charts via TrendsPanel
4. Modal details triggered by "Click for Details"
5. Enhanced charts with zoom/pan capabilities
```

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router** - Navigation
- **Three.js** - 3D visualization
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library

### Backend
- **FastAPI** - Python web framework
- **MongoDB** - Database
- **ChromaDB** - Vector database for RAG
- **Cantera** - Chemical kinetics simulation
- **Pydantic** - Data validation

### Simulation & AI
- **Cantera** - First Order Principle simulations
- **OpenAI/Anthropic** - LLM integration via Emergent LLM key
- **NumPy/Pandas** - Scientific computing

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB
- Docker (optional)

### Quick Start
1. **Clone and setup:**
   ```bash
   cd /app
   
   # Backend setup
   cd backend
   pip install -r requirements.txt
   
   # Frontend setup
   cd ../frontend
   yarn install
   ```

2. **Environment Configuration:**
   - Copy `.env.example` to `.env` in both frontend and backend
   - Configure database and API endpoints

3. **Start Services:**
   ```bash
   # Backend
   cd backend && uvicorn server:app --reload --host 0.0.0.0 --port 8001
   
   # Frontend
   cd frontend && yarn start
   ```

4. **Access Application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8001
   - Login: Username="User", Password="India@12"

## 📊 Usage Examples

### Running First Order Principle Simulation
1. Navigate to Simulation Console
2. Select "First Order Principle Simulation" from dropdown
3. Configure parameters:
   - Temperature: 825°C
   - Pressure: 1.0 bar
   - CH4 flowrate: 700 ml/min
   - CO2 flowrate: 300 ml/min
4. Click "Run Simulation"
5. View results in structured format

### Viewing Metrics Dashboard
1. Navigate to SMR Metrics Dashboard
2. View real-time sparkline charts for all metrics
3. Click "Click for Details" on any metric
4. Explore enhanced charts with zoom/pan controls

### Using RAG Assistant
1. Click "SMR IntelliAssist" button
2. Ask questions about SMR processes
3. Receive context-aware responses from knowledge base

## 🔮 Future Extension Points

### 1. **Real-time Data Integration**
- Connect to AWS SiteWise for live industrial data
- Implement WebSocket connections for real-time updates
- Add data validation and quality checks

### 2. **Advanced Machine Learning**
- Replace dummy ML simulation with trained models
- Implement model training pipeline
- Add prediction confidence intervals

### 3. **Enhanced 3D Visualization**
- Add temperature/pressure overlays
- Implement virtual sensors
- Real-time animation based on process data

### 4. **Process Optimization**
- Add optimization algorithms
- Implement what-if scenarios
- Automated parameter tuning

### 5. **Extended Simulation Capabilities**
- Add more reaction mechanisms
- Implement dynamic simulations
- Connect to external CFD solvers

## 📝 Development Guidelines

### Code Organization
- Follow React component best practices
- Use TypeScript for type safety (future enhancement)
- Implement proper error handling and logging
- Maintain API documentation with FastAPI auto-docs

### Testing Strategy
- Unit tests for critical components
- Integration tests for API endpoints
- End-to-end testing for simulation workflows
- Performance testing for large datasets

### Deployment
- Docker containers for easy deployment
- Environment-specific configurations
- Health checks and monitoring
- Automated CI/CD pipeline

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive README files for new features
3. Include proper error handling and logging
4. Test all simulation workflows thoroughly
5. Update documentation for any API changes

## 📄 License

This project is developed for industrial digital twin applications. See LICENSE file for details.

---

For detailed documentation of specific components, see the README files in each subdirectory:
- [Frontend Documentation](./frontend/README.md)
- [Backend Documentation](./backend/README.md)
- [Simulation Documentation](./simulation/README.md)
