# Render Deployment Troubleshooting Guide

## Problem: Frontend Changes Not Appearing on Production

**Symptoms:**
- UI updates work on local development server
- Changes are pushed to GitHub successfully
- Render autodeploy triggers but frontend shows old version
- Backend updates work fine

---

## Root Cause

The original `render.yaml` only configured the **backend** service. The **frontend** was not included in the deployment configuration, so Render never built or deployed the new React components and styling changes.

---

## Solution

### Step 1: Updated render.yaml Configuration

The `render.yaml` file has been updated to include a static frontend service:

```yaml
services:
  - type: web
    name: codeclash-backend
    runtime: python
    rootDir: .
    buildCommand: pip install -r requirements.txt
    startCommand: python -m uvicorn server:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHONUNBUFFERED
        value: true

  - type: static
    name: codeclash-frontend
    rootDir: frontend
    buildCommand: npm install && npm run build
    staticPublishPath: dist
    envVars:
      - key: NODE_ENV
        value: production
```

**Key Changes:**
- Added `type: static` service for frontend
- `buildCommand`: Installs dependencies and builds Vite bundle
- `staticPublishPath: dist`: Serves built files from `frontend/dist/`
- `NODE_ENV: production`: Optimizes React for production

---

## How to Deploy Now

### 1. **Push to GitHub**
```bash
git add .
git commit -m "feat: update UI"
git push origin main
```

### 2. **Render Will Automatically:**
- Detect the new commit
- Trigger autodeploy for both services
- Build backend: `pip install -r requirements.txt`
- Build frontend: `npm install && npm run build`
- Deploy both services simultaneously

### 3. **Monitor Deployment**
- Go to https://dashboard.render.com
- Click on your web service
- View real-time logs showing:
  - `npm install` progress
  - Vite build output (419 modules)
  - Static file deployment

### 4. **Verify Deployment**
- Visit your production URL
- Check browser DevTools Console for errors
- Verify all CSS and animations are loading

---

## Deployment Timeline

**Before Fix:**
- Push to GitHub → Only backend deployed → Frontend ignored

**After Fix:**
- Push to GitHub → Both services deploy in parallel
- Frontend build time: ~30-60 seconds
- Total deployment time: ~2-3 minutes

---

## Common Issues & Solutions

### Issue 1: "npm: command not found"
**Cause:** Node.js not available in build environment  
**Solution:** Render automatically provides Node.js for `npm` commands. Ensure `buildCommand` is correct:
```yaml
buildCommand: npm install && npm run build
```

### Issue 2: Build fails with "module not found"
**Cause:** Dependencies not installed  
**Solution:** Ensure `package.json` and `package-lock.json` are committed:
```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "add frontend dependencies"
git push origin main
```

### Issue 3: Old files still showing
**Cause:** Browser cache  
**Solution:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue 4: Vite build fails
**Cause:** Tailwind CSS or Framer Motion issues  
**Solution:** Check build logs in Render dashboard:
- Look for error messages
- Run locally: `npm run build` to reproduce
- Fix errors in code
- Commit and push again

---

## File Structure for Deployment

```
project-root/
├── render.yaml (CRITICAL - configures both services)
├── requirements.txt (backend dependencies)
├── server.py (backend entry point)
├── frontend/
│   ├── package.json ✓ (must be committed)
│   ├── package-lock.json ✓ (must be committed)
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       ├── main.jsx
│       └── components/
│           ├── BiometricAvatar.jsx
│           ├── GlassmorphicEditor.jsx
│           ├── MatchmakingArena.jsx
│           ├── DuelHUD.jsx
│           └── CyberpunkFX.jsx
```

**Important:** All files must be committed to git, including `node_modules` is NOT needed (generated during build).

---

## Verifying Deployment Success

### Backend Service
Check if Python server started:
```
✓ Ready on http://0.0.0.0:10000
```

### Frontend Service
Check if React app deployed:
```
✓ Static site deployed to https://codeclash-frontend.onrender.com
```

Both URLs should be accessible in Render dashboard under "Services".

---

## Next Deployment

After this fix, every time you:
1. Make code changes locally
2. Test on `npm run dev`
3. Push to GitHub

Render will **automatically**:
1. Build the new frontend (Tailwind, Vite)
2. Deploy updated static files
3. Backend updates simultaneously

**No manual intervention needed!**

---

## Render Dashboard Navigation

1. **Services Page**: https://dashboard.render.com/services
2. **View Deployment Logs**: Click service → "Logs" tab
3. **Manual Redeploy**: "Deploy latest commit" button
4. **Environment Variables**: "Environment" tab

---

## If Deployment Still Doesn't Work

### Step 1: Manual Redeploy
- Go to Render dashboard
- Click "Deploy latest commit" button
- Watch logs for errors

### Step 2: Check GitHub Connection
- Ensure repository is connected to Render
- Verify branch is set to `main`
- Check webhook is active

### Step 3: Rebuild Dependencies
- In Render dashboard: Settings → "Clear build cache"
- Click "Deploy latest commit"
- This forces full rebuild from scratch

### Step 4: Check Build Logs
Look for specific error patterns:
```
npm ERR! 404 Not Found - Tailwind not found
→ Solution: git add package-lock.json && git push

npm ERR! peer dep missing
→ Solution: npm install locally, commit lock file

ENOSPC: no space left
→ Solution: Contact Render support

ERR! code ENOTFOUND
→ Solution: Network issue, try manual redeploy
```

---

## Deployment Checklist

- [ ] `render.yaml` updated with frontend service
- [ ] `package.json` committed to git
- [ ] `package-lock.json` committed to git
- [ ] `frontend/` directory structure correct
- [ ] All components in `frontend/src/components/`
- [ ] Changes pushed to `main` branch
- [ ] GitHub webhook connected to Render
- [ ] Render dashboard shows both services
- [ ] Frontend build completes in logs
- [ ] Production URL shows new UI

---

## Questions & Support

**Q: How long does deployment take?**  
A: Typically 2-3 minutes for full deploy (npm install + build + deploy)

**Q: Can I deploy without GitHub?**  
A: Yes, use "Deploy latest commit" button for manual deploys

**Q: Why is frontend in subdirectory?**  
A: Monorepo structure allows backend and frontend versioning together

**Q: Will this break anything?**  
A: No, it only adds the missing frontend service. Backend continues normally.

---

**Last Updated:** 2026-02-01  
**Status:** ✅ Ready for Production Deployment
