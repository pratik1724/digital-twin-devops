# Backend - SMR Dashboard FastAPI Server

## Overview

The backend is a FastAPI-based Python server that provides RESTful APIs for the SMR Dashboard Digital Twin Platform. It handles authentication, simulation execution, RAG-based AI assistance, and data management through MongoDB integration.

## 📁 Folder Structure

```
backend/
├── README.md                        # This documentation
├── server.py                        # Main FastAPI application server
├── rag_service.py                   # RAG (Retrieval-Augmented Generation) service
├── document_processor.py            # Document processing utilities for RAG
├── text_chunker.py                  # Text chunking for vector embeddings
├── chroma_manager.py                # ChromaDB vector store management
├── requirements.txt                 # Python dependencies
└── .env                            # Environment variables (not in version control)
```

## 🔧 Core Components

### Main Application (`server.py`)

#### **FastAPI Application Setup**
- **Purpose**: Central API server with CORS configuration
- **Features**: 
  - RESTful API endpoints with `/api` prefix
  - MongoDB integration via Motor (async MongoDB driver)
  - Pydantic models for request/response validation
  - Comprehensive error handling and logging
- **Architecture**:
  ```python
  FastAPI App → API Router (/api prefix) → Endpoints → Business Logic → Database
  ```

#### **API Endpoints Overview**

##### **Authentication & User Management**
```python
POST /api/auth/login          # User authentication
GET  /api/users               # List all users (Admin only)
POST /api/users               # Create new user (Admin only) 
DELETE /api/users/{user_id}   # Delete user (Admin only)
```

##### **Simulation Endpoints**
```python
POST /api/simulation/run      # CFD simulation execution
POST /api/simulation/fop      # First Order Principle simulation
GET  /api/simulation/{id}     # Get simulation status
GET  /api/simulation          # List all simulations
```

##### **RAG Assistant Endpoints** 
```python
POST /api/rag/query          # Process knowledge base queries
GET  /api/rag/info           # Get knowledge base information
POST /api/rag/reinitialize   # Reinitialize knowledge base
```

##### **Utility Endpoints**
```python
GET  /api/                   # Health check
POST /api/status             # Status check with client info
GET  /api/assets/smr.glb     # Serve 3D model file
```

### Authentication System

#### **User Model & Validation**
```python
class UserRole(Enum):
    ADMIN = "admin"
    READ_ONLY = "read_only"

class UserResponse(BaseModel):
    id: str
    username: str
    role: UserRole
    created_at: datetime
    created_by: Optional[str]
```

#### **Authentication Flow**
1. **Login Request**: Client sends username/password to `/api/auth/login`
2. **User Validation**: Backend queries MongoDB users collection
3. **Response**: Returns user info with role for frontend authorization
4. **Session Management**: Frontend stores user data in localStorage

#### **Default Admin Setup**
```python
# Automatically creates default admin on startup
Username: "User"
Password: "India@12"
Role: "admin"
```

### Simulation Engine Integration

#### **CFD Simulation (`/api/simulation/run`)**
- **Purpose**: Handles Computational Fluid Dynamics simulation requests
- **Process**:
  1. Validates input parameters (flowrates, temperature, pressure)
  2. Stores parameters in MongoDB with unique simulation ID
  3. Returns mock results for demonstration (extensible to real CFD solver)
- **Response Format**:
  ```json
  {
    "simulation_id": "uuid",
    "status": "submitted|running|completed",
    "runtime": 45.2,
    "mesh_cells": 125000,
    "converged": true,
    "parameters": {...}
  }
  ```

#### **First Order Principle Simulation (`/api/simulation/fop`)**
- **Purpose**: Executes Cantera-based kinetic modeling
- **Process**:
  1. Receives FOP parameters (T_C, P_bar, flowrates, GHSV)
  2. Creates temporary JSON input file
  3. Executes `/app/simulation/pfr_drm_cantera.py` script via subprocess
  4. Parses output and returns structured results
- **Integration Flow**:
  ```python
  API Request → Parameter Validation → Temp File Creation → 
  Python Script Execution → Output Parsing → Response
  ```
- **Error Handling**: Fallback to demo results if script fails
- **Response Format**:
  ```json
  {
    "runtime": 8.5,
    "exit_temperature": 825.5,
    "conversion_ch4": 0.82,
    "conversion_co2": 0.79,
    "yield_h2": 0.75,
    "yield_co": 0.78,
    "outlet_composition": {
      "CH4": 0.12, "CO2": 0.08, "H2": 0.35, "CO": 0.33, "N2": 0.12
    }
  }
  ```

### RAG Assistant Service (`rag_service.py`)

#### **Knowledge Base Architecture**
- **Purpose**: AI-powered question answering about SMR processes
- **Components**:
  - **Document Processor**: Handles text files from `/rag_app/data/`
  - **Text Chunker**: Splits documents into semantic chunks
  - **ChromaDB Manager**: Vector storage and similarity search
  - **LLM Integration**: Emergent LLM key for OpenAI/Anthropic models

#### **RAG Pipeline Flow**
```python
1. Document Loading → Text Chunking → Embedding Generation → ChromaDB Storage
2. User Query → Vector Search → Context Retrieval → LLM Processing → Response
```

#### **Knowledge Base Files**
```
/rag_app/data/
├── smr_overview.txt           # SMR process fundamentals
├── flow_control_systems.txt   # Flow control documentation  
└── safety_procedures.txt      # Safety and operational procedures
```

#### **Query Processing (`/api/rag/query`)**
```python
async def process_rag_query(query: str):
    # 1. Vector similarity search in ChromaDB
    relevant_chunks = await vector_search(query)
    
    # 2. Context preparation
    context = prepare_context(relevant_chunks)
    
    # 3. LLM prompt construction
    prompt = f"Context: {context}\nQuestion: {query}\nAnswer:"
    
    # 4. LLM response generation
    response = await llm_client.generate(prompt)
    
    return response
```

### Database Layer (MongoDB)

#### **Collections Structure**
```javascript
// users collection
{
  "id": "uuid",
  "username": "string", 
  "password": "string",  // In production: hashed
  "role": "admin|read_only",
  "created_at": "datetime",
  "created_by": "string"
}

// simulations collection  
{
  "simulation_id": "uuid",
  "parameters": {...},
  "status": "running|completed|failed",
  "created_at": "datetime",
  "updated_at": "datetime",
  "runtime": "float",
  "results": {...}
}

// status_checks collection
{
  "id": "uuid",
  "client_name": "string",
  "timestamp": "datetime"
}
```

#### **Database Operations**
- **Motor Driver**: Async MongoDB operations
- **UUID Usage**: Avoids ObjectId serialization issues
- **Error Handling**: Proper exception handling for database operations
- **Connection Management**: Startup/shutdown lifecycle management

## 🚀 Dependencies & Requirements

### Core Dependencies (`requirements.txt`)
```
fastapi>=0.104.1              # Web framework
uvicorn[standard]>=0.24.0     # ASGI server
motor>=3.3.2                  # Async MongoDB driver
pymongo>=4.6.0                # MongoDB driver
pydantic>=2.5.0               # Data validation
python-dotenv>=1.0.0          # Environment variables
starlette>=0.27.0             # ASGI framework
```

### AI & RAG Dependencies
```
chromadb>=0.4.18              # Vector database
openai>=1.3.0                 # OpenAI API client
langchain>=0.0.350            # LLM framework
sentence-transformers>=2.2.2   # Text embeddings
numpy>=1.24.0                 # Scientific computing
pandas>=2.0.0                 # Data manipulation
```

### Simulation Dependencies
```
cantera>=3.0.0                # Chemical kinetics (for FOP simulation)
scipy>=1.11.0                 # Scientific computing
matplotlib>=3.7.0             # Plotting (optional)
```

## 🔧 Configuration & Environment

### Environment Variables (`.env`)
```bash
# Database Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=smr_dashboard

# CORS Configuration  
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# RAG Configuration
RAG_DATA_DIR=./rag_app/data
MAX_FILE_SIZE=10485760

# API Configuration
API_PREFIX=/api
DEBUG=true
```

### Startup Configuration
```python
# MongoDB connection on startup
@app.on_event("startup")
async def startup_db_client():
    await initialize_default_admin()
    
# Graceful shutdown
@app.on_event("shutdown") 
async def shutdown_db_client():
    client.close()
```

## 🚦 Development Setup

### Prerequisites
```bash
Python 3.9+
MongoDB (local or cloud)
Cantera library (for simulations)
```

### Installation & Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

### Production Deployment
```bash
# Production server
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4

# Docker deployment
docker build -t smr-backend .
docker run -p 8001:8001 smr-backend
```

## 📊 API Documentation

### Interactive API Docs
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc
- **OpenAPI Spec**: http://localhost:8001/openapi.json

### Authentication Examples
```python
# Login
POST /api/auth/login
{
  "username": "User",
  "password": "India@12"
}

# Response
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "User", 
    "role": "admin"
  },
  "message": "Login successful"
}
```

### Simulation Examples
```python
# FOP Simulation
POST /api/simulation/fop
{
  "T_C": 825.0,
  "P_bar": 1.0,
  "fCH4_mlpm": 700.0,
  "fCO2_mlpm": 300.0,
  "fN2_mlpm": 0.0,
  "GHSV": 10000.0
}

# RAG Query
POST /api/rag/query  
{
  "query": "What is steam methane reforming?"
}
```

## 🔄 Data Flow Architecture

### Request/Response Flow
```
1. Frontend Request → CORS Middleware → FastAPI Router → Endpoint Handler
2. Business Logic → Database Operations → Response Formation → JSON Response
```

### Simulation Execution Flow
```
1. Parameter Validation → Database Storage → Script Execution → Result Processing
2. Error Handling → Fallback Logic → Response Formatting → Client Response
```

### RAG Processing Flow
```  
1. Query Reception → ChromaDB Search → Context Assembly → LLM Processing
2. Response Generation → Source Attribution → Formatted Response → Client Delivery
```

## 🧪 Testing & Quality

### Testing Strategy
```python
# Unit Tests
pytest tests/test_auth.py
pytest tests/test_simulation.py
pytest tests/test_rag.py

# Integration Tests
pytest tests/test_api_integration.py

# Load Testing
locust -f tests/load_test.py
```

### Logging & Monitoring
```python
# Structured logging
import logging
logger = logging.getLogger(__name__)

# Request logging
@app.middleware("http")
async def log_requests(request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"{request.method} {request.url} - {response.status_code} - {process_time:.3f}s")
    return response
```

### Error Handling Patterns
```python
try:
    result = await database_operation()
    return result
except HTTPException:
    raise  # Re-raise HTTP exceptions
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

## 🔐 Security Considerations

### Current Implementation
- **Authentication**: Username/password based (basic)
- **Authorization**: Role-based access control (admin/read_only)
- **CORS**: Configured for specific origins
- **Input Validation**: Pydantic models for all endpoints

### Production Security Enhancements
```python
# Password hashing (future enhancement)
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT tokens (future enhancement)  
from jose import JWTError, jwt
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

# Rate limiting (future enhancement)
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
```

## 🚀 Performance Optimizations

### Async Operations
```python
# All database operations are async
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    return user

# Concurrent simulation processing
import asyncio
results = await asyncio.gather(*simulation_tasks)
```

### Caching Strategy
```python
# Redis caching (future enhancement)
import redis.asyncio as redis

# In-memory caching for RAG
from functools import lru_cache

@lru_cache(maxsize=100)
def get_embeddings(text: str):
    return embedding_model.encode(text)
```

## 🔮 Future Enhancements

### Technical Improvements
1. **Security**: JWT tokens, password hashing, rate limiting
2. **Performance**: Redis caching, connection pooling, async optimizations
3. **Monitoring**: Prometheus metrics, health checks, distributed tracing
4. **Testing**: Comprehensive test coverage, CI/CD integration

### Feature Extensions
1. **Real-time Updates**: WebSocket support for live simulation updates
2. **Advanced RAG**: Multi-document support, fine-tuned embeddings
3. **Simulation Integration**: Real CFD solver integration, HPC job submission
4. **Data Pipeline**: Automated data ingestion from industrial systems

### Scalability
1. **Microservices**: Split into simulation, auth, and RAG services
2. **Load Balancing**: Multiple server instances
3. **Database**: MongoDB sharding, read replicas
4. **Container Orchestration**: Kubernetes deployment

## 🐛 Common Issues & Solutions

### Database Connection Issues
```python
# Problem: MongoDB connection failures
# Solution: Check MONGO_URL in .env, ensure MongoDB is running
# Verify network connectivity and authentication

# Problem: ObjectId serialization errors
# Solution: Use UUID strings instead of ObjectId for all collections
```

### Simulation Execution Issues
```python  
# Problem: FOP simulation script not found
# Solution: Verify /app/simulation/pfr_drm_cantera.py exists
# Check script permissions and Python path

# Problem: Subprocess timeout
# Solution: Increase timeout in subprocess.run()
# Implement async subprocess execution
```

### RAG Service Issues
```python
# Problem: ChromaDB initialization errors
# Solution: Check RAG_DATA_DIR path and file permissions
# Verify embedding model downloads

# Problem: LLM API errors
# Solution: Check Emergent LLM key configuration
# Implement proper error handling and fallbacks
```

---

**Related Documentation:**
- [Frontend Components](../frontend/README.md)
- [Simulation Scripts](../simulation/README.md) 
- [Main Project](../README.md)