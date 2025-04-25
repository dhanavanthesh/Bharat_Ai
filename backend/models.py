# backend/models.py
from mongoengine import Document, StringField, DateTimeField, ListField, ReferenceField, BooleanField, EmbeddedDocument, EmbeddedDocumentField
import datetime

class User(Document):
    name = StringField(required=True)
    email = StringField(required=True, unique=True)
    password = StringField(required=True)
    created_at = DateTimeField(default=datetime.datetime.utcnow)
    
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