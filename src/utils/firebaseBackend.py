
"""
FastAPI Backend Service for Firebase Operations
This file serves as a reference implementation for the backend API
that should be deployed separately to handle Firebase Admin SDK operations.

Requirements:
- pip install fastapi uvicorn firebase-admin pyrebase4
- Service account JSON files stored securely
- Environment variables for configuration
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import firebase_admin
from firebase_admin import credentials, auth
import pyrebase
import hashlib
import json
import os
import asyncio
import time
from datetime import datetime

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
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

@app.post("/projects")
async def add_project(project: ProjectCreate):
    """Add a new Firebase project"""
    try:
        project_id = project.serviceAccount.get('project_id')
        if not project_id:
            raise HTTPException(status_code=400, detail="Invalid service account - missing project_id")
        
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(project.serviceAccount)
        firebase_app = firebase_admin.initialize_app(cred, name=project_id)
        firebase_apps[project_id] = firebase_app
        
        # Initialize Pyrebase for client operations
        pyrebase_config = {
            "apiKey": project.apiKey,
            "authDomain": f"{project_id}.firebaseapp.com",
            "databaseURL": f"https://{project_id}.firebaseio.com",
            "storageBucket": f"{project_id}.appspot.com",
        }
        pyrebase_app = pyrebase.initialize_app(pyrebase_config)
        pyrebase_apps[project_id] = pyrebase_app
        
        return {"success": True, "project_id": project_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add project: {str(e)}")

@app.delete("/projects/{project_id}")
async def remove_project(project_id: str):
    """Remove a Firebase project"""
    try:
        if project_id in firebase_apps:
            firebase_admin.delete_app(firebase_apps[project_id])
            del firebase_apps[project_id]
        
        if project_id in pyrebase_apps:
            del pyrebase_apps[project_id]
        
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove project: {str(e)}")

@app.get("/projects/{project_id}/users")
async def load_users(project_id: str):
    """Load all users from Firebase project"""
    try:
        if project_id not in firebase_apps:
            raise HTTPException(status_code=404, detail="Project not found")
        
        app = firebase_apps[project_id]
        users = []
        
        # List all users using Firebase Admin SDK
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
        
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load users: {str(e)}")

@app.post("/projects/{project_id}/users/import")
async def import_users(project_id: str, user_import: UserImport):
    """Import users to Firebase project"""
    try:
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
            
            print(f"Batch {i//batch_size + 1}: {results.success_count} success, {results.failure_count} failures")
            
            # Add delay between batches
            if i + batch_size < len(emails):
                await asyncio.sleep(5)  # 5 second delay
        
        return {"imported": total_imported}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import users: {str(e)}")

@app.delete("/projects/{project_id}/users")
async def delete_all_users(project_id: str):
    """Delete all users from Firebase project"""
    try:
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
            
            print(f"Deleted {results.success_count} users, {results.failure_count} failures")
            
            # Add delay between batches
            await asyncio.sleep(5)
        
        return {"deleted": total_deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete users: {str(e)}")

# Campaign management (simplified - you'd want to use a proper queue system)
active_campaigns = {}

@app.post("/campaigns/{campaign_id}/start")
async def start_campaign(campaign_id: str, campaign: CampaignStart, background_tasks: BackgroundTasks):
    """Start a password reset campaign"""
    try:
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
        raise HTTPException(status_code=500, detail=f"Failed to start campaign: {str(e)}")

async def run_campaign(campaign_id: str, campaign: CampaignStart):
    """Run password reset campaign in background"""
    try:
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
                            print(f"Password reset sent to {email}")
                        except Exception as e:
                            failed += 1
                            active_campaigns[campaign_id]["errors"].append(f"Failed to send to {email}: {str(e)}")
                            print(f"Failed to send to {email}: {str(e)}")
                    
                    processed += 1
                    
                    # Update progress
                    active_campaigns[campaign_id].update({
                        "processed": processed,
                        "successful": successful,
                        "failed": failed,
                    })
                    
                    # Wait between emails (100ms like Python script)
                    await asyncio.sleep(0.1)
                
                current_batch += 1
                
                # Wait between batches
                await asyncio.sleep(0.2)
        
        # Mark campaign as completed
        active_campaigns[campaign_id].update({
            "status": "completed",
            "completedAt": datetime.now().isoformat(),
        })
        
    except Exception as e:
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
        if project_id not in pyrebase_apps:
            raise HTTPException(status_code=404, detail="Project not found")
        
        pyrebase_auth = pyrebase_apps[project_id].auth()
        pyrebase_auth.send_password_reset_email(test_email.email)
        
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
