# What you must do yourself (submission)

I prepared:
- polished `README.md`
- `DEMO_SCRIPT.md` (what to say/show in the video)
- cleaned project files for GitHub

These steps need **your** accounts / screen:

## 1) Create git repo + first commit
In **Terminal** (not Cursor sandbox):

```bash
cd "/Users/shanti/Desktop/internship/weather-app"
rm -rf .git
git init -b main
git add .
git status
git commit -m "Initial full-stack weather app for PM Accelerator assessment"
```

## 2) Fix GitHub login
```bash
gh auth login
```
(GitHub.com → HTTPS → login in browser)

Your current `gh` token is invalid (`CodeDuck07`), so push will fail until you re-login.

## 3) Create public repo and push
```bash
cd "/Users/shanti/Desktop/internship/weather-app"
gh repo create weather-app-pm-accelerator --public --source=. --remote=origin --push
```

Or manually on github.com (Public), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
git push -u origin main
```

## 4) Record demo video (1–2 min)
Follow `DEMO_SCRIPT.md`.  
Upload to YouTube (unlisted) or Google Drive (anyone with the link).

## 5) Add video link to README
Replace the last line in `README.md`, then:
```bash
git add README.md
git commit -m "Add demo video link"
git push
```

## 6) Submit Google Form
Send:
- GitHub URL
- Demo video URL
- Note: **Assessment #1 and #2 completed**

---

### I cannot do for you
- GitHub login / create remote repo / push (auth broken here)
- Record or upload the demo video
- Submit the Google Form
