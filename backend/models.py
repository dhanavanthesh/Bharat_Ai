# backend/models.py
from mongoengine import Document, StringField, DateTimeField, ListField, ReferenceField, BooleanField, EmbeddedDocument, EmbeddedDocumentField
import datetime

class User(Document):
    name = StringField(required=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    trained_models = ListField(StringField(), default=[])  # IDs of trained models owned by the user
    
    meta = {
        'collection': 'users',
        'indexes': ['email']
    }

class EmailOtp(Document):
    email = StringField(required=True)
    code = StringField(required=True)
    full_name = StringField()
    password = StringField()
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    expires_at = DateTimeField()
    
    meta = {
        'collection': 'email_otps',
        'indexes': ['email', 'code']
    }

# ChatMessage embedded document
class ChatMessage(EmbeddedDocument):
    role = StringField(required=True)  # 'user' or 'bot'
    content = StringField(required=True)
    language = StringField(default='en')
    timestamp = DateTimeField(default=datetime.datetime.utcnow)

class Chat(Document):
    title = StringField(default='New Chat')
    user_id = StringField(required=True)  
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    messages = ListField(EmbeddedDocumentField(ChatMessage), default=[])
    
    meta = {
        'collection': 'chats',
        'indexes': ['user_id']
    }

# New schemas for model training system
class TrainingData(Document):
    name = StringField(required=True)
    description = StringField(default="")
    user_id = StringField(required=True)
    file_path = StringField(required=True)
    file_type = StringField(required=True)  # csv, json, text, etc.
    data_format = StringField(default="raw")  # raw, labeled, conversation, etc.
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    processed = BooleanField(default=False)
    processed_path = StringField()
    row_count = StringField()
    metadata = StringField()  # JSON string of additional metadata

    meta = {
        'collection': 'training_data',
        'indexes': ['user_id', 'created_at']
    }

class ModelConfig(Document):
    name = StringField(required=True)
    description = StringField(default="")
    user_id = StringField(required=True)
    model_type = StringField(required=True)  # classification, entity_extraction, etc.
    base_model = StringField(required=True)  # llama3-70b, etc.
    hyperparameters = StringField()  # JSON string of hyperparameters
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    updated_at = DateTimeField(default=datetime.datetime.utcnow)
    
    meta = {
        'collection': 'model_configs',
        'indexes': ['user_id', 'created_at']
    }

class ModelTrainingJob(Document):
    name = StringField(required=True)
    user_id = StringField(required=True)
    config_id = StringField(required=True)  # Reference to ModelConfig
    training_data_ids = ListField(StringField())  # References to TrainingData
    status = StringField(default="pending")  # pending, running, completed, failed
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    started_at = DateTimeField()
    completed_at = DateTimeField()
    logs = ListField(StringField(), default=[])
    result_model_id = StringField()  # Reference to TrainedModel when completed
    
    meta = {
        'collection': 'model_training_jobs',
        'indexes': ['user_id', 'status', 'created_at']
    }

class TrainedModel(Document):
    name = StringField(required=True)
    description = StringField(default="")
    user_id = StringField(required=True)
    model_type = StringField(required=True)
    base_model = StringField(required=True)
    version = StringField(default="1.0.0")
    training_job_id = StringField()  # Reference to ModelTrainingJob
    model_path = StringField()  # Path to model weights/artifacts
    metrics = StringField()  # JSON string of evaluation metrics
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    is_active = BooleanField(default=False)
    
    meta = {
        'collection': 'trained_models',
        'indexes': ['user_id', 'model_type', 'created_at']
    }