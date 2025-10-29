import os
import asyncio
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage
from pathlib import Path
import logging

from document_processor import DocumentProcessor
from text_chunker import TextChunker
from chroma_manager import ChromaDBManager

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

class RAGService:
    """RAG service that handles document processing, embedding, and LLM generation"""
    
    def __init__(self):
        # Initialize components
        self.document_processor = DocumentProcessor()
        self.text_chunker = TextChunker(chunk_size=1000, chunk_overlap=200)
        
        chroma_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
        embedding_model = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        self.chroma_manager = ChromaDBManager(chroma_dir, embedding_model)
        
        # Initialize LLM
        self.api_key = os.getenv("EMERGENT_LLM_KEY")
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY environment variable is required")
        
        self.llm_chat = LlmChat(
            api_key=self.api_key,
            session_id="smr_intelliassist",
            system_message="""You are DMR IntelliAssist, an expert assistant for Dry Methane Reformer operations. 
You have access to technical documentation and operational data. 

When answering questions:
1. Use the provided context to give accurate, specific answers
2. Focus on DMR processes, equipment, safety, and operational procedures
3. If the context doesn't contain relevant information, clearly state that you couldn't find relevant information in the current dataset
4. Be concise but comprehensive in your responses
5. Always prioritize safety and operational best practices

Answer questions professionally and provide actionable insights when possible."""
        ).with_model("openai", "gpt-4o-mini")
        
        # RAG data directory
        self.data_dir = os.getenv("RAG_DATA_DIR", "./rag_app/data")
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info("RAG service initialized successfully")
    
    async def initialize_knowledge_base(self):
        """Load and index all documents from the data directory"""
        try:
            logger.info(f"Initializing knowledge base from: {self.data_dir}")
            
            # Process all documents in the data directory
            documents = self.document_processor.process_directory(self.data_dir)
            
            if not documents:
                logger.warning(f"No documents found in {self.data_dir}")
                return {"status": "no_documents", "count": 0}
            
            # Try to create collection (will get existing if it exists)
            try:
                self.chroma_manager.create_collection("smr_documents")
                logger.info("Collection created or retrieved successfully")
            except Exception as e:
                logger.error(f"Failed to create/get collection: {str(e)}")
                # Try to clear and recreate
                try:
                    self.chroma_manager.clear_collection("smr_documents")
                except Exception as clear_error:
                    logger.error(f"Failed to clear collection: {str(clear_error)}")
                    return {"status": "error", "error": f"Collection management failed: {str(e)}"}
            
            # Chunk all documents
            all_chunks = []
            for doc in documents:
                if doc['success']:
                    chunks = self.text_chunker.chunk_document(doc)
                    all_chunks.extend(chunks)
                    logger.info(f"Processed {doc['filename']}: {len(chunks)} chunks")
            
            if not all_chunks:
                logger.warning("No chunks generated from documents")
                return {"status": "no_chunks", "count": 0}
            
            # Add to ChromaDB
            self.chroma_manager.add_documents(all_chunks, "smr_documents")
            
            collection_info = self.chroma_manager.get_collection_info("smr_documents")
            
            logger.info(f"Knowledge base initialized: {collection_info['count']} chunks from {len(documents)} documents")
            
            return {
                "status": "success",
                "documents_processed": len(documents),
                "chunks_created": len(all_chunks),
                "collection_count": collection_info['count']
            }
            
        except Exception as e:
            logger.error(f"Error initializing knowledge base: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def process_uploaded_file(self, file_path: str) -> Dict[str, Any]:
        """Process a newly uploaded file and add to knowledge base"""
        try:
            logger.info(f"Processing uploaded file: {file_path}")
            
            # Process the document
            document = self.document_processor.process_document(file_path)
            
            if not document['success']:
                return {
                    "status": "error",
                    "error": document.get('error', 'Failed to process document')
                }
            
            # Chunk the document
            chunks = self.text_chunker.chunk_document(document)
            
            if not chunks:
                return {
                    "status": "error",
                    "error": "No chunks generated from document"
                }
            
            # Add to ChromaDB
            self.chroma_manager.add_documents(chunks, "smr_documents")
            
            logger.info(f"Added {len(chunks)} chunks from {document['filename']} to knowledge base")
            
            return {
                "status": "success",
                "filename": document['filename'],
                "chunks_created": len(chunks)
            }
            
        except Exception as e:
            logger.error(f"Error processing uploaded file: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def query_rag(self, query: str, max_context_chunks: int = 5) -> Dict[str, Any]:
        """Query the RAG system with context retrieval and LLM generation"""
        try:
            logger.info(f"Processing RAG query: {query}")
            
            # Retrieve relevant context from ChromaDB
            retrieval_result = self.chroma_manager.query_collection(
                query_text=query,
                n_results=max_context_chunks,
                collection_name="smr_documents"
            )
            
            if retrieval_result.get('error'):
                return {
                    "answer": "I couldn't find relevant information in the current dataset. Please check the uploaded files or add relevant documents to the knowledge base.",
                    "sources": [],
                    "context_used": False,
                    "error": retrieval_result['error']
                }
            
            relevant_chunks = retrieval_result['results']
            
            if not relevant_chunks:
                return {
                    "answer": "I couldn't find relevant information in the current dataset. Please check the uploaded files or add relevant documents to the knowledge base.",
                    "sources": [],
                    "context_used": False
                }
            
            # Filter chunks with good relevance scores (distance < 0.7)
            good_chunks = [chunk for chunk in relevant_chunks if chunk.get('distance', 1.0) < 0.7]
            
            if not good_chunks:
                return {
                    "answer": "I couldn't find sufficiently relevant information in the current dataset. Please check the uploaded files or add more specific documents to the knowledge base.",
                    "sources": [],
                    "context_used": False
                }
            
            # Prepare context for LLM
            context_parts = []
            sources = []
            
            for i, chunk in enumerate(good_chunks):
                context_parts.append(f"Context {i+1}:\n{chunk['content']}")
                
                source_info = {
                    "document": chunk['metadata'].get('source_file', 'Unknown'),
                    "relevance": chunk.get('relevance_score', 0),
                    "chunk": chunk['metadata'].get('chunk_index', 0)
                }
                sources.append(source_info)
            
            context_text = "\n\n".join(context_parts)
            
            # Create prompt with context
            prompt = f"""Based on the following context about Dry Methane Reformer operations, please answer the user's question.

Context:
{context_text}

User Question: {query}

Please provide a comprehensive answer based on the context. If the context doesn't fully address the question, mention what information is available and what might be missing."""
            
            # Generate response using LLM
            user_message = UserMessage(text=prompt)
            response = await self.llm_chat.send_message(user_message)
            
            logger.info(f"Generated RAG response for query: {query}")
            
            return {
                "answer": response,
                "sources": sources,
                "context_used": True,
                "chunks_retrieved": len(relevant_chunks),
                "chunks_used": len(good_chunks)
            }
            
        except Exception as e:
            logger.error(f"Error in RAG query: {str(e)}")
            return {
                "answer": "I encountered an error while processing your question. Please try again or contact support if the issue persists.",
                "sources": [],
                "context_used": False,
                "error": str(e)
            }
    
    def get_knowledge_base_info(self) -> Dict[str, Any]:
        """Get information about the current knowledge base"""
        try:
            collection_info = self.chroma_manager.get_collection_info("smr_documents")
            
            # Get list of files in data directory
            data_path = Path(self.data_dir)
            files = []
            if data_path.exists():
                for file_path in data_path.iterdir():
                    if file_path.is_file() and file_path.suffix.lower() in {'.pdf', '.txt', '.csv', '.json'}:
                        files.append({
                            "name": file_path.name,
                            "size": file_path.stat().st_size,
                            "type": file_path.suffix.lower()
                        })
            
            return {
                "collection_info": collection_info,
                "data_directory": self.data_dir,
                "files_available": files,
                "total_files": len(files)
            }
            
        except Exception as e:
            logger.error(f"Error getting knowledge base info: {str(e)}")
            return {"error": str(e)}

# Global RAG service instance
rag_service = None

async def get_rag_service() -> RAGService:
    """Get or create the RAG service instance"""
    global rag_service
    if rag_service is None:
        rag_service = RAGService()
        # Initialize knowledge base on first access
        await rag_service.initialize_knowledge_base()
    return rag_service