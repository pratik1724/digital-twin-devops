import re
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class TextChunker:
    """Chunk text for optimal RAG performance"""
    
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def recursive_chunking(self, text: str, separators: List[str] = None) -> List[Dict[str, Any]]:
        """Recursively split text using hierarchical separators"""
        if separators is None:
            separators = ["\n\n", "\n", ". ", " ", ""]
        
        def split_text_recursive(text: str, separators: List[str]) -> List[str]:
            if len(text) <= self.chunk_size:
                return [text] if text.strip() else []
            
            for separator in separators:
                if separator in text:
                    parts = text.split(separator)
                    chunks = []
                    current_chunk = ""
                    
                    for part in parts:
                        test_chunk = current_chunk + (separator if current_chunk else "") + part
                        if len(test_chunk) <= self.chunk_size:
                            current_chunk = test_chunk
                        else:
                            if current_chunk:
                                chunks.append(current_chunk)
                            current_chunk = part
                    
                    if current_chunk:
                        chunks.append(current_chunk)
                    
                    # Recursively process chunks that are still too large
                    final_chunks = []
                    for chunk in chunks:
                        if len(chunk) > self.chunk_size:
                            final_chunks.extend(
                                split_text_recursive(chunk, separators[1:])
                            )
                        else:
                            final_chunks.append(chunk)
                    
                    return final_chunks
            
            # If no separator found, force split
            return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size)]
        
        raw_chunks = split_text_recursive(text, separators)
        
        chunks = []
        for i, chunk_text in enumerate(raw_chunks):
            if chunk_text.strip():  # Only include non-empty chunks
                chunks.append({
                    'content': chunk_text.strip(),
                    'chunk_id': i,
                    'chunk_size': len(chunk_text.strip()),
                    'chunk_type': 'recursive'
                })
        
        return chunks
    
    def chunk_document(self, document_data: Dict[str, Any], 
                      strategy: str = 'recursive') -> List[Dict[str, Any]]:
        """Chunk document using specified strategy"""
        text_content = document_data.get('content', '')
        
        if not text_content.strip():
            logger.warning(f"No content to chunk for document: {document_data.get('filename', 'unknown')}")
            return []
        
        if strategy == 'recursive':
            chunks = self.recursive_chunking(text_content)
        else:
            raise ValueError(f"Unsupported chunking strategy: {strategy}")
        
        # Add document metadata to each chunk
        for i, chunk in enumerate(chunks):
            chunk.update({
                'document_id': document_data.get('filename', 'unknown'),
                'file_type': document_data.get('file_type', 'unknown'),
                'chunk_index': i,
                'total_chunks': len(chunks),
                'source_file': document_data.get('filename', 'unknown')
            })
        
        return chunks