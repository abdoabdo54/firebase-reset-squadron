
# Backend Setup Instructions

This React application requires a FastAPI backend to perform real Firebase operations. The frontend has been updated to make real API calls instead of simulating operations.

## Backend Requirements

1. **Python 3.7+**
2. **Required packages**:
   ```bash
   pip install fastapi uvicorn firebase-admin pyrebase4
   ```

## Setup Steps

### 1. Backend Setup

1. Copy the `src/utils/firebaseBackend.py` file to your backend server
2. Install the required Python packages
3. Run the backend server:
   ```bash
   python firebaseBackend.py
   ```
   Or using uvicorn:
   ```bash
   uvicorn firebaseBackend:app --reload --host 0.0.0.0 --port 8000
   ```

### 2. Frontend Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `VITE_API_BASE_URL` in `.env` to point to your backend:
   ```
   VITE_API_BASE_URL=http://your-backend-url:8000
   ```

### 3. Firebase Service Account Setup

1. Go to your Firebase Console
2. Navigate to Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Download the JSON file
5. Use this JSON file when adding projects in the React app

## API Endpoints

The backend provides these endpoints that match your Python script functionality:

- `POST /projects` - Add a new Firebase project
- `DELETE /projects/{project_id}` - Remove a project
- `GET /projects/{project_id}/users` - Load all users from Firebase
- `POST /projects/{project_id}/users/import` - Import users to Firebase
- `DELETE /projects/{project_id}/users` - Delete all users from Firebase
- `POST /campaigns/{campaign_id}/start` - Start password reset campaign
- `GET /campaigns/{campaign_id}/progress` - Get campaign progress
- `POST /campaigns/{campaign_id}/pause` - Pause campaign
- `POST /campaigns/{campaign_id}/resume` - Resume campaign
- `POST /projects/{project_id}/test-email` - Test email sending

## Key Features Implemented

✅ **Real Firebase Connection**: Uses Firebase Admin SDK for user management
✅ **Batch Processing**: Handles large user imports/deletions in batches of 1000
✅ **Campaign Management**: Sends password reset emails with rotation between projects
✅ **Error Handling**: Proper error tracking and reporting
✅ **Progress Monitoring**: Real-time campaign progress updates
✅ **Rate Limiting**: Includes delays between operations to avoid API limits

## Security Notes

- Store service account keys securely (environment variables or secure file storage)
- Configure CORS properly for production
- Use proper authentication for API endpoints
- Consider using a message queue system for large campaigns

## Deployment

For production deployment:

1. Deploy the FastAPI backend to a cloud service (AWS, GCP, Heroku, etc.)
2. Update the `VITE_API_BASE_URL` to point to your production backend
3. Configure proper CORS settings
4. Set up proper logging and monitoring
5. Use a database to store campaign states and project configurations

## Testing

You can test the backend directly using the provided endpoints:

```bash
# Test adding a project
curl -X POST "http://localhost:8000/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "adminEmail": "admin@example.com",
    "serviceAccount": {...your service account JSON...},
    "apiKey": "your-api-key"
  }'
```

The React frontend will now make real API calls to perform Firebase operations instead of simulating them.
