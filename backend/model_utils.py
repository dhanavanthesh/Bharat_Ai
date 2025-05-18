"""
Utility functions for model management and document processing.
"""
import os
import json
import logging
import datetime
from typing import Dict, List, Any, Optional
import numpy as np
from bson.objectid import ObjectId
import pymongo

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Try to import optional dependencies
try:
    import torch
    import transformers
    from transformers import AutoTokenizer, AutoModel
    transformers_available = True
    logger.info("Transformers library found - advanced NLP features available")
except ImportError:
    transformers_available = False
    logger.warning("Transformers library not found - some features will be limited")

try:
    import sentence_transformers
    from sentence_transformers import SentenceTransformer
    sentence_transformers_available = True
    logger.info("Sentence-Transformers library found - embedding features available")
except ImportError:
    sentence_transformers_available = False
    logger.warning("Sentence-Transformers library not found - embedding features will be limited")

# Import local modules
from db import get_database

# Directories for model storage
EMBEDDING_MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'embedding_models')
CACHED_EMBEDDINGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'cached_embeddings')

# Ensure directories exist
for directory in [EMBEDDING_MODEL_DIR, CACHED_EMBEDDINGS_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

# Default embedding model to use
DEFAULT_EMBEDDING_MODEL = "all-MiniLM-L6-v2"

def get_embedding_model():
    """
    Get a sentence transformer model for generating embeddings
    
    Returns:
        SentenceTransformer model instance or None if not available
    """
    if not sentence_transformers_available:
        logger.warning("Sentence-Transformers not available. Cannot generate embeddings.")
        return None
        
    try:
        # Check if model is already downloaded
        model_path = os.path.join(EMBEDDING_MODEL_DIR, DEFAULT_EMBEDDING_MODEL)
        if os.path.exists(model_path):
            model = SentenceTransformer(model_path)
        else:
            # Download and save the model
            model = SentenceTransformer(DEFAULT_EMBEDDING_MODEL)
            model.save(model_path)
            
        logger.info(f"Loaded embedding model: {DEFAULT_EMBEDDING_MODEL}")
        return model
    except Exception as e:
        logger.error(f"Error loading embedding model: {str(e)}")
        return None

def generate_embeddings(texts: List[str]) -> Optional[List[List[float]]]:
    """
    Generate embeddings for a list of texts
    
    Args:
        texts: List of text strings to generate embeddings for
        
    Returns:
        List of embedding vectors or None if generation failed
    """
    if not texts:
        return []
        
    model = get_embedding_model()
    if not model:
        return None
        
    try:
        embeddings = model.encode(texts)
        return embeddings.tolist()
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}")
        return None

def chunk_document(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """
    Split a document into overlapping chunks for processing
    
    Args:
        text: The document text to split
        chunk_size: Maximum number of characters per chunk
        overlap: Number of characters to overlap between chunks
        
    Returns:
        List of text chunks
    """
    if not text:
        return []
        
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Adjust end position to not cut words
        if end < len(text):
            # Try to find a period, question mark, or exclamation mark
            for punct in ['. ', '? ', '! ']:
                punct_pos = text[start:end].rfind(punct)
                if punct_pos != -1:
                    end = start + punct_pos + 2  # Include the punctuation and space
                    break
            
            # If no punctuation found, try to find a space
            if end == start + chunk_size:
                space_pos = text[start:end].rfind(' ')
                if space_pos != -1:
                    end = start + space_pos + 1  # Include the space
        
        chunks.append(text[start:end])
        start = end - overlap
    
    return chunks

def extract_structured_data(text: str, schema: Dict[str, str]) -> Dict[str, Any]:
    """
    Extract structured data from text based on a schema
    
    Args:
        text: Text to extract data from
        schema: Dictionary mapping field names to extraction patterns
        
    Returns:
        Dictionary of extracted fields and values
    """
    if not transformers_available:
        logger.warning("Transformers not available. Cannot extract structured data.")
        return {}
        
    # For simplicity, we'll just use basic string matching
    # In a production system, you would use NER models or regex patterns
    result = {}
    
    for field, pattern in schema.items():
        try:
            # Simple pattern matching - look for field_name: value or pattern: value
            match_pattern = f"{pattern}:"
            if match_pattern in text:
                start_pos = text.find(match_pattern) + len(match_pattern)
                end_pos = text.find("\n", start_pos)
                if end_pos == -1:
                    end_pos = len(text)
                result[field] = text[start_pos:end_pos].strip()
            else:
                # Try looking directly for the field name
                match_pattern = f"{field}:"
                if match_pattern in text:
                    start_pos = text.find(match_pattern) + len(match_pattern)
                    end_pos = text.find("\n", start_pos)
                    if end_pos == -1:
                        end_pos = len(text)
                    result[field] = text[start_pos:end_pos].strip()
        except Exception as e:
            logger.error(f"Error extracting field '{field}': {str(e)}")
            result[field] = None
    
    return result

def index_document(
    document_id: str, 
    text: str, 
    metadata: Dict[str, Any] = None,
    chunk_size: int = 500
) -> bool:
    """
    Index a document for semantic search by chunking and generating embeddings
    
    Args:
        document_id: ID of the document
        text: Full text of the document
        metadata: Additional metadata about the document
        chunk_size: Size of chunks to split document into
        
    Returns:
        bool: True if indexing was successful, False otherwise
    """
    db = get_database()
    if not db:
        logger.error("Database connection failed")
        return False
        
    try:
        # Ensure document_embeddings collection exists
        if "document_embeddings" not in db.list_collection_names():
            db.create_collection("document_embeddings")
            db.document_embeddings.create_index([("document_id", pymongo.ASCENDING)])
            db.document_embeddings.create_index([("chunk_index", pymongo.ASCENDING)])
            db.document_embeddings.create_index([
                ("document_id", pymongo.ASCENDING),
                ("chunk_index", pymongo.ASCENDING)
            ], unique=True)
        
        # Check if embeddings already exist for this document
        existing = db.document_embeddings.find_one({"document_id": document_id})
        if existing:
            logger.info(f"Deleting existing embeddings for document {document_id}")
            db.document_embeddings.delete_many({"document_id": document_id})
        
        # Chunk the document
        chunks = chunk_document(text, chunk_size=chunk_size)
        if not chunks:
            logger.error("No chunks generated from document")
            return False
        
        # Generate embeddings for chunks
        embeddings = generate_embeddings(chunks)
        if not embeddings:
            logger.error("Failed to generate embeddings")
            return False
        
        # Store chunks and embeddings
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            db.document_embeddings.insert_one({
                "document_id": document_id,
                "chunk_index": i,
                "chunk_text": chunk,
                "embedding": embedding,
                "metadata": metadata,
                "indexed_at": datetime.datetime.utcnow()
            })
        
        logger.info(f"Successfully indexed document {document_id} with {len(chunks)} chunks")
        return True
        
    except Exception as e:
        logger.error(f"Error indexing document: {str(e)}")
        return False

def search_documents(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    Search indexed documents using semantic similarity
    
    Args:
        query: Search query text
        limit: Maximum number of results to return
        
    Returns:
        List of matching document chunks with similarity scores
    """
    db = get_database()
    if not db or not sentence_transformers_available:
        logger.error("Database connection failed or sentence_transformers not available")
        return []
        
    try:
        # Generate embedding for the query
        query_embedding = generate_embeddings([query])
        if not query_embedding:
            logger.error("Failed to generate embedding for query")
            return []
        
        # For a real implementation, you would use a vector database or 
        # an efficient nearest-neighbor search algorithm.
        # Here we'll just retrieve all embeddings and compute similarity.
        
        all_chunks = list(db.document_embeddings.find({}))
        results = []
        
        for chunk in all_chunks:
            try:
                # Calculate cosine similarity
                chunk_embedding = chunk.get("embedding", [])
                if not chunk_embedding:
                    continue
                    
                similarity = np.dot(query_embedding[0], chunk_embedding) / (
                    np.linalg.norm(query_embedding[0]) * np.linalg.norm(chunk_embedding)
                )
                
                results.append({
                    "document_id": chunk["document_id"],
                    "chunk_text": chunk["chunk_text"],
                    "similarity": float(similarity),
                    "metadata": chunk.get("metadata", {})
                })
            except Exception as e:
                logger.error(f"Error calculating similarity: {str(e)}")
        
        # Sort by similarity and return top results
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:limit]
        
    except Exception as e:
        logger.error(f"Error searching documents: {str(e)}")
        return []

def get_model_info(model_id: str) -> Optional[Dict[str, Any]]:
    """
    Get information about a trained model
    
    Args:
        model_id: ID of the TrainedModel document
        
    Returns:
        Dict with model information or None if not found
    """
    db = get_database()
    if not db:
        logger.error("Database connection failed")
        return None
        
    try:
        model = db.trained_models.find_one({"_id": ObjectId(model_id)})
        if not model:
            logger.error(f"Model with ID {model_id} not found")
            return None
            
        # Convert ObjectId to string for JSON serialization
        model["_id"] = str(model["_id"])
        
        return model
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return None
