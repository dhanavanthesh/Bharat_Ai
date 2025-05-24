import firebase_admin
from firebase_admin import credentials, auth
import os
import logging
from datetime import datetime, timedelta
import time

logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
def initialize_firebase():
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
        logger.info("Firebase Admin SDK already initialized")
        return True
    except ValueError:
        # Firebase not initialized, initialize it
        try:
            # Path to your Firebase service account key
            cred_path = os.path.join(os.path.dirname(__file__), 'firebase-credentials.json')
            
            if not os.path.exists(cred_path):
                logger.error(f"Firebase credentials file not found at: {cred_path}")
                return False
            
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {str(e)}")
            return False

def verify_firebase_token(id_token, clock_skew_seconds=30):
    """
    Verify Firebase ID token with clock skew tolerance
    
    Args:
        id_token (str): The Firebase ID token to verify
        clock_skew_seconds (int): Allowed clock skew in seconds (default: 30)
    
    Returns:
        dict: Decoded token if valid, None if invalid
    """
    if not id_token:
        logger.warning("No ID token provided")
        return None
    
    try:
        # Verify the token with clock skew tolerance
        # Firebase tokens are typically valid for 1 hour
        decoded_token = auth.verify_id_token(
            id_token,
            check_revoked=True,
            clock_skew_seconds=clock_skew_seconds
        )
        
        logger.info(f"Token verified successfully for user: {decoded_token.get('uid')}")
        return decoded_token
        
    except auth.ExpiredIdTokenError:
        logger.warning("Firebase token has expired")
        return None
    except auth.RevokedIdTokenError:
        logger.warning("Firebase token has been revoked")
        return None
    except auth.InvalidIdTokenError as e:
        logger.warning(f"Invalid Firebase token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {str(e)}")
        return None

def create_custom_token(uid, additional_claims=None):
    """
    Create a custom Firebase token for a user
    
    Args:
        uid (str): User ID
        additional_claims (dict): Additional claims to include in the token
    
    Returns:
        str: Custom token if successful, None if failed
    """
    try:
        custom_token = auth.create_custom_token(uid, additional_claims)
        logger.info(f"Custom token created for user: {uid}")
        return custom_token.decode('utf-8')
    except Exception as e:
        logger.error(f"Error creating custom token: {str(e)}")
        return None

def get_user_by_email(email):
    """
    Get Firebase user by email
    
    Args:
        email (str): User email
    
    Returns:
        UserRecord: Firebase user record if found, None if not found
    """
    try:
        user = auth.get_user_by_email(email)
        logger.info(f"Firebase user found for email: {email}")
        return user
    except auth.UserNotFoundError:
        logger.info(f"No Firebase user found for email: {email}")
        return None
    except Exception as e:
        logger.error(f"Error getting Firebase user by email: {str(e)}")
        return None

def create_firebase_user(email, password, display_name=None, phone_number=None):
    """
    Create a new Firebase user
    
    Args:
        email (str): User email
        password (str): User password
        display_name (str): User display name
        phone_number (str): User phone number
    
    Returns:
        UserRecord: Created Firebase user record if successful, None if failed
    """
    try:
        user_data = {
            'email': email,
            'password': password,
            'email_verified': False
        }
        
        if display_name:
            user_data['display_name'] = display_name
        if phone_number:
            user_data['phone_number'] = phone_number
        
        user = auth.create_user(**user_data)
        logger.info(f"Firebase user created with UID: {user.uid}")
        return user
    except Exception as e:
        logger.error(f"Error creating Firebase user: {str(e)}")
        return None

def update_firebase_user(uid, **kwargs):
    """
    Update Firebase user
    
    Args:
        uid (str): User UID
        **kwargs: Fields to update
    
    Returns:
        UserRecord: Updated Firebase user record if successful, None if failed
    """
    try:
        user = auth.update_user(uid, **kwargs)
        logger.info(f"Firebase user updated: {uid}")
        return user
    except Exception as e:
        logger.error(f"Error updating Firebase user: {str(e)}")
        return None

def delete_firebase_user(uid):
    """
    Delete Firebase user
    
    Args:
        uid (str): User UID
    
    Returns:
        bool: True if successful, False if failed
    """
    try:
        auth.delete_user(uid)
        logger.info(f"Firebase user deleted: {uid}")
        return True
    except Exception as e:
        logger.error(f"Error deleting Firebase user: {str(e)}")
        return False

# Initialize Firebase when module is imported
firebase_initialized = initialize_firebase()
