"""
Model training utilities for the chatbot application.
"""
import os
import json
import logging
import datetime
from typing import Dict, List, Any, Optional
import pandas as pd
import numpy as np
from bson.objectid import ObjectId
import pymongo

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Import local modules
from db import initialize_db, get_database

# Define supported model types
MODEL_TYPES = {
    "classification": "Text classification model",
    "entity_extraction": "Named entity recognition model",
    "qa": "Question answering model",
    "summarization": "Text summarization model",
    "custom_chat": "Fine-tuned chat model"
}

# Directory for storing training data and models
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'training_data')
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'trained_models')

# Ensure directories exist
for directory in [DATA_DIR, MODEL_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

def process_training_data(data_id: str) -> bool:
    """
    Process uploaded training data based on its format and prepare it for training
    
    Args:
        data_id: ID of the TrainingData document
        
    Returns:
        bool: True if processing was successful, False otherwise
    """
    db = get_database()
    if not db:
        logger.error("Database connection failed")
        return False
        
    try:
        # Get training data document
        data_doc = db.training_data.find_one({"_id": ObjectId(data_id)})
        if not data_doc:
            logger.error(f"Training data with ID {data_id} not found")
            return False
            
        file_path = data_doc["file_path"]
        file_type = data_doc["file_type"]
        data_format = data_doc["data_format"]
        
        logger.info(f"Processing training data {data_id} of type {file_type} in format {data_format}")
        
        # Process based on file type
        if file_type in ['.csv', 'text/csv']:
            df = pd.read_csv(file_path)
            row_count = len(df)
            
            # Basic validation based on data format
            if data_format == "classification":
                if "text" not in df.columns or "label" not in df.columns:
                    logger.error("Classification data must have 'text' and 'label' columns")
                    return False
            
            # Save processed data
            processed_path = os.path.join(DATA_DIR, f"processed_{data_id}.csv")
            df.to_csv(processed_path, index=False)
            
            # Update database record
            db.training_data.update_one(
                {"_id": ObjectId(data_id)},
                {"$set": {
                    "processed": True,
                    "processed_path": processed_path,
                    "row_count": str(row_count),
                    "metadata": json.dumps({"columns": df.columns.tolist()})
                }}
            )
            logger.info(f"Successfully processed training data {data_id} with {row_count} rows")
            return True
            
        elif file_type in ['.json', 'application/json']:
            # Load JSON data
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Process based on format
            if isinstance(data, list):
                row_count = len(data)
                
                # Save processed data
                processed_path = os.path.join(DATA_DIR, f"processed_{data_id}.json")
                with open(processed_path, 'w') as f:
                    json.dump(data, f)
                
                # Update database record
                db.training_data.update_one(
                    {"_id": ObjectId(data_id)},
                    {"$set": {
                        "processed": True,
                        "processed_path": processed_path,
                        "row_count": str(row_count),
                        "metadata": json.dumps({"format": "list", "sample": data[:1]})
                    }}
                )
                logger.info(f"Successfully processed JSON training data {data_id} with {row_count} items")
                return True
            else:
                logger.error("JSON data must be a list of records")
                return False
                
        elif file_type in ['.txt', 'text/plain']:
            with open(file_path, 'r') as f:
                lines = f.readlines()
            
            row_count = len(lines)
            
            # Process based on format
            processed_path = os.path.join(DATA_DIR, f"processed_{data_id}.txt")
            with open(processed_path, 'w') as f:
                f.writelines(lines)
            
            # Update database record
            db.training_data.update_one(
                {"_id": ObjectId(data_id)},
                {"$set": {
                    "processed": True,
                    "processed_path": processed_path,
                    "row_count": str(row_count),
                    "metadata": json.dumps({"format": "text", "line_count": row_count})
                }}
            )
            logger.info(f"Successfully processed text training data {data_id} with {row_count} lines")
            return True
            
        else:
            logger.error(f"Unsupported file type: {file_type}")
            return False
            
    except Exception as e:
        logger.error(f"Error processing training data: {str(e)}")
        return False

def create_training_job(config_id: str, data_ids: List[str], user_id: str, name: str) -> Optional[str]:
    """
    Create a new model training job
    
    Args:
        config_id: ID of the ModelConfig document
        data_ids: List of TrainingData document IDs
        user_id: ID of the user creating the training job
        name: Name for the training job
        
    Returns:
        str: ID of the created training job, or None if creation failed
    """
    db = get_database()
    if not db:
        logger.error("Database connection failed")
        return None
        
    try:
        # Validate config exists
        config = db.model_configs.find_one({"_id": ObjectId(config_id), "user_id": user_id})
        if not config:
            logger.error(f"Model config with ID {config_id} not found for user {user_id}")
            return None
            
        # Validate training data exists and is processed
        for data_id in data_ids:
            data = db.training_data.find_one({
                "_id": ObjectId(data_id),
                "user_id": user_id,
                "processed": True
            })
            if not data:
                logger.error(f"Processed training data with ID {data_id} not found for user {user_id}")
                return None
        
        # Create training job
        job = {
            "name": name,
            "user_id": user_id,
            "config_id": config_id,
            "training_data_ids": data_ids,
            "status": "pending",
            "created_at": datetime.datetime.utcnow(),
            "logs": ["Training job created"]
        }
        
        result = db.model_training_jobs.insert_one(job)
        job_id = str(result.inserted_id)
        
        logger.info(f"Created training job {job_id} for user {user_id}")
        return job_id
        
    except Exception as e:
        logger.error(f"Error creating training job: {str(e)}")
        return None

def run_training_job(job_id: str) -> bool:
    """
    Execute a model training job
    
    Args:
        job_id: ID of the ModelTrainingJob document
        
    Returns:
        bool: True if training was successful, False otherwise
    """
    db = get_database()
    if not db:
        logger.error("Database connection failed")
        return False
        
    try:
        # Get job details
        job = db.model_training_jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            logger.error(f"Training job with ID {job_id} not found")
            return False
            
        # Update job status
        db.model_training_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {
                "status": "running",
                "started_at": datetime.datetime.utcnow()
            },
            "$push": {
                "logs": f"Training started at {datetime.datetime.utcnow().isoformat()}"
            }}
        )
        
        # Get config details
        config = db.model_configs.find_one({"_id": ObjectId(job["config_id"])})
        if not config:
            logger.error(f"Model config with ID {job['config_id']} not found")
            update_job_status(job_id, "failed", "Model configuration not found")
            return False
            
        # Get training data
        training_data_paths = []
        for data_id in job["training_data_ids"]:
            data = db.training_data.find_one({"_id": ObjectId(data_id)})
            if not data or not data.get("processed_path"):
                error_msg = f"Training data with ID {data_id} not found or not processed"
                logger.error(error_msg)
                update_job_status(job_id, "failed", error_msg)
                return False
            training_data_paths.append(data["processed_path"])
        
        # For demo purposes, we'll just simulate training
        # In a real implementation, we would:
        # 1. Load data from the processed paths
        # 2. Initialize model based on config
        # 3. Train the model and save artifacts
        # 4. Evaluate and generate metrics
        
        # Simulate training
        update_job_log(job_id, "Loading training data...")
        update_job_log(job_id, f"Initializing {config['model_type']} model based on {config['base_model']}")
        update_job_log(job_id, "Training model...")
        
        # Simulate training time
        import time
        time.sleep(2)  # In production, this would be actual training
        
        # Create model directory
        model_name = f"{config['name']}_{job_id}"
        model_dir = os.path.join(MODEL_DIR, model_name)
        os.makedirs(model_dir, exist_ok=True)
        
        # Simulate saving model
        model_path = os.path.join(model_dir, "model.json")
        with open(model_path, 'w') as f:
            json.dump({
                "type": config["model_type"],
                "base_model": config["base_model"],
                "trained_on": job["training_data_ids"],
                "timestamp": datetime.datetime.utcnow().isoformat()
            }, f)
        
        update_job_log(job_id, f"Model saved to {model_path}")
        
        # Create trained model entry
        metrics = {
            "accuracy": 0.85,
            "precision": 0.83,
            "recall": 0.87,
            "f1": 0.85
        }
        
        trained_model = {
            "name": model_name,
            "description": f"Trained {config['model_type']} model based on {config['base_model']}",
            "user_id": job["user_id"],
            "model_type": config["model_type"],
            "base_model": config["base_model"],
            "version": "1.0.0",
            "training_job_id": job_id,
            "model_path": model_path,
            "metrics": json.dumps(metrics),
            "created_at": datetime.datetime.utcnow(),
            "is_active": False
        }
        
        model_result = db.trained_models.insert_one(trained_model)
        model_id = str(model_result.inserted_id)
        
        # Update job as completed
        db.model_training_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.datetime.utcnow(),
                "result_model_id": model_id
            },
            "$push": {
                "logs": f"Training completed successfully. Model ID: {model_id}"
            }}
        )
        
        # Add model to user's trained models
        db.users.update_one(
            {"_id": ObjectId(job["user_id"])},
            {"$addToSet": {"trained_models": model_id}}
        )
        
        logger.info(f"Successfully completed training job {job_id}, created model {model_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error running training job: {str(e)}")
        update_job_status(job_id, "failed", str(e))
        return False

def update_job_status(job_id: str, status: str, message: str = None) -> bool:
    """
    Update the status of a training job
    
    Args:
        job_id: ID of the ModelTrainingJob document
        status: New status (pending, running, completed, failed)
        message: Optional message to add to logs
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    db = get_database()
    if not db:
        logger.error("Database connection failed")
        return False
        
    try:
        update_dict = {"status": status}
        
        if status == "completed":
            update_dict["completed_at"] = datetime.datetime.utcnow()
        
        if message:
            db.model_training_jobs.update_one(
                {"_id": ObjectId(job_id)},
                {
                    "$set": update_dict,
                    "$push": {"logs": message}
                }
            )
        else:
            db.model_training_jobs.update_one(
                {"_id": ObjectId(job_id)},
                {"$set": update_dict}
            )
        
        logger.info(f"Updated training job {job_id} status to {status}")
        return True
        
    except Exception as e:
        logger.error(f"Error updating job status: {str(e)}")
        return False

def update_job_log(job_id: str, message: str) -> bool:
    """
    Add a log message to a training job
    
    Args:
        job_id: ID of the ModelTrainingJob document
        message: Message to add to logs
        
    Returns:
        bool: True if update was successful, False otherwise
    """
    db = get_database()
    if not db:
        logger.error("Database connection failed")
        return False
        
    try:
        db.model_training_jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$push": {"logs": message}}
        )
        
        logger.info(f"Added log to training job {job_id}: {message}")
        return True
        
    except Exception as e:
        logger.error(f"Error updating job log: {str(e)}")
        return False
