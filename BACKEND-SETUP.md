
# Backend Setup Instructions

This React application requires a FastAPI backend to perform real Firebase operations. The frontend has been updated to make real API calls instead of simulating operations.

## Quick Start

1. **Install Python Dependencies**:
   ```bash
   pip install fastapi uvicorn firebase-admin pyrebase4
   ```

2. **Run the Backend**:
   ```bash
   # From the project root directory
   python src/utils/firebaseBackend.py
   ```
   
   The backend will start on `http://localhost:8000`

3. **Configure Frontend**:
   - The `.env` file is already configured to use `http://localhost:8000`
   - No additional configuration needed if running locally

4. **Add Firebase Projects**:
   - Use the "Add Project" button in the app
   - You'll need both the service account JSON file AND the Web API Key
   - Find the Web API Key in Firebase Console → Project Settings → General → Web API Key

## Firebase Service Account Setup

1. Go to your Firebase Console
2. Navigate to Project Settings > Service Accounts
3. Click "Generate New Private Key"
4. Download the JSON file
5. Use this JSON file when adding projects in the React app

## Web API Key

1. Go to your Firebase Console
2. Navigate to Project Settings > General
3. Find "Web API Key" in the project configuration
4. Copy this key and paste it when adding the project

## Features Implemented

✅ **Real Firebase Connection**: Uses Firebase Admin SDK for user management
✅ **Batch Processing**: Handles large user imports/deletions in batches of 1000
✅ **Campaign Management**: Sends password reset emails with rotation between projects
✅ **Error Handling**: Proper error tracking and reporting
✅ **Progress Monitoring**: Real-time campaign progress updates
✅ **Rate Limiting**: Includes delays between operations to avoid API limits

## Troubleshooting

### Backend Connection Issues
- Make sure the backend is running on port 8000
- Check that `VITE_API_BASE_URL=http://localhost:8000` in your `.env` file
- Look for CORS errors in the browser console

### Project Connection Failed
- Verify your service account JSON is valid
- Ensure the Web API Key is correct
- Check that the Firebase project exists and is active

### Users Not Loading
- Confirm the backend is connected
- Check browser console for API errors
- Verify the project was added successfully (status should be "Connected")

## Development Notes

- The backend runs on port 8000 by default
- All API calls are logged in the browser console
- Project status indicators show connection health
- Real-time progress updates during campaigns
