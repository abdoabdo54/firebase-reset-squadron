"""
FastAPI Backend Service for Firebase Operations
Run this with: python src/utils/firebaseBackend.py
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import firebase_admin
from firebase_admin import credentials, auth
import pyrebase
import hashlib
import json
import os
import asyncio
import time
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Firebase Email Campaign Backend", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for Firebase apps and configs
firebase_apps = {}
pyrebase_apps = {}

class ProjectCreate(BaseModel):
    name: str
    adminEmail: str
    serviceAccount: Dict[str, Any]
    apiKey: str

class UserImport(BaseModel):
    emails: List[str]

class CampaignStart(BaseModel):
    projectIds: List[str]
    selectedUsers: Dict[str, List[str]]
    batchSize: int
    workers: int

class TestEmail(BaseModel):
    email: str

@app.get("/")
async def root():
    return {"message": "Firebase Email Campaign Backend API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/projects")
async def add_project(project: ProjectCreate):
    """Add a new Firebase project"""
    try:
        logger.info(f"Adding project: {project.name}")
        
        project_id = project.serviceAccount.get('project_id')
        if not project_id:
            raise HTTPException(status_code=400, detail="Invalid service account - missing project_id")
        
        client_email = project.serviceAccount.get('client_email')
        if not client_email:
            raise HTTPException(status_code=400, detail="Invalid service account - missing client_email")
        
        # Check if project already exists
        if project_id in firebase_apps:
            logger.warning(f"Project {project_id} already exists, removing old instance")
            try:
                firebase_admin.delete_app(firebase_apps[project_id])
            except:
                pass  # Ignore errors when deleting old app
            del firebase_apps[project_id]
        
        # Initialize Firebase Admin SDK
        try:
            cred = credentials.Certificate(project.serviceAccount)
            firebase_app = firebase_admin.initialize_app(cred, name=project_id)
            firebase_apps[project_id] = firebase_app
            logger.info(f"Firebase Admin SDK initialized for project {project_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Invalid service account: {str(e)}")
        
        # Initialize Pyrebase for client operations
        try:
            pyrebase_config = {
                "apiKey": project.apiKey,
                "authDomain": f"{project_id}.firebaseapp.com",
                "databaseURL": f"https://{project_id}-default-rtdb.firebaseio.com",
                "storageBucket": f"{project_id}.appspot.com",
            }
            
            pyrebase_app = pyrebase.initialize_app(pyrebase_config)
            pyrebase_apps[project_id] = pyrebase_app
            logger.info(f"Pyrebase initialized for project {project_id}")
        except Exception as e:
            logger.error(f"Failed to initialize Pyrebase: {str(e)}")
            # Clean up Firebase Admin if Pyrebase fails
            if project_id in firebase_apps:
                firebase_admin.delete_app(firebase_apps[project_id])
                del firebase_apps[project_id]
            raise HTTPException(status_code=400, detail=f"Invalid API key: {str(e)}")
        
        logger.info(f"Project {project_id} added successfully")
        return {"success": True, "project_id": project_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add project: {str(e)}")

@app.delete("/projects/{project_id}")
async def remove_project(project_id: str):
    """Remove a Firebase project"""
    try:
        logger.info(f"Removing project: {project_id}")
        
        # Remove Firebase Admin app
        if project_id in firebase_apps:
            try:
                firebase_admin.delete_app(firebase_apps[project_id])
                logger.info(f"Firebase Admin app deleted for {project_id}")
            except Exception as e:
                logger.warning(f"Error deleting Firebase Admin app: {str(e)}")
            del firebase_apps[project_id]
        
        # Remove Pyrebase app
        if project_id in pyrebase_apps:
            del pyrebase_apps[project_id]
            logger.info(f"Pyrebase app removed for {project_id}")
        
        logger.info(f"Project {project_id} removed successfully")
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Failed to remove project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to remove project: {str(e)}")

@app.get("/projects/{project_id}/users")
async def load_users(project_id: str):
    """Load all users from Firebase project"""
    try:
        logger.info(f"Loading users for project: {project_id}")
        
        if project_id not in firebase_apps:
            raise HTTPException(status_code=404, detail="Project not found")
        
        app = firebase_apps[project_id]
        users = []
        
        # List all users using Firebase Admin SDK (matching your Python script)
        try:
            page = auth.list_users(app=app)
            while page:
                for user in page.users:
                    users.append({
                        "uid": user.uid,
                        "email": user.email or "",
                        "displayName": user.display_name,
                        "disabled": user.disabled,
                        "emailVerified": user.email_verified,
                        "createdAt": user.user_metadata.creation_timestamp.isoformat() if user.user_metadata.creation_timestamp else None,
                    })
                
                # Get next page
                page = page.get_next_page() if page.has_next_page else None
                
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")
        
        logger.info(f"Loaded {len(users)} users from project {project_id}")
        return {"users": users}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to load users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to load users: {str(e)}")

@app.post("/projects/{project_id}/users/import")
async def import_users(project_id: str, user_import: UserImport):
    """Import users to Firebase project"""
    try:
        logger.info(f"Importing {len(user_import.emails)} users to project {project_id}")
        
        if project_id not in firebase_apps:
            raise HTTPException(status_code=404, detail="Project not found")
        
        app = firebase_apps[project_id]
        emails = user_import.emails
        
        # Process in batches of 1000 (Firebase limit)
        batch_size = 1000
        total_imported = 0
        
        for i in range(0, len(emails), batch_size):
            batch_emails = emails[i:i + batch_size]
            batch = []
            
            for email in batch_emails:
                uid = hashlib.md5(email.encode()).hexdigest().lower()
                user_record = auth.ImportUserRecord(email=email, uid=uid)
                batch.append(user_record)
            
            # Import batch
            results = auth.import_users(batch, app=app)
            total_imported += results.success_count
            
            logger.info(f"Batch {i//batch_size + 1}: {results.success_count} success, {results.failure_count} failures")
            
            # Add delay between batches
            if i + batch_size < len(emails):
                await asyncio.sleep(5)  # 5 second delay
        
        logger.info(f"Import completed: {total_imported} users imported")
        return {"imported": total_imported}
        
    except Exception as e:
        logger.error(f"Failed to import users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to import users: {str(e)}")

@app.delete("/projects/{project_id}/users")
async def delete_all_users(project_id: str):
    """Delete all users from Firebase project"""
    try:
        logger.info(f"Deleting all users from project {project_id}")
        
        if project_id not in firebase_apps:
            raise HTTPException(status_code=404, detail="Project not found")
        
        app = firebase_apps[project_id]
        total_deleted = 0
        
        # List and delete users in batches
        batch_size = 1000
        
        while True:
            page = auth.list_users(max_results=batch_size, app=app)
            if not page.users:
                break
            
            uids = [user.uid for user in page.users]
            results = auth.delete_users(uids, app=app)
            total_deleted += results.success_count
            
            logger.info(f"Deleted {results.success_count} users, {results.failure_count} failures")
            
            # Add delay between batches
            await asyncio.sleep(5)
        
        logger.info(f"Deletion completed: {total_deleted} users deleted")
        return {"deleted": total_deleted}
        
    except Exception as e:
        logger.error(f"Failed to delete users: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete users: {str(e)}")

# Campaign management
active_campaigns = {}

@app.post("/campaigns/{campaign_id}/start")
async def start_campaign(campaign_id: str, campaign: CampaignStart, background_tasks: BackgroundTasks):
    """Start a password reset campaign"""
    try:
        logger.info(f"Starting campaign {campaign_id}")
        
        # Add campaign to background tasks
        background_tasks.add_task(run_campaign, campaign_id, campaign)
        
        active_campaigns[campaign_id] = {
            "status": "running",
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "currentBatch": 1,
            "totalBatches": 0,
            "currentProject": campaign.projectIds[0] if campaign.projectIds else "",
            "errors": [],
            "startedAt": datetime.now().isoformat(),
        }
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Failed to start campaign: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to start campaign: {str(e)}")

async def run_campaign(campaign_id: str, campaign: CampaignStart):
    """Run password reset campaign in background"""
    try:
        logger.info(f"Running campaign {campaign_id}")
        
        total_users = sum(len(users) for users in campaign.selectedUsers.values())
        total_batches = (total_users + campaign.batchSize - 1) // campaign.batchSize
        
        active_campaigns[campaign_id]["totalBatches"] = total_batches
        
        processed = 0
        successful = 0
        failed = 0
        current_batch = 1
        
        # Process each project
        for project_id in campaign.projectIds:
            if project_id not in pyrebase_apps:
                continue
            
            active_campaigns[campaign_id]["currentProject"] = project_id
            pyrebase_auth = pyrebase_apps[project_id].auth()
            user_uids = campaign.selectedUsers.get(project_id, [])
            
            # Get user emails from Firebase
            app = firebase_apps[project_id]
            users_page = auth.list_users(app=app)
            user_emails = {}
            
            for user in users_page.iterate_all():
                if user.uid in user_uids and user.email:
                    user_emails[user.uid] = user.email
            
            # Send password reset emails in batches
            for i in range(0, len(user_uids), campaign.batchSize):
                batch_uids = user_uids[i:i + campaign.batchSize]
                
                active_campaigns[campaign_id]["currentBatch"] = current_batch
                
                for uid in batch_uids:
                    email = user_emails.get(uid)
                    if email:
                        try:
                            pyrebase_auth.send_password_reset_email(email)
                            successful += 1
                            logger.info(f"Password reset sent to {email}")
                        except Exception as e:
                            failed += 1
                            error_msg = f"Failed to send to {email}: {str(e)}"
                            active_campaigns[campaign_id]["errors"].append(error_msg)
                            logger.error(error_msg)
                    
                    processed += 1
                    
                    # Update progress
                    active_campaigns[campaign_id].update({
                        "processed": processed,
                        "successful": successful,
                        "failed": failed,
                    })
                    
                    # Wait between emails (100ms)
                    await asyncio.sleep(0.1)
                
                current_batch += 1
                
                # Wait between batches
                await asyncio.sleep(0.2)
        
        # Mark campaign as completed
        active_campaigns[campaign_id].update({
            "status": "completed",
            "completedAt": datetime.now().isoformat(),
        })
        
        logger.info(f"Campaign {campaign_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Campaign {campaign_id} failed: {str(e)}")
        active_campaigns[campaign_id].update({
            "status": "failed",
            "errors": active_campaigns[campaign_id]["errors"] + [f"Campaign failed: {str(e)}"],
        })

@app.get("/campaigns/{campaign_id}/progress")
async def get_campaign_progress(campaign_id: str):
    """Get campaign progress"""
    if campaign_id not in active_campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    return active_campaigns[campaign_id]

@app.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: str):
    """Pause a campaign"""
    if campaign_id in active_campaigns:
        active_campaigns[campaign_id]["status"] = "paused"
    return {"success": True}

@app.post("/campaigns/{campaign_id}/resume")
async def resume_campaign(campaign_id: str):
    """Resume a campaign"""
    if campaign_id in active_campaigns:
        active_campaigns[campaign_id]["status"] = "running"
    return {"success": True}

@app.post("/projects/{project_id}/test-email")
async def test_email_send(project_id: str, test_email: TestEmail):
    """Test sending a password reset email"""
    try:
        logger.info(f"Testing email send for project {project_id} to {test_email.email}")
        
        if project_id not in pyrebase_apps:
            raise HTTPException(status_code=404, detail="Project not found")
        
        pyrebase_auth = pyrebase_apps[project_id].auth()
        pyrebase_auth.send_password_reset_email(test_email.email)
        
        logger.info(f"Test email sent successfully to {test_email.email}")
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Test email failed: {str(e)}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Firebase Email Campaign Backend...")
    print("📍 Backend will be available at: http://localhost:8000")
    print("📖 API documentation: http://localhost:8000/docs")
    print("\n⚠️  Make sure to:")
    print("1. Have your Firebase service account JSON files ready")
    print("2. Get your Firebase Web API Keys from Firebase Console")
    print("3. Add projects through the React app interface")
    print("\n🔄 Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
