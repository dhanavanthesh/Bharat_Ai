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
#   load_dotenv('.env')    
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
        
        logger.info("Successfully connected to MongoDB")
        return True
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        return False

# Initialize database connection
db_connected = initialize_db()