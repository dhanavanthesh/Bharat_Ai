import jwt
from functools import wraps
from flask import request, jsonify
from datetime import datetime, timedelta
import os

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'default-secret-key')

def generate_token(user_id, roles=None):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),
        'iat': datetime.utcnow(),
        'roles': roles or []
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
            
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            request.user = data
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
            
        return f(*args, **kwargs)
    return decorated

def roles_required(*required_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'user'):
                return jsonify({'message': 'Authentication required'}), 401
                
            user_roles = request.user.get('roles', [])
            if not any(role in user_roles for role in required_roles):
                return jsonify({'message': 'Insufficient permissions'}), 403
                
            return f(*args, **kwargs)
        return decorated
    return decorator
