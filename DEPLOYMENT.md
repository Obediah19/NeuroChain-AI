# Deployment Guide: NeuroChain AI on Vercel + Firebase

## Architecture Overview

This project uses a hybrid deployment model:
- **Frontend**: React + Vite app deployed on Vercel (global CDN)
- **Backend**: Firebase Functions for serverless backend logic
- **Database**: Firebase Firestore for real-time data sync
- **Auth**: Firebase Authentication
- **Live Updates**: Real-time updates via Firestore listeners + easy redeployment from IDE

---

## Prerequisites

1. **Accounts**:
   - [Vercel Account](https://vercel.com/signup)
   - [Firebase Account](https://console.firebase.google.com/)

2. **CLI Tools** (install globally):
   ```bash
   npm install -g vercel firebase-tools
   ```

3. **Firebase Project** already exists: `neurochain-ai-cfafe`

---

## Step 1: Configure Environment Variables

### For Local Development
Your `.env` file already contains:
```
VITE_GEMINI_API_KEY=your_gemini_key
VITE_GROQ_API_KEY=your_groq_key
```

Add Firebase config values:
```
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=neurochain-ai-cfafe.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=neurochain-ai-cfafe
VITE_FIREBASE_STORAGE_BUCKET=neurochain-ai-cfafe.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=538356638287
VITE_FIREBASE_APP_ID=1:538356638287:web:00f8f52bcbc108f2ad403a
VITE_FIREBASE_MEASUREMENT_ID=G-L40SGV9LL6
```

**Get these from**: Firebase Console → Project Settings → Your apps → Web app config

### For Vercel Production
Set environment variables in Vercel dashboard or CLI:

```bash
# Login to Vercel
vercel login

# Navigate to project directory
cd "Solution Challenge 2026"

# Link project to Vercel (if not already)
vercel link

# Add env vars
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
vercel env add VITE_FIREBASE_PROJECT_ID production
vercel env add VITE_FIREBASE_STORAGE_BUCKET production
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
vercel env add VITE_FIREBASE_APP_ID production
vercel env add VITE_FIREBASE_MEASUREMENT_ID production
vercel env add VITE_GEMINI_API_KEY production
vercel env add VITE_GROQ_API_KEY production
```

---

## Step 2: Deploy Frontend to Vercel

### Option A: First-time Setup
```bash
# From project root
vercel --prod
```
This will:
1. Build your app with `npm run build` (Vite)
2. Upload to Vercel
3. Create production URL (e.g., `https://neurochain-ai.vercel.app`)

### Option B: Push to Git (Recommended for CI/CD)
1. Initialize git (if not done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create repository on GitHub/GitLab

3. Push and import to Vercel:
   ```bash
   git remote add origin https://github.com/username/repo.git
   git push -u origin main
   ```
   Then import project in Vercel dashboard → it auto-deploys on every push.

---

## Step 3: Deploy Firebase Functions

From the `functions/` directory:

```bash
cd functions

# Install dependencies
npm install

# Deploy only Functions to Firebase
firebase deploy --only functions
```

**Note**: Your `firebase.json` already has emulator config. Production deployment uses the Firebase project `neurochain-ai-cfafe` from `.firebaserc`.

---

## Step 4: Deploy Firestore Rules & Indexes

Create/update `firestore.rules` and `firestore.indexes.json` if needed, then:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Step 5: Verify Integration

1. **Frontend URL**: Visit your Vercel URL
2. **Firebase Console**: Check Firestore data in real-time
3. **Functions Logs**: `firebase functions:log` to monitor Cloud Functions
4. **Test workflow**:
   - Create a shipment in the app
   - Check Firestore → `shipments` collection
   - Trigger disruption simulation
   - Verify `onShipmentUpdate` function fires and reroutes

---

## Live Updates from IDE (Quick Redeploy Workflow)

### For Frontend Changes
```bash
# In your IDE terminal (project root):
npm run dev           # Development mode (localhost)
npm run build         # Build locally
vercel --prod         # Deploy to production (takes ~30s)
```

**Vercel CLI shortcut** (from project root):
```bash
# One command deploy:
vercel --prod
```

### For Firebase Function Changes
```bash
cd functions

# Update function code, then:
firebase deploy --only functions

# Or deploy specific function:
firebase deploy --only functions:onShipmentUpdate
```

### For Firestore Data Changes
Firestore updates are instant—no deployment needed. Just use the app UI or Firebase Console.

---

## Project Structure After Deployment

```
Solution Challenge 2026/
├── src/                  # React frontend
│   ├── firebase.js      # Firebase config (uses env vars)
│   ├── main.jsx         # Entry point
│   ├── App.jsx          # Routes
│   ├── pages/           # 6 pages (Overview, Operations, etc.)
│   ├── components/      # Shared UI components
│   ├── context/         # Auth, Theme, SupplyChain state
│   └── utils/           # Groq AI helper
├── functions/           # Firebase Functions
│   └── src/index.js     # Cloud Function: onShipmentUpdate
├── firebase.json        # Firebase config (emulators)
├── .firebaserc          # Firebase project ID
├── vercel.json          # Vercel build config
├── vite.config.js       # Vite bundler
├── package.json         # Frontend deps
└── .env                 # Local env vars (ignored by git)
```

---

## Key Production Considerations

1. **Environment Variables**: All VITE_* vars are exposed to client. Never store secrets in them.
   - Firebase config is public (that's okay—it's client SDK config)
   - API keys (Gemini, Groq) are also used client-side

2. **CORS**: Firebase Auth works on any domain by default. If issues, update Firebase Console → Authentication → Settings → Authorized domains.

3. **Firestore Security Rules**: Ensure rules allow authenticated users to read/write their data. Example:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /shipments/{shipmentId} {
         allow read, write: if request.auth != null;
       }
       match /nodes/{nodeId} {
         allow read: if true;  // Public read
         allow write: if false; // Admin only
       }
     }
   }
   ```

4. **Analytics & Monitoring**:
   - Vercel: Built-in analytics & logs
   - Firebase: Crashlytics, Performance Monitoring
   - Cloud Functions: Stackdriver logging

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Firebase: No Firebase App '[DEFAULT]'` | Ensure `firebase.initializeApp()` is called before using services (already done in `firebase.js`) |
| Build fails on Vercel | Check Vercel build logs; ensure `vercel.json` has correct `distDir` (`dist`) |
| Env vars not applied | Re-deploy after setting Vercel env vars; they're injected at build time |
| Functions not triggering | Check Firestore document path matches `shipments/{shipmentId}`; view logs with `firebase functions:log` |
| Live updates not working | Ensure Firestore listeners are active; check browser console for permission errors |

---

## Live Updates from IDE (Direct Deployment)

You can trigger deployments directly from your IDE terminal with single commands:

### Deploy Frontend Only (React App)
```bash
# From project root, one command:
npm run deploy
```
This builds and deploys to Vercel (~30 seconds). Your live site updates instantly.

### Deploy Functions Only (Backend Logic)
```bash
# From project root:
npm run deploy:functions
```
Deploys the `onShipmentUpdate` Cloud Function and any other functions.

### Deploy Both (Full Stack Update)
```bash
npm run deploy:all
```
Deploys functions first, then frontend—ensuring backend is ready before users hit the new UI.

### Real-Time Data Updates (No Deployment Needed)
Firestore data changes appear instantly in your app via listeners:
- Update shipment status in Firebase Console → reflects in app immediately
- Trigger simulations → live updates via Firestore triggers
- No redeploy needed for data-driven changes

### Windows Batch Scripts (Double-Click Deployment)
Pre-configured scripts in project root:
- `deploy-vercel.bat` — Deploy frontend only
- `deploy-functions.bat` — Deploy functions only
- `deploy-all.bat` — Deploy everything

Just double-click the `.bat` file or run from terminal.

### Watch Mode (Auto-Deploy on Save)
For rapid iteration, link your GitHub repo to Vercel:
1. Push to GitHub → Vercel auto-deploys (if connected)
2. Enable "Preview Deployments" for PR-based testing
3. Use "Alias" to promote preview to production

Or use Vercel CLI with file watcher:
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Watch and deploy on every change (advanced)
vercel --prod --force
```

```bash
# Frontend (from project root)
npm run dev              # Local dev server (http://localhost:5173)
npm run build            # Production build (outputs to /dist)
npm run deploy           # Deploy frontend to Vercel (one command!)

# Backend (from functions/ directory)
npm install              # Install function deps
npm run deploy:functions # Deploy all Firebase Functions
firebase deploy --only functions:onShipmentUpdate  # Deploy specific function
firebase functions:log --only onShipmentUpdate     # View logs

# Both frontend + backend
npm run deploy:all       # Deploy everything in order

# Firestore
firebase deploy --only firestore:rules
firebase emulators:start --only firestore  # Local testing
```

---

## Support
- **Vercel Docs**: https://vercel.com/docs
- ** Firebase Docs**: https://firebase.google.com/docs
- **Project Repo**: `neurochain-ai-cfafe`
