# 🎓 Complete Student Deployment Guide: MongoDB Atlas & Render

This step-by-step guide is designed specifically for students to take the **HomeStays** project from a local laptop to a **100% free, live, production cloud deployment** for college project presentation and invigilator evaluation.

---

## 📑 Contents
1. [Phase 1: Setting up MongoDB Atlas (Free Cloud Database)](#phase-1-setting-up-mongodb-atlas-free-cloud-database)
2. [Phase 2: Preparing Your GitHub Repository](#phase-2-preparing-your-github-repository)
3. [Phase 3: Deploying on Render with Blueprint](#phase-3-deploying-on-render-with-blueprint)
4. [Phase 4: Common Student Mistakes & How to Fix Them](#phase-4-common-student-mistakes--how-to-fix-them)
5. [Phase 5: Presentation Day Strategy (Getting Full Marks)](#phase-5-presentation-day-strategy-getting-full-marks)

---

## Phase 1: Setting up MongoDB Atlas (Free Cloud Database)

MongoDB Atlas gives you a free 512MB cloud database that stays online 24/7.

### Step 1.1: Create an Account
1. Open [cloud.mongodb.com](https://cloud.mongodb.com/) in your browser.
2. Sign up with Google or your college email.

### Step 1.2: Deploy a Free M0 Cluster
1. On the welcome screen, choose the **M0 Free** tier (Shared).
2. Choose **AWS** as the cloud provider and select the region closest to you (e.g., `Mumbai (ap-south-1)` for India).
3. Name your cluster (e.g. `Cluster0`) and click **Create Deployment**.

### Step 1.3: Create a Database User
1. Under **Quickstart / Security Quickstart**:
   - **Username**: Enter a simple username like `admin` or `homestay_user`.
   - **Password**: Enter a secure password (e.g. `Homestay@2026`).
     > ⚠️ **Student Warning**: Avoid using `@`, `#`, or `/` in your password, as these special characters can break URI strings. If you use `Homestay1234`, it will never cause syntax bugs.
2. Click **Create Database User**.

### Step 1.4: Configure Network Access (Crucial Step!)
> 🚨 **Why this is essential**: If you do not do this, your local laptop might connect, but Render will be **blocked** from connecting because Render's cloud servers use dynamic IP addresses.

1. In the Atlas left-hand sidebar, click **Network Access** (under the *Security* section).
2. Click the green **+ Add IP Address** button.
3. Click the button that says **ALLOW ACCESS FROM ANYWHERE**.
   - This sets the IP address to `0.0.0.0/0`.
4. Click **Confirm**. It will say *Status: Pending* for about 1 minute until it turns green (*Active*).

### Step 1.5: Get Your Connection String
1. In the left-hand sidebar, click **Database** (under the *Deployment* section).
2. Click the **Connect** button next to your cluster.
3. Select **Drivers** (Node.js).
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Replace `<password>` with your actual password (and **remove the `<>` angle brackets**).
6. Add `/homestays` before the `?` to name your database:
   ```
   mongodb+srv://admin:Homestay1234@cluster0.abcde.mongodb.net/homestays?retryWrites=true&w=majority
   ```
7. Save this string! You will need it for both local setup and Render.

---

## Phase 2: Preparing Your GitHub Repository

Because Render requires globally unique subdomains (e.g. `yourname-api.onrender.com`), you must give your project a unique name so it doesn't clash with other students.

### Step 2.1: Run the Blueprint Customizer
Open your terminal in the `HomeStays` root folder and run:
```powershell
.\scripts\configure-render.ps1 -ProjectSlug "yourname-homestays"
```
*(Replace `yourname-homestays` with your name or roll number, e.g. `rahul-2026`).*

### Step 2.2: Commit and Push to GitHub
```bash
git add .
git commit -m "Configure unique Render service names"
git push origin main
```

---

## Phase 3: Deploying on Render with Blueprint

Render will build both your backend API and frontend React client automatically using [`render.yaml`](./render.yaml).

### Step 3.1: Sign In to Render
1. Open [dashboard.render.com](https://dashboard.render.com/).
2. Click **Sign in with GitHub** (use the same GitHub account where your code is pushed).

### Step 3.2: Create a Blueprint Instance
1. In the top-right corner of the Render dashboard, click the blue **New +** button.
2. Select **Blueprint** from the dropdown menu.
3. Connect your GitHub repository:
   - If prompted, click **Configure GitHub App** and grant Render access to your `HomeStays` repository.
   - Click **Connect** next to your `HomeStays` repository.

### Step 3.3: Configure the Services
1. Render will read your `render.yaml` file automatically and detect two services:
   - Web Service: `<your-slug>-api` (Node/Express backend)
   - Static Site: `<your-slug>-client` (React/Vite frontend)
2. In the **Environment Variables** section on screen:
   - Find `DB_URL`.
   - Paste your MongoDB Atlas connection string from Phase 1.
3. Click **Apply**.

### Step 3.4: Watch the Build
Render will build both services:
- **Backend API**: Takes about 1–2 minutes (`npm install`).
- **Frontend Client**: Takes about 1–2 minutes (`npm install && npm run build`).
- Once finished, both services will display a green **Live** badge.

### Step 3.5: Note Your Live URLs
Your live links will be visible in the Render dashboard:
- **Client Web App**: `https://<your-slug>-client.onrender.com`
- **Backend API Health**: `https://<your-slug>-api.onrender.com/health`

---

## Phase 4: Common Student Mistakes & How to Fix Them

| Mistake | What Happens | How to Fix |
| :--- | :--- | :--- |
| **Kept `< >` in password** | `MongoParseError: URI malformed` or authentication fails. | Remove `<` and `>` around your password in the DB string. |
| **Forgot `0.0.0.0/0` in Atlas** | Works locally, but Render logs say `ServerSelectionError: queryTxt ETIMEOUT`. | Go to Atlas $\rightarrow$ Network Access $\rightarrow$ Add IP `0.0.0.0/0`. |
| **Reserved name on Render** | Render says `Service name 'homestays-api' is already taken`. | Run `npm run configure:render` to assign a unique name. |
| **Cold-start delay during viva** | Evaluator clicks the link, page spins for 60 seconds. | GitHub Actions auto-pings every 10 min. You can also run `npm run warmup`. |
| **Forgot to seed sample listings** | Homepage is empty when the invigilator opens it. | Run `npm run seed` locally to pre-populate 4 luxury homestays. |

---

## Phase 5: Presentation Day Strategy (Getting Full Marks)

Render's free tier spins down backend containers after 15 minutes of inactivity. HomeStays has a 3-layer anti-sleep defense system:

### 1. Automated 24/7 Cloud Pinger (Zero-Touch)
The repository includes `.github/workflows/keep-alive.yml` which pings your live Render API every 10 minutes automatically via GitHub Actions—keeping it permanently awake without opening any terminal!

### 2. Manual Pre-Presentation Warm-Up
5 minutes before your viva or evaluation begins:
1. Run `npm run warmup`.
2. It sends a fast HTTP probe to your live endpoint:
   - Wakes up the container if sleeping.
   - Primes the MongoDB database connection pool.
   - Warms up edge CDN caches.
   - Confirms that the response latency is under **150ms**!

### 3. Client-Side Smart Auto-Retry
If an evaluation happens right after cold spin-up, the frontend displays an animated warm-up banner (*"⚡ Waking up live cloud backend..."*) and retries up to 4 times automatically.

### 4. Evaluator Demo Walkthrough
When demonstrating to the teacher or invigilator:
1. **Show Homestay Browsing**: Point out the pre-seeded Manali Chalet, Goa Villa, and Jaipur Haveli. Filter by name or address.
2. **Show Dual Authentication**: Register a new user (`demo@homestays.com`). Highlight the **Smart Demo OTP Mode** that validates without needing external email APIs.
3. **Show Booking Flow**: Select dates on the interactive calendar, change guest count, inspect price calculations, and click Book.
4. **Show Host Management**: Go to **My Accommodations**, click **Add new place**, upload a photo or paste a URL, set perks, and save.
5. **Show Architecture**: Show the invigilator the architecture flowchart in [`README.md`](./README.md) to demonstrate your understanding of the fullstack MERN flow.
