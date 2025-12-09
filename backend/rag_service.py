import os
import asyncio
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from pathlib import Path
import logging
import google.generativeai as genai

# --- Assumed Helper Class Imports ---
# Make sure you have these files in the same directory
# with the classes defined inside them.
from document_processor import DocumentProcessor
from text_chunker import TextChunker
from chroma_manager import ChromaDBManager

# Load environment variables from a .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RAGService:
    """
    RAG service that handles document processing, embedding, and LLM generation
    using Google Gemini.
    """
    
    def __init__(self):
        # Initialize components for document processing and storage
        self.document_processor = DocumentProcessor()
        self.text_chunker = TextChunker(chunk_size=1000, chunk_overlap=200)
        
        chroma_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_data")
        embedding_model = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        self.chroma_manager = ChromaDBManager(chroma_dir, embedding_model)
        
        # Initialize Google Gemini
        google_api_key = os.getenv("GOOGLE_API_KEY")
        if not google_api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is required. Please add it to your .env file.")
        
        genai.configure(api_key=google_api_key)
        
        # Set up the model
        self.model = genai.GenerativeModel(model_name="models/text-bison-001")
        
        # Define the system prompt for the chat model
        system_prompt = """You are DMR IntelliAssist, an expert assistant for Dry Methane Reformer operations. 
You have access to technical documentation and operational data. 

When answering questions:
1. Use the provided context to give accurate, specific answers.
2. Focus on DMR processes, equipment, safety, and operational procedures.
3. If the context doesn't contain relevant information, clearly state that you couldn't find relevant information in the current dataset.
4. Be concise but comprehensive in your responses.
5. Always prioritize safety and operational best practices.

Answer questions professionally and provide actionable insights when possible."""
        
        # Start a chat session with the system prompt as initial history
        self.chat = self.model.start_chat(history=[
            {'role': 'user', 'parts': [system_prompt]},
            {'role': 'model', 'parts': ["Understood. I am DMR IntelliAssist, ready to help with your questions on Dry Methane Reformer operations."]}
        ])
        
        # Set up the directory for RAG data
        self.data_dir = os.getenv("RAG_DATA_DIR", "./rag_app/data")
        Path(self.data_dir).mkdir(parents=True, exist_ok=True)
        
        logger.info("RAG service initialized successfully with Google Gemini.")
    
    async def initialize_knowledge_base(self):
        """Load and index all documents from the data directory"""
        try:
            logger.info(f"Initializing knowledge base from: {self.data_dir}")
            
            # Process all documents in the data directory
            documents = self.document_processor.process_directory(self.data_dir)
            
            if not documents:
                logger.warning(f"No documents found in {self.data_dir}")
                return {"status": "no_documents", "count": 0}
            
            # Create or get the ChromaDB collection
            self.chroma_manager.create_collection("smr_documents")
            logger.info("Collection 'smr_documents' created or retrieved successfully.")

            # Chunk all documents
            all_chunks = []
            for doc in documents:
                if doc.get('success'):
                    chunks = self.text_chunker.chunk_document(doc)
                    all_chunks.extend(chunks)
                    logger.info(f"Processed {doc['filename']}: {len(chunks)} chunks")
            
            if not all_chunks:
                logger.warning("No chunks were generated from the documents.")
                return {"status": "no_chunks", "count": 0}
            
            # Add chunks to ChromaDB
            self.chroma_manager.add_documents(all_chunks, "smr_documents")
            
            collection_info = self.chroma_manager.get_collection_info("smr_documents")
            logger.info(f"Knowledge base initialized: {collection_info.get('count', 0)} chunks from {len(documents)} documents.")
            
            return {
                "status": "success",
                "documents_processed": len(documents),
                "chunks_created": len(all_chunks),
                "collection_count": collection_info.get('count', 0)
            }
        except Exception as e:
            logger.error(f"Error initializing knowledge base: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}
    
    async def process_uploaded_file(self, file_path: str) -> Dict[str, Any]:
        """Process a newly uploaded file and add it to the knowledge base"""
        try:
            logger.info(f"Processing uploaded file: {file_path}")
            
            document = self.document_processor.process_document(file_path)
            
            if not document.get('success'):
                error_msg = document.get('error', 'Failed to process document')
                return {"status": "error", "error": error_msg}
            
            chunks = self.text_chunker.chunk_document(document)
            
            if not chunks:
                return {"status": "error", "error": "No chunks generated from document"}
            
            self.chroma_manager.add_documents(chunks, "smr_documents")
            logger.info(f"Added {len(chunks)} chunks from {document.get('filename')} to knowledge base.")
            
            return {
                "status": "success",
                "filename": document.get('filename'),
                "chunks_created": len(chunks)
            }
        except Exception as e:
            logger.error(f"Error processing uploaded file: {e}", exc_info=True)
            return {"status": "error", "error": str(e)}
    
    async def query_rag(self, query: str, max_context_chunks: int = 5) -> Dict[str, Any]:
        """Query the RAG system with context retrieval and LLM generation"""
        try:
            logger.info(f"Processing RAG query: '{query}'")
            
            # Retrieve relevant context from ChromaDB
            retrieval_result = self.chroma_manager.query_collection(
                query_text=query,
                n_results=max_context_chunks,
                collection_name="smr_documents"
            )
            
            if retrieval_result.get('error'):
                return {
                    "answer": "I couldn't find relevant information. The knowledge base might be empty or unavailable.",
                    "sources": [], "context_used": False, "error": retrieval_result['error']
                }
            
            relevant_chunks = retrieval_result.get('results', [])
            
            if not relevant_chunks:
                return {
                    "answer": "I couldn't find relevant information in the current dataset. Please add relevant documents to the knowledge base.",
                    "sources": [], "context_used": False
                }
            
            # Filter chunks by a relevance threshold (lower distance is better)
            good_chunks = [chunk for chunk in relevant_chunks if chunk.get('distance', 1.0) < 0.7]
            
            if not good_chunks:
                return {
                    "answer": "I found some information, but it may not be relevant enough to answer your question accurately.",
                    "sources": [], "context_used": False
                }
            
            # Prepare context and sources for the LLM
            context_parts = []
            sources = []
            for i, chunk in enumerate(good_chunks):
                context_parts.append(f"Context {i+1}:\n{chunk.get('content', '')}")
                source_info = {
                    "document": chunk.get('metadata', {}).get('source_file', 'Unknown'),
                    "relevance_score": 1 - chunk.get('distance', 1.0), # Convert distance to a similarity score
                    "chunk_index": chunk.get('metadata', {}).get('chunk_index', 0)
                }
                sources.append(source_info)
            
            context_text = "\n\n".join(context_parts)
            
            # Create the final prompt for the LLM
            prompt = f"""Based on the following context about Dry Methane Reformer operations, please answer the user's question.

Context:
{context_text}

User Question: {query}

Please provide a comprehensive answer based only on the context provided. If the context doesn't fully address the question, state what is missing."""
            
            # Generate response using Gemini
            response = await self.chat.send_message_async(prompt)
            answer = response.text
            
            logger.info(f"Generated RAG response for query: '{query}'")
            
            return {
                "answer": answer,
                "sources": sources,
                "context_used": True,
                "chunks_retrieved": len(relevant_chunks),
                "chunks_used": len(good_chunks)
            }
        except Exception as e:
            logger.error(f"Error in RAG query: {e}", exc_info=True)
            return {
                "answer": "I encountered an error while processing your question. Please try again.",
                "sources": [], "context_used": False, "error": str(e)
            }
    
    def get_knowledge_base_info(self) -> Dict[str, Any]:
        """Get information about the current knowledge base"""
        try:
            collection_info = self.chroma_manager.get_collection_info("smr_documents")
            
            # Get list of files in the data directory
            data_path = Path(self.data_dir)
            files = []
            if data_path.exists():
                for file_path in data_path.iterdir():
                    if file_path.is_file():
                        files.append({
                            "name": file_path.name,
                            "size_bytes": file_path.stat().st_size,
                            "extension": file_path.suffix.lower()
                        })
            
            return {
                "collection_info": collection_info,
                "data_directory": self.data_dir,
                "files_in_directory": files,
                "total_files": len(files)
            }
        except Exception as e:
            logger.error(f"Error getting knowledge base info: {e}", exc_info=True)
            return {"error": str(e)}

# --- Singleton Pattern for RAG Service ---
# This ensures only one instance of the RAG service is created and initialized.
rag_service_instance = None

async def get_rag_service() -> RAGService:
    """Dependency injector to get or create the RAG service instance."""
    global rag_service_instance
    if rag_service_instance is None:
        rag_service_instance = RAGService()
        await rag_service_instance.initialize_knowledge_base()
    return rag_service_instance

# --- Example Usage (Optional) ---
# You can run this block to test the service directly from this file.
async def main():
    print("Initializing RAG service...")
    rag_service = await get_rag_service()
    
    # Check knowledge base info
    kb_info = rag_service.get_knowledge_base_info()
    print("\nKnowledge Base Info:")
    import json
    print(json.dumps(kb_info, indent=2))
    
    # Example query
    print("\n--- Sending test query ---")
    test_query = "What are the safety procedures for catalyst handling?"
    response = await rag_service.query_rag(test_query)
    
    print(f"\nQuery: {test_query}")
    print(f"\nAnswer: {response.get('answer')}")
    print("\nSources:")
    print(json.dumps(response.get('sources', []), indent=2))

if __name__ == "__main__":
    # To run this example, you need documents in your data directory
    # (e.g., ./rag_app/data)
    asyncio.run(main())