# backend/db.py
import os
from mongoengine import connect, disconnect
from dotenv import load_dotenv
import logging
import pymongo

# Configure logger
logger = logging.getLogger(__name__)

def initialize_db():
    """
    Initialize MongoDB connection using environment variables
    """
    # Load environment variables if not already loaded
    load_dotenv('/etc/bharatai.env')
    load_dotenv('.env')    
    # Get MongoDB URI from environment - try both MONGO_URL and MONGO_URI
    mongo_url = os.getenv('MONGO_URL') or os.getenv('MONGO_URI')
    
    if not mongo_url:
        logger.error("MongoDB URI not found in environment variables. Database connection failed.")
        return False
    
    try:
        # Try using pymongo first to verify the connection
        logger.info("Testing connection with PyMongo...")
        client = pymongo.MongoClient(
            mongo_url,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000  # 5 second timeout
        )
        
        # Force a connection attempt with a server ping
        client.admin.command('ping')
        logger.info("PyMongo connection successful")
        
        # Now connect with mongoengine
        logger.info("Connecting with MongoEngine...")
        # Disconnect any existing connections
        disconnect()
        
        # Connect to MongoDB with SSL settings
        connect(
            host=mongo_url,
            ssl=True,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connect=False  # Don't connect immediately
        )
        
        # Verify collections and create indexes for new collections
        db = client.get_database("chatbotDB")
        
        # Check and create collections for model training if they don't exist
        required_collections = [
            "training_data", "model_configs", "model_training_jobs", 
            "trained_models", "document_embeddings"
        ]
        
        existing_collections = db.list_collection_names()
        
        for collection in required_collections:
            if collection not in existing_collections:
                db.create_collection(collection)
                logger.info(f"Created collection: {collection}")
        
        # Create indexes for better query performance
        if "training_data" in existing_collections or "training_data" in required_collections:
            db.training_data.create_index([("user_id", pymongo.ASCENDING)])
            db.training_data.create_index([("created_at", pymongo.DESCENDING)])
            
        if "model_configs" in existing_collections or "model_configs" in required_collections:
            db.model_configs.create_index([("user_id", pymongo.ASCENDING)])
            db.model_configs.create_index([("model_type", pymongo.ASCENDING)])
            
        if "model_training_jobs" in existing_collections or "model_training_jobs" in required_collections:
            db.model_training_jobs.create_index([("user_id", pymongo.ASCENDING)])
            db.model_training_jobs.create_index([("status", pymongo.ASCENDING)])
            db.model_training_jobs.create_index([("created_at", pymongo.DESCENDING)])
            
        if "trained_models" in existing_collections or "trained_models" in required_collections:
            db.trained_models.create_index([("user_id", pymongo.ASCENDING)])
            db.trained_models.create_index([("model_type", pymongo.ASCENDING)])
            db.trained_models.create_index([("is_active", pymongo.ASCENDING)])
            
        if "document_embeddings" in existing_collections or "document_embeddings" in required_collections:
            db.document_embeddings.create_index([("document_id", pymongo.ASCENDING)])
            db.document_embeddings.create_index([("chunk_index", pymongo.ASCENDING)])
        
        logger.info("Successfully connected to MongoDB and verified collections")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        return False

def get_database():
    """
    Get a reference to the MongoDB database
    
    Returns:
        pymongo.database.Database or None if connection failed
    """
    # Load environment variables if not already loaded
    load_dotenv('/etc/bharatai.env')
    load_dotenv('.env')
    
    # Get MongoDB URI from environment
    mongo_url = os.getenv('MONGO_URL') or os.getenv('MONGO_URI')
    
    if not mongo_url:
        logger.error("MongoDB URI not found in environment variables")
        return None
    
    try:
        # Create a MongoDB client
        client = pymongo.MongoClient(
            mongo_url,
            tlsAllowInvalidCertificates=True,
            serverSelectionTimeoutMS=5000  # 5 second timeout
        )
        
        # Test the connection
        client.admin.command('ping')
        
        # Return the database
        return client.get_database("chatbotDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        return None

# Initialize database connection
db_connected = initialize_db()