Deployment quick-start
=====================

1) Install Git on your machine (Windows):
   - Option A (winget):
     ```powershell
     winget install --id Git.Git -e --source winget
     ```
   - Option B: download from https://git-scm.com and run the installer.

2) Create `requirements.txt` (already included) and `Procfile` (already included).

3) Initialize repo and push to GitHub:
   ```powershell
   cd c:\Projects\chess-project
   git init
   git add .
   git commit -m "Prepare project for deployment"
   # create a GitHub repo and add remote, then:
   git remote add origin https://github.com/<your-user>/<repo>.git
   git push -u origin main
   ```

4) Deploy:
   - Frontend: connect `UI/frontend` to Vercel/Netlify (build: `npm run build`, output: `dist`), set `VITE_API_URL` env.
   - Backend: use Railway/Render/Heroku/Render to deploy from GitHub. Start command:
     ```
     uvicorn server:app --host 0.0.0.0 --port $PORT
     ```

5) After deployment, set the frontend `VITE_API_URL` to point to the deployed backend URL and rebuild frontend.
