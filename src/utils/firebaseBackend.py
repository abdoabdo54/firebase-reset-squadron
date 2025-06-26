"""
Enhanced FastAPI Backend Service for Firebase Operations with Multi-Project Parallelism
Run this with: python src/utils/firebaseBackend.py
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Set
import firebase_admin
from firebase_admin import credentials, auth
import pyrebase
import hashlib
import json
import os
import asyncio
import time
from datetime import datetime, date
import logging
import concurrent.futures
import threading
from collections import defaultdict
import uuid

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Firebase Email Campaign Backend", version="2.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Global storage
firebase_apps = {}
pyrebase_apps = {}
active_campaigns = {}
campaign_stats = {}
daily_counts = {}

# Data models
class ProjectCreate(BaseModel):
    name: str
    adminEmail: str
    serviceAccount: Dict[str, Any]
    apiKey: str

class UserImport(BaseModel):
    emails: List[str]
    projectIds: List[str]

class CampaignCreate(BaseModel):
    name: str
    projectIds: List[str]
    selectedUsers: Dict[str, List[str]]
    batchSize: int
    workers: int
    template: Optional[str] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    batchSize: Optional[int] = None
    workers: Optional[int] = None
    template: Optional[str] = None

class BulkUserDelete(BaseModel):
    projectIds: List[str]
    userIds: Optional[List[str]] = None  # If None, delete all users

# Daily count management
def load_daily_counts():
    """Load daily counts from JSON file"""
    global daily_counts
    try:
        if os.path.exists('daily_counts.json'):
            with open('daily_counts.json', 'r') as f:
                daily_counts = json.load(f)
    except Exception as e:
        logger.error(f"Error loading daily counts: {str(e)}")
        daily_counts = {}

def save_daily_counts():
    """Save daily counts to JSON file"""
    try:
        with open('daily_counts.json', 'w') as f:
            json.dump(daily_counts, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving daily counts: {str(e)}")

def increment_daily_count(project_id: str):
    """Increment daily count for a project"""
    today = date.today().isoformat()
    key = f"{project_id}_{today}"
    
    if key not in daily_counts:
        daily_counts[key] = {"project_id": project_id, "date": today, "sent": 0}
    
    daily_counts[key]["sent"] += 1
    save_daily_counts()

def get_daily_count(project_id: str) -> int:
    """Get daily count for a project"""
    today = date.today().isoformat()
    key = f"{project_id}_{today}"
    return daily_counts.get(key, {}).get("sent", 0)

# Initialize daily counts on startup
load_daily_counts()

@app.get("/")
async def root():
    return {"message": "Firebase Email Campaign Backend v2.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "projects_connected": len(firebase_apps),
        "active_campaigns": len(active_campaigns),
        "version": "2.0.0"
    }

@app.post("/projects")
async def add_project(project: ProjectCreate):
    try:
        logger.info(f"Adding project: {project.name}")
        
        project_id = project.serviceAccount.get('project_id')
        if not project_id:
            raise HTTPException(status_code=400, detail="Invalid service account - missing project_id")
        
        # Remove existing project if it exists
        if project_id in firebase_apps:
            try:
                firebase_admin.delete_app(firebase_apps[project_id])
            except Exception as e:
                logger.warning(f"Error removing old Firebase app: {e}")
            del firebase_apps[project_id]
        
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate(project.serviceAccount)
        firebase_app = firebase_admin.initialize_app(cred, name=project_id)
        firebase_apps[project_id] = firebase_app
        
        # Initialize Pyrebase
        pyrebase_config = {
            "apiKey": project.apiKey,
            "authDomain": f"{project_id}.firebaseapp.com",
            "databaseURL": f"https://{project_id}-default-rtdb.firebaseio.com",
            "storageBucket": f"{project_id}.appspot.com",
        }
        pyrebase_app = pyrebase.initialize_app(pyrebase_config)
        pyrebase_apps[project_id] = pyrebase_app
        
        logger.info(f"Project {project_id} added successfully")
        return {"success": True, "project_id": project_id}
        
    except Exception as e:
        logger.error(f"Failed to add project: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add project: {str(e)}")

@app.delete("/projects/{project_id}")
async def remove_project(project_id: str):
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
    try:
        if project_id not in firebase_apps:
            raise HTTPException(status_code=404, detail="Project not found")
        
        app = firebase_apps[project_id]
        users = []
        
        page = auth.list_users(app=app)
        while page:
            for user in page.users:
                created_at = None
                if user.user_metadata and user.user_metadata.creation_timestamp:
                    try:
                        if hasattr(user.user_metadata.creation_timestamp, 'timestamp'):
                            created_at = datetime.fromtimestamp(user.user_metadata.creation_timestamp.timestamp()).isoformat()
                        else:
                            created_at = str(user.user_metadata.creation_timestamp)
                    except:
                        created_at = None
                
                users.append({
                    "uid": user.uid,
                    "email": user.email or "",
                    "displayName": user.display_name,
                    "disabled": user.disabled,
                    "emailVerified": user.email_verified,
                    "createdAt": created_at,
                })
            
            page = page.get_next_page() if page.has_next_page else None
        
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load users: {str(e)}")

@app.post("/projects/users/import")
async def import_users_parallel(user_import: UserImport):
    """Import users across multiple projects in parallel"""
    try:
        project_ids = user_import.projectIds
        emails = user_import.emails
        
        # Split emails across projects
        emails_per_project = len(emails) // len(project_ids)
        remainder = len(emails) % len(project_ids)
        
        project_email_chunks = {}
        start_idx = 0
        
        for i, project_id in enumerate(project_ids):
            chunk_size = emails_per_project + (1 if i < remainder else 0)
            project_email_chunks[project_id] = emails[start_idx:start_idx + chunk_size]
            start_idx += chunk_size
        
        # Import in parallel
        async def import_to_project(project_id: str, emails_chunk: List[str]):
            if project_id not in firebase_apps:
                return {"project_id": project_id, "imported": 0, "error": "Project not found"}
            
            app = firebase_apps[project_id]
            batch_size = 1000
            total_imported = 0
            
            for i in range(0, len(emails_chunk), batch_size):
                batch_emails = emails_chunk[i:i + batch_size]
                batch = []
                
                for email in batch_emails:
                    uid = hashlib.md5(email.encode()).hexdigest().lower()
                    user_record = auth.ImportUserRecord(email=email, uid=uid)
                    batch.append(user_record)
                
                try:
                    results = auth.import_users(batch, app=app)
                    total_imported += results.success_count
                    await asyncio.sleep(0.1)  # Brief pause between batches
                except Exception as e:
                    logger.error(f"Import batch failed for {project_id}: {str(e)}")
            
            return {"project_id": project_id, "imported": total_imported}
        
        # Execute imports in parallel
        tasks = []
        for project_id, emails_chunk in project_email_chunks.items():
            task = import_to_project(project_id, emails_chunk)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        total_imported = sum(result["imported"] for result in results)
        
        return {
            "success": True,
            "total_imported": total_imported,
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to import users: {str(e)}")

@app.delete("/projects/users/bulk")
async def bulk_delete_users(bulk_delete: BulkUserDelete):
    """Delete users across multiple projects in parallel"""
    try:
        async def delete_from_project(project_id: str):
            if project_id not in firebase_apps:
                return {"project_id": project_id, "deleted": 0, "error": "Project not found"}
            
            app = firebase_apps[project_id]
            total_deleted = 0
            batch_size = 1000
            
            if bulk_delete.userIds:
                # Delete specific users
                for i in range(0, len(bulk_delete.userIds), batch_size):
                    batch_uids = bulk_delete.userIds[i:i + batch_size]
                    try:
                        results = auth.delete_users(batch_uids, app=app)
                        total_deleted += results.success_count
                        await asyncio.sleep(0.1)
                    except Exception as e:
                        logger.error(f"Delete batch failed for {project_id}: {str(e)}")
            else:
                # Delete all users
                while True:
                    try:
                        page = auth.list_users(max_results=batch_size, app=app)
                        if not page.users:
                            break
                        
                        uids = [user.uid for user in page.users]
                        results = auth.delete_users(uids, app=app)
                        total_deleted += results.success_count
                        await asyncio.sleep(0.1)
                    except Exception as e:
                        logger.error(f"Delete batch failed for {project_id}: {str(e)}")
                        break
            
            return {"project_id": project_id, "deleted": total_deleted}
        
        # Execute deletions in parallel
        tasks = [delete_from_project(project_id) for project_id in bulk_delete.projectIds]
        results = await asyncio.gather(*tasks)
        
        total_deleted = sum(result["deleted"] for result in results)
        
        return {
            "success": True,
            "total_deleted": total_deleted,
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete users: {str(e)}")

# Campaign Management
@app.post("/campaigns")
async def create_campaign(campaign: CampaignCreate):
    """Create a new campaign"""
    try:
        campaign_id = str(uuid.uuid4())
        
        campaign_data = {
            "id": campaign_id,
            "name": campaign.name,
            "projectIds": campaign.projectIds,
            "selectedUsers": campaign.selectedUsers,
            "batchSize": campaign.batchSize,
            "workers": campaign.workers,
            "template": campaign.template,
            "status": "pending",
            "createdAt": datetime.now().isoformat(),
            "processed": 0,
            "successful": 0,
            "failed": 0,
            "errors": [],
            "projectStats": {pid: {"processed": 0, "successful": 0, "failed": 0} for pid in campaign.projectIds}
        }
        
        active_campaigns[campaign_id] = campaign_data
        
        return {"success": True, "campaign_id": campaign_id, "campaign": campaign_data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")

@app.get("/campaigns")
async def list_campaigns():
    """List all campaigns"""
    return {"campaigns": list(active_campaigns.values())}

@app.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: str):
    """Get campaign details"""
    if campaign_id not in active_campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return active_campaigns[campaign_id]

@app.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: str, campaign_update: CampaignUpdate):
    """Update campaign settings"""
    if campaign_id not in active_campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = active_campaigns[campaign_id]
    
    if campaign["status"] == "running":
        raise HTTPException(status_code=400, detail="Cannot update running campaign")
    
    if campaign_update.name:
        campaign["name"] = campaign_update.name
    if campaign_update.batchSize:
        campaign["batchSize"] = campaign_update.batchSize
    if campaign_update.workers:
        campaign["workers"] = campaign_update.workers
    if campaign_update.template:
        campaign["template"] = campaign_update.template
    
    return {"success": True, "campaign": campaign}

@app.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str):
    """Delete a campaign"""
    if campaign_id not in active_campaigns:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = active_campaigns[campaign_id]
    
    if campaign["status"] == "running":
        raise HTTPException(status_code=400, detail="Cannot delete running campaign")
    
    del active_campaigns[campaign_id]
    if campaign_id in campaign_stats:
        del campaign_stats[campaign_id]
    
    return {"success": True}

@app.post("/campaigns/{campaign_id}/start")
async def start_campaign(campaign_id: str, background_tasks: BackgroundTasks):
    """Start a campaign with multi-project parallelism"""
    try:
        if campaign_id not in active_campaigns:
            raise HTTPException(status_code=404, detail="Campaign not found")
        
        campaign = active_campaigns[campaign_id]
        
        if campaign["status"] == "running":
            raise HTTPException(status_code=400, detail="Campaign already running")
        
        campaign["status"] = "running"
        campaign["startedAt"] = datetime.now().isoformat()
        
        background_tasks.add_task(run_parallel_campaign, campaign_id)
        
        return {"success": True}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start campaign: {str(e)}")

async def run_parallel_campaign(campaign_id: str):
    """Run campaign across multiple projects in parallel"""
    try:
        campaign = active_campaigns[campaign_id]
        
        async def run_project_campaign(project_id: str, user_uids: List[str]):
            """Run campaign for a single project"""
            if project_id not in pyrebase_apps or project_id not in firebase_apps:
                return
            
            pyrebase_auth = pyrebase_apps[project_id].auth()
            admin_app = firebase_apps[project_id]
            
            # Get user emails
            user_emails = {}
            try:
                users_page = auth.list_users(app=admin_app)
                for user in users_page.iterate_all():
                    if user.uid in user_uids and user.email:
                        user_emails[user.uid] = user.email
            except Exception as e:
                logger.error(f"Failed to get user emails for {project_id}: {str(e)}")
                return
            
            # Send emails
            project_processed = 0
            project_successful = 0
            project_failed = 0
            
            for uid in user_uids:
                email = user_emails.get(uid)
                if email:
                    try:
                        pyrebase_auth.send_password_reset_email(email)
                        project_successful += 1
                        increment_daily_count(project_id)
                        logger.info(f"Password reset sent to {email} from {project_id}")
                    except Exception as e:
                        project_failed += 1
                        error_msg = f"Failed to send to {email}: {str(e)}"
                        campaign["errors"].append(error_msg)
                        logger.error(error_msg)
                
                project_processed += 1
                
                # Update campaign stats
                campaign["processed"] += 1
                campaign["successful"] += (1 if email and project_successful > campaign["projectStats"][project_id]["successful"] else 0)
                campaign["failed"] += (1 if project_failed > campaign["projectStats"][project_id]["failed"] else 0)
                
                campaign["projectStats"][project_id] = {
                    "processed": project_processed,
                    "successful": project_successful,
                    "failed": project_failed
                }
                
                # Brief pause between emails
                await asyncio.sleep(0.15)
        
        # Run all projects in parallel
        tasks = []
        for project_id, user_uids in campaign["selectedUsers"].items():
            task = run_project_campaign(project_id, user_uids)
            tasks.append(task)
        
        await asyncio.gather(*tasks)
        
        # Mark campaign as completed
        campaign["status"] = "completed"
        campaign["completedAt"] = datetime.now().isoformat()
        
        logger.info(f"Campaign {campaign_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Campaign {campaign_id} failed: {str(e)}")
        campaign["status"] = "failed"
        campaign["errors"].append(f"Campaign failed: {str(e)}")

@app.get("/projects/{project_id}/daily-count")
async def get_project_daily_count(project_id: str):
    """Get daily count for a project"""
    count = get_daily_count(project_id)
    return {"project_id": project_id, "date": date.today().isoformat(), "sent": count}

@app.get("/daily-counts")
async def get_all_daily_counts():
    """Get all daily counts"""
    return {"daily_counts": daily_counts}

# Add lightning mode endpoint
@app.post("/lightning/send-batch")
async def lightning_send_batch(request: dict):
    """Ultra-fast batch sending with no status checks or delays"""
    try:
        project_id = request.get('projectId')
        user_ids = request.get('userIds', [])
        lightning = request.get('lightning', False)
        
        if project_id not in pyrebase_apps or project_id not in firebase_apps:
            return {"success": False, "error": "Project not found"}
        
        pyrebase_auth = pyrebase_apps[project_id].auth()
        admin_app = firebase_apps[project_id]
        
        # Get emails in one batch call
        user_emails = {}
        try:
            for uid in user_ids:
                try:
                    user = auth.get_user(uid, app=admin_app)
                    if user.email:
                        user_emails[uid] = user.email
                except:
                    continue
        except:
            pass
        
        # LIGHTNING MODE - Fire all emails simultaneously
        if lightning:
            async def fire_email(email: str):
                try:
                    pyrebase_auth.send_password_reset_email(email)
                    increment_daily_count(project_id)
                except:
                    pass  # Ignore errors in lightning mode
            
            # Fire all emails at once - no waiting
            tasks = [fire_email(email) for email in user_emails.values()]
            # Don't await - let them fire asynchronously
            asyncio.gather(*tasks, return_exceptions=True)
            
            return {"success": True, "fired": len(user_emails)}
        
        # Regular mode (keep existing logic)
        sent = 0
        for uid, email in user_emails.items():
            try:
                pyrebase_auth.send_password_reset_email(email)
                sent += 1
                increment_daily_count(project_id)
            except Exception as e:
                logger.error(f"Failed to send to {email}: {str(e)}")
        
        return {"success": True, "sent": sent}
        
    except Exception as e:
        logger.error(f"Lightning batch failed: {str(e)}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Enhanced Firebase Email Campaign Backend v2.0...")
    print("📍 Backend available at: http://localhost:8000")
    print("📖 API documentation: http://localhost:8000/docs")
    print("🔗 Health check: http://localhost:8000/health")
    print("\n✨ New Features:")
    print("• Multi-project parallel processing")
    print("• Advanced campaign management")
    print("• Bulk user operations")
    print("• Daily count tracking")
    print("• Enhanced performance and scalability")
    print("\n🔄 Starting server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
