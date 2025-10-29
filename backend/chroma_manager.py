import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from chromadb import Documents, EmbeddingFunction, Embeddings
from typing import List, Dict, Any, Optional
import uuid
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

class CustomEmbeddingFunction(EmbeddingFunction[Documents]):
    """Custom embedding function using sentence-transformers"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        try:
            self.model = SentenceTransformer(model_name)
            self.model_name = model_name
            logger.info(f"Loaded embedding model: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load embedding model {model_name}: {str(e)}")
            raise
    
    def __call__(self, input: Documents) -> Embeddings:
        """Generate embeddings for input documents"""
        try:
            embeddings = self.model.encode(input, convert_to_numpy=True)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise

class ChromaDBManager:
    """Manage ChromaDB operations for RAG system"""
    
    def __init__(self, persist_directory: str = "./chroma_data", 
                 embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"):
        self.persist_directory = persist_directory
        
        # Create directory if it doesn't exist
        Path(persist_directory).mkdir(parents=True, exist_ok=True)
        
        try:
            self.embedding_function = CustomEmbeddingFunction(embedding_model)
            
            # Initialize ChromaDB client with persistence
            self.client = chromadb.PersistentClient(
                path=persist_directory,
                settings=Settings(
                    anonymized_telemetry=False,
                    allow_reset=False
                )
            )
            
            self.collections = {}
            logger.info(f"ChromaDB initialized with persist directory: {persist_directory}")
            
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {str(e)}")
            raise
    
    def create_collection(self, collection_name: str = "smr_documents", 
                         metadata: Optional[Dict] = None) -> chromadb.Collection:
        """Create or get a collection with custom embedding function"""
        try:
            # Try to get existing collection first
            try:
                collection = self.client.get_collection(
                    name=collection_name,
                    embedding_function=self.embedding_function
                )
                logger.info(f"Retrieved existing collection: {collection_name}")
                self.collections[collection_name] = collection
                return collection
            except Exception as get_error:
                logger.info(f"Collection {collection_name} doesn't exist, creating new one: {str(get_error)}")
            
            # Collection doesn't exist, create new one
            collection = self.client.create_collection(
                name=collection_name,
                embedding_function=self.embedding_function,
                metadata=metadata or {"hnsw:space": "cosine", "description": "SMR RAG documents"}
            )
            logger.info(f"Created new collection: {collection_name}")
            
            self.collections[collection_name] = collection
            return collection
            
        except Exception as e:
            logger.error(f"Failed to create or get collection {collection_name}: {str(e)}")
            raise
    
    def add_documents(self, chunks: List[Dict[str, Any]], 
                     collection_name: str = "smr_documents"):
        """Add document chunks to ChromaDB collection"""
        if not chunks:
            logger.warning("No chunks to add to ChromaDB")
            return
        
        try:
            if collection_name not in self.collections:
                self.create_collection(collection_name)
            
            collection = self.collections[collection_name]
            
            # Prepare data for ChromaDB
            documents = []
            metadatas = []
            ids = []
            
            for chunk in chunks:
                # Generate unique ID for each chunk
                chunk_id = str(uuid.uuid4())
                
                # Extract content
                content = chunk.get('content', '').strip()
                if not content:
                    continue
                
                documents.append(content)
                
                # Prepare metadata (ChromaDB requires all values to be strings, numbers, or booleans)
                metadata = {
                    'document_id': str(chunk.get('document_id', 'unknown')),
                    'file_type': str(chunk.get('file_type', 'unknown')),
                    'chunk_index': int(chunk.get('chunk_index', 0)),
                    'total_chunks': int(chunk.get('total_chunks', 0)),
                    'chunk_size': int(chunk.get('chunk_size', 0)),
                    'chunk_type': str(chunk.get('chunk_type', 'unknown')),
                    'source_file': str(chunk.get('source_file', 'unknown'))
                }
                
                metadatas.append(metadata)
                ids.append(chunk_id)
            
            if not documents:
                logger.warning("No valid documents to add after filtering")
                return
            
            # Add to collection in batches to handle large datasets
            batch_size = 100
            for i in range(0, len(documents), batch_size):
                end_idx = min(i + batch_size, len(documents))
                
                collection.add(
                    documents=documents[i:end_idx],
                    metadatas=metadatas[i:end_idx],
                    ids=ids[i:end_idx]
                )
                
                logger.info(f"Added batch {i//batch_size + 1}: documents {i+1} to {end_idx}")
            
            logger.info(f"Successfully added {len(documents)} documents to collection {collection_name}")
            
        except Exception as e:
            logger.error(f"Error adding documents to ChromaDB: {str(e)}")
            raise
    
    def query_collection(self, query_text: str, n_results: int = 5, 
                        collection_name: str = "smr_documents",
                        filter_metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Query collection for similar documents"""
        try:
            if collection_name not in self.collections:
                # Try to get existing collection
                try:
                    self.create_collection(collection_name)
                except Exception as e:
                    logger.error(f"Collection {collection_name} not found and cannot be created: {str(e)}")
                    return {
                        'query': query_text,
                        'results': [],
                        'total_results': 0,
                        'error': f"Collection {collection_name} not found"
                    }
            
            collection = self.collections[collection_name]
            
            # Check if collection is empty
            if collection.count() == 0:
                logger.warning(f"Collection {collection_name} is empty")
                return {
                    'query': query_text,
                    'results': [],
                    'total_results': 0,
                    'error': "No documents found in the collection"
                }
            
            # Perform similarity search
            results = collection.query(
                query_texts=[query_text],
                n_results=min(n_results, collection.count()),
                where=filter_metadata
            )
            
            # Format results for easier consumption
            formatted_results = []
            if results['documents'] and results['documents'][0]:
                for i in range(len(results['documents'][0])):
                    formatted_results.append({
                        'content': results['documents'][0][i],
                        'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                        'distance': results['distances'][0][i] if results['distances'] else None,
                        'id': results['ids'][0][i],
                        'relevance_score': 1 - (results['distances'][0][i] if results['distances'] else 0)
                    })
            
            logger.info(f"Query '{query_text}' returned {len(formatted_results)} results")
            
            return {
                'query': query_text,
                'results': formatted_results,
                'total_results': len(formatted_results)
            }
            
        except Exception as e:
            logger.error(f"Error querying ChromaDB: {str(e)}")
            return {
                'query': query_text,
                'results': [],
                'total_results': 0,
                'error': str(e)
            }
    
    def get_collection_info(self, collection_name: str = "smr_documents") -> Dict[str, Any]:
        """Get information about a collection"""
        try:
            if collection_name not in self.collections:
                self.create_collection(collection_name)
            
            collection = self.collections[collection_name]
            
            return {
                'name': collection.name,
                'count': collection.count(),
                'metadata': collection.metadata or {}
            }
        except Exception as e:
            logger.error(f"Error getting collection info: {str(e)}")
            return {
                'name': collection_name,
                'count': 0,
                'metadata': {},
                'error': str(e)
            }
    
    def list_collections(self) -> List[str]:
        """List all available collections"""
        try:
            return [col.name for col in self.client.list_collections()]
        except Exception as e:
            logger.error(f"Error listing collections: {str(e)}")
            return []
    
    def clear_collection(self, collection_name: str = "smr_documents"):
        """Clear all documents from a collection"""
        try:
            if collection_name in self.collections:
                del self.collections[collection_name]
            
            # Delete and recreate collection
            try:
                self.client.delete_collection(name=collection_name)
                logger.info(f"Deleted collection: {collection_name}")
            except (ValueError, Exception) as e:
                logger.info(f"Collection {collection_name} didn't exist or couldn't be deleted: {str(e)}")
                pass  # Collection didn't exist or other error
            
            self.create_collection(collection_name)
            logger.info(f"Created/recreated collection: {collection_name}")
            
        except Exception as e:
            logger.error(f"Error clearing collection: {str(e)}")
            # Don't raise, just log the error and try to continue
            logger.info(f"Attempting to create collection {collection_name} anyway")
            try:
                self.create_collection(collection_name)
            except Exception as create_error:
                logger.error(f"Failed to create collection: {str(create_error)}")
                raise