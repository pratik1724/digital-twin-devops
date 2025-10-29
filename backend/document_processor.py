import fitz  # PyMuPDF
import json
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class DocumentProcessor:
    """Process various document types for RAG system"""
    
    def __init__(self):
        self.supported_extensions = {'.pdf', '.txt', '.csv', '.json'}
    
    def extract_text_from_pdf(self, file_path: str) -> Dict[str, Any]:
        """Extract text from PDF files using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            text_content = []
            
            for page_num, page in enumerate(doc):
                page_text = page.get_text()
                if page_text.strip():
                    text_content.append({
                        'page': page_num + 1,
                        'content': page_text.strip()
                    })
            
            doc.close()
            
            full_content = ' '.join([page['content'] for page in text_content])
            
            return {
                'filename': Path(file_path).name,
                'total_pages': len(text_content),
                'content': full_content,
                'pages': text_content,
                'file_type': 'pdf',
                'success': True
            }
        except Exception as e:
            logger.error(f"Error processing PDF {file_path}: {str(e)}")
            return {
                'filename': Path(file_path).name,
                'content': '',
                'file_type': 'pdf',
                'success': False,
                'error': str(e)
            }
    
    def extract_text_from_txt(self, file_path: str) -> Dict[str, Any]:
        """Extract text from TXT files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            return {
                'filename': Path(file_path).name,
                'content': content.strip(),
                'file_type': 'txt',
                'success': True
            }
        except Exception as e:
            logger.error(f"Error processing TXT {file_path}: {str(e)}")
            return {
                'filename': Path(file_path).name,
                'content': '',
                'file_type': 'txt',
                'success': False,
                'error': str(e)
            }
    
    def extract_text_from_csv(self, file_path: str) -> Dict[str, Any]:
        """Extract text from CSV files"""
        try:
            df = pd.read_csv(file_path)
            
            # Convert DataFrame to text representation
            content_parts = []
            content_parts.append(f"CSV Dataset: {Path(file_path).name}")
            content_parts.append(f"Columns: {', '.join(df.columns.tolist())}")
            content_parts.append(f"Number of rows: {len(df)}")
            content_parts.append("\nSample data:")
            
            # Include first few rows as sample data
            for idx, row in df.head(10).iterrows():
                row_text = ' | '.join([f"{col}: {val}" for col, val in row.items() if pd.notna(val)])
                content_parts.append(f"Row {idx + 1}: {row_text}")
            
            # Add summary statistics for numeric columns
            numeric_cols = df.select_dtypes(include=['number']).columns
            if len(numeric_cols) > 0:
                content_parts.append("\nNumeric column statistics:")
                for col in numeric_cols:
                    stats = df[col].describe()
                    content_parts.append(f"{col}: mean={stats['mean']:.2f}, std={stats['std']:.2f}, min={stats['min']}, max={stats['max']}")
            
            return {
                'filename': Path(file_path).name,
                'content': '\n'.join(content_parts),
                'dataframe': df.to_dict('records'),  # Convert to serializable format
                'columns': df.columns.tolist(),
                'file_type': 'csv',
                'success': True
            }
        except Exception as e:
            logger.error(f"Error processing CSV {file_path}: {str(e)}")
            return {
                'filename': Path(file_path).name,
                'content': '',
                'file_type': 'csv',
                'success': False,
                'error': str(e)
            }
    
    def extract_text_from_json(self, file_path: str) -> Dict[str, Any]:
        """Extract text from JSON files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            def flatten_json(obj, prefix=''):
                """Recursively flatten JSON to create readable text"""
                items = []
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        new_key = f"{prefix}.{key}" if prefix else key
                        if isinstance(value, (dict, list)):
                            items.extend(flatten_json(value, new_key))
                        else:
                            items.append(f"{new_key}: {str(value)}")
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        new_key = f"{prefix}[{i}]" if prefix else f"[{i}]"
                        if isinstance(item, (dict, list)):
                            items.extend(flatten_json(item, new_key))
                        else:
                            items.append(f"{new_key}: {str(item)}")
                else:
                    items.append(f"{prefix}: {str(obj)}")
                return items
            
            flattened = flatten_json(data)
            content = f"JSON Document: {Path(file_path).name}\n" + '\n'.join(flattened)
            
            return {
                'filename': Path(file_path).name,
                'content': content,
                'raw_data': data,
                'file_type': 'json',
                'success': True
            }
        except Exception as e:
            logger.error(f"Error processing JSON {file_path}: {str(e)}")
            return {
                'filename': Path(file_path).name,
                'content': '',
                'file_type': 'json',
                'success': False,
                'error': str(e)
            }
    
    def process_document(self, file_path: str) -> Dict[str, Any]:
        """Process document based on file extension"""
        file_ext = Path(file_path).suffix.lower()
        
        if file_ext not in self.supported_extensions:
            return {
                'filename': Path(file_path).name,
                'content': '',
                'file_type': file_ext,
                'success': False,
                'error': f"Unsupported file type: {file_ext}"
            }
        
        if file_ext == '.pdf':
            return self.extract_text_from_pdf(file_path)
        elif file_ext == '.txt':
            return self.extract_text_from_txt(file_path)
        elif file_ext == '.csv':
            return self.extract_text_from_csv(file_path)
        elif file_ext == '.json':
            return self.extract_text_from_json(file_path)
    
    def process_directory(self, directory_path: str) -> List[Dict[str, Any]]:
        """Process all supported documents in a directory"""
        directory = Path(directory_path)
        if not directory.exists():
            logger.warning(f"Directory does not exist: {directory_path}")
            return []
        
        processed_docs = []
        
        for file_path in directory.iterdir():
            if file_path.is_file() and file_path.suffix.lower() in self.supported_extensions:
                logger.info(f"Processing document: {file_path.name}")
                result = self.process_document(str(file_path))
                if result['success']:
                    processed_docs.append(result)
                else:
                    logger.error(f"Failed to process {file_path.name}: {result.get('error', 'Unknown error')}")
        
        return processed_docs