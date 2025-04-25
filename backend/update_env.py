#!/usr/bin/env python
"""
Helper script to update .env file with MongoDB URI
"""
import os
import sys
import logging
from dotenv import load_dotenv, find_dotenv, set_key

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def update_env_file():
    """Update or create .env file with MongoDB URI"""
    # Find .env file
    env_path = find_dotenv()
    if not env_path:
        logger.info("No .env file found, creating one")
        env_path = os.path.join(os.getcwd(), '.env')
    
    # Load existing variables
    load_dotenv(env_path)
    
    # Check if MongoDB URI already exists
    mongo_url = os.getenv('MONGO_URL')
    mongo_uri = os.getenv('MONGO_URI')
    
    if mongo_url and mongo_uri:
        logger.info("Both MONGO_URL and MONGO_URI already exist in .env file")
        print(f"MONGO_URL: {mongo_url[:20]}...{mongo_url[-5:] if len(mongo_url) > 25 else ''}")
        print(f"MONGO_URI: {mongo_uri[:20]}...{mongo_uri[-5:] if len(mongo_uri) > 25 else ''}")
        choice = input("Do you want to update them? (y/n): ").lower()
        if choice != 'y':
            return
    
    # Set MongoDB URI
    mongodb_uri = "mongodb+srv://dudeperfect1947:O4YILipnyhOJergg@cluster0.vutfofy.mongodb.net/bharatai"
    
    # Update .env file
    set_key(env_path, "MONGO_URL", mongodb_uri)
    
    # Remove MONGO_URI if it exists (to avoid confusion)
    if mongo_uri:
        with open(env_path, 'r') as f:
            lines = f.readlines()
        
        with open(env_path, 'w') as f:
            for line in lines:
                if not line.startswith('MONGO_URI='):
                    f.write(line)
            
            # Add a comment to explain
            f.write("# MONGO_URI has been renamed to MONGO_URL for consistency\n")
    
    logger.info(f"Updated .env file with MONGO_URL at {env_path}")
    logger.info(f"MONGO_URL: {mongodb_uri[:20]}...{mongodb_uri[-5:]}")

if __name__ == "__main__":
    update_env_file()
    print("\nEnvironment file updated successfully!")
    print("You can now run the migration script:")
    print("python migrate_data.py")