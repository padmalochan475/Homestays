# 🏡 HomeStays - Fullstack Vacation Rental Booking System

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-4-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black" alt="Render" />
</p>

<p align="center">
  A production-grade vacation rental and accommodation booking platform with comprehensive host property management, real-time date conflict handling, multi-channel authentication, and resilient cloud/local fallback architecture.
</p>

---

## 📑 Table of Contents
- [✨ Key Features](#-key-features)
- [🏛️ System Architecture](#️-system-architecture)
- [🚀 1-Click Setup & Run (Any Machine)](#-1-click-setup--run-any-machine)
- [🤖 Autonomous Multi-Agent & Resume Engine](#-autonomous-multi-agent--resume-engine)
- [🌐 Live Deployment on Render](#-live-deployment-on-render)
- [🔑 Environment Variables](#-environment-variables)
- [🛡️ Built-In Invigilator Resiliency Features](#️-built-in-invigilator-resiliency-features)
- [📡 API Reference](#-api-reference)
- [🧪 Pre-Seeded Demo Data](#-pre-seeded-demo-data)

---

## ✨ Key Features

- **Guest Experience**: Browse homestays, filter by title/location, view full photo galleries, inspect house rules/amenities, and book stays with custom guest counts and automated total price calculations.
- **Host Property Management**: List new accommodations, upload high-resolution photos (via local disk or AWS S3), paste direct image links, configure nightly prices, and edit/delete listings.
- **Booking Management**: Live booking calendar avoiding double-booking conflicts, viewing past/upcoming trips, and easy reservation cancellation.
- **Dual Authentication**: Seamless authentication using **both HTTP-only cookies and JWT `Bearer` headers**, completely immune to cross-domain third-party cookie restrictions.
- **Zero-Crash Demo Fallbacks**:
  - **Demo OTP Mode**: Complete user registration flow with OTP validation even if Google Cloud OAuth credentials are not provided.
  - **Local Storage Engine**: Upload and render photos locally even if AWS S3 credentials are not configured.
  - **Dynamic CORS**: Automatically accepts requests across `localhost`, Render subdomains, and Vercel.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Guest([User / Evaluator])

    subgraph Client ["Client (React + Vite)"]
        UI["Tailwind CSS Interface"]
        State["User & Auth Context"]
        Axios["Axios Interceptor (Bearer Token + Cookies)"]
        UI --> State --> Axios
    end

    subgraph Server ["Server (Express.js REST API)"]
        Router["API Routing & Middleware"]
        Auth["JWT Token Verification"]
        Controllers["Controllers (Place, Booking, User, OTP)"]
        StorageEngine["Dual Storage Engine (S3 / Local Uploads)"]
        Router --> Auth --> Controllers
        Controllers --> StorageEngine
    end

    subgraph Cloud ["Cloud & Persistence"]
        DB[(MongoDB Atlas)]
        S3Bucket[(AWS S3 Bucket / Local Disk)]
        MailService[(Gmail OAuth / Demo OTP)]
    end

    Guest -->|Interacts| UI
    Axios -->|REST API Requests| Router
    Controllers -->|CRUD Operations| DB
    StorageEngine -->|Store Photos| S3Bucket
    Controllers -->|Email / Code| MailService
```

---

## 🚀 How Students Use & Run This Project

### 💻 Option 1: Local Laptop Presentation (Instant — No GitHub account needed)
1. **Clone or Download**:
   ```bash
   git clone https://github.com/padmalochan475/Homestays.git
   cd Homestays
   ```
   *(Or click the green **Code → Download ZIP** on GitHub and extract the folder).*
2. **1-Click Launch**:
   * **On Windows**: Double-click **`START_HOMESTAYS.bat`**
   * **On macOS / Linux**: Run `./start.sh` (or `npm start`)
3. **Enter Credentials**:
   * Paste your MongoDB Atlas connection string when prompted.
   * That is literally all! The autonomous multi-agent assistant handles Node.js, dependencies, ports, database connection, demo listings, and opens your browser automatically!

---

### 🌐 Option 2: Live Cloud Presentation on Render (10-Second Setup)
Because Render builds directly from GitHub, you just need the repo in your personal GitHub account:
1. **Fork the Repository (10 Seconds)**:
   * Open [https://github.com/padmalochan475/Homestays](https://github.com/padmalochan475/Homestays).
   * In the top-right corner, click **Fork** → **Create fork**.
2. **Deploy on Render**:
   * Open [dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint**.
   * Connect your forked repository.
   * Paste your MongoDB Atlas URI when prompted for `DB_URL` → Click **Apply**.
   * Render automatically builds both the Express API and Vite React frontend with 24/7 keep-alive!

---

## 🤖 Autonomous Multi-Agent & Resume Engine

HomeStays features a built-in stateful **Autonomous Multi-Agent System** (`scripts/orchestrator.js`) designed to guarantee success when cloning on a clean machine:

| Agent | Responsibility |
|---|---|
| **System Agent** | Auto-detects Node.js LTS (>= 18). If missing on Windows, auto-installs it silently via winget / official MSI. |
| **Port Sentinel** | Checks API port `4000` and frees it if occupied by zombie/orphaned Node processes (`EADDRINUSE` immune). Frontend client port is dynamically auto-detected. |
| **Dependency Agent** | Validates backend and frontend npm dependencies. Installs missing packages in parallel. |
| **Config & Security Agent** | Auto-generates cryptographically secure 64-character `JWT_SECRET`, configures CORS, and synchronizes `.env`. |
| **Database Agent** | **Only asks user for credentials if needed**. Pings existing connection; if valid, skips instantly. If missing or invalid, prompts with targeted diagnostic assistance (Atlas `0.0.0.0/0` whitelist, campus Wi-Fi port blocking). |
| **Seed Agent** | Pre-populates 4 luxury homestays and demo host user (`demo@homestays.com` / `Demo@123`) if the database is fresh. |
| **Supervisor Agent** | Spawns API and Client concurrently, monitors `/health` probe, launches default web browser, and handles graceful shutdown. |

### 🔁 Stateful Resume (Zero Redo)
If a student closes the window midway during setup, or restarts their computer:
- The orchestrator checks `.homestays_state.json`.
- Completed stages are **verified in milliseconds and skipped**.
- It resumes immediately from where it left off, never re-prompting for credentials that are already working.

### Useful CLI Commands:
```bash
npm start           # Run autonomous multi-agent launcher & servers
npm run doctor      # Run full diagnostic health check without starting servers
npm run seed        # Re-seed demo luxury homestays and host credentials
npm run warmup      # Test and warm up live cloud Render endpoint
npm run reset       # Reset saved state checkpoints to re-run from scratch
```

---

## 🌐 Live Deployment on Render

> 📖 **Complete Visual Guide**: See [**`DEPLOYMENT.md`**](./DEPLOYMENT.md) for step-by-step instructions with screenshots.

### Overcoming the "Reserved Site Name" Error
Render requires subdomains on `*.onrender.com` to be globally unique. Because many students submit projects with default names (`homestays-api`), Render will reject blueprints if those names are already claimed.

HomeStays includes an automated slug synchronizer:
```powershell
.\scripts\configure-render.ps1 -ProjectSlug "yourname-homestays"
```
*(Replace `yourname-homestays` with your name or roll number).*

This instantly configures [`render.yaml`](./render.yaml), `.github/workflows/keep-alive.yml`, and client environment:
- **API Service**: `yourname-homestays-api`
- **Client Service**: `yourname-homestays-client`

### Deploying via Render Blueprint:
1. Ensure your MongoDB Atlas cluster has `0.0.0.0/0` enabled in **Network Access**.
2. Push your repo to GitHub:
   ```bash
   git add .
   git commit -m "Configure unique Render blueprint"
   git push origin main
   ```
3. In [dashboard.render.com](https://dashboard.render.com):
   - Click **New +** → **Blueprint**.
   - Connect your GitHub repository `padmalochan475/Homestays`.
   - Paste your MongoDB Atlas URI when prompted for `DB_URL`.
   - Click **Apply**.
4. Both frontend and backend deploy automatically. Render uses the included health check (`/health`) to confirm uptime.

---

## 🔑 Environment Variables

### Backend (`api/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `PORT` | API listen port | `4000` |
| `DB_URL` | MongoDB connection URI | `mongodb+srv://user:pass@cluster0...` |
| `CLIENT_URL` | Permitted frontend origins (all localhost ports auto-allowed by CORS) | `http://localhost:5173,http://127.0.0.1:5173` |
| `JWT_SECRET` | Token signature secret | *Auto-generated 64-character key* |
| `ADMIN_NAME` | Dedicated Administrator display name | `Platform Administrator` |
| `ADMIN_EMAIL` | Dedicated Administrator email (Access to `/admin`) | `admin@homestays.com` |
| `ADMIN_PASSWORD` | Dedicated Administrator login password | `Admin@123` |
| `HOST_NAME` | Sample Property Host display name | `Demo Host` |
| `HOST_EMAIL` | Property Host email (Access to `/account/places`) | `demo@homestays.com` |
| `HOST_PASSWORD` | Property Host login password | `Demo@123` |
| `AWS_REGION` | AWS S3 Bucket Region | *(Optional, falls back to disk)* |
| `BUCKET_NAME` | AWS S3 Bucket Name | *(Optional, falls back to disk)* |
| `S3_ACCESS_KEY` | AWS S3 Access Key | *(Optional, falls back to disk)* |
| `S3_SECRET_ACCESS_KEY` | AWS S3 Secret Key | *(Optional, falls back to disk)* |
| `MAIL_USERNAME` | Google OAuth2 user email | *(Optional, demo OTP active)* |
| `OAUTH_CLIENTID` | Google OAuth2 Client ID | *(Optional, demo OTP active)* |
| `OAUTH_CLIENT_SECRET` | Google OAuth2 Client Secret | *(Optional, demo OTP active)* |
| `OAUTH_REFRESH_TOKEN` | Google OAuth2 Refresh Token | *(Optional, demo OTP active)* |

### Frontend (`client/.env`)
| Variable | Description | Default / Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:4000` |

---

## 🛡️ Built-In Invigilator Resiliency Features

1. **Zero-Touch Cold Start Elimination**: Includes a 24/7 GitHub Actions workflow ([`.github/workflows/keep-alive.yml`](.github/workflows/keep-alive.yml)) that pings the live Render API every 10 minutes, keeping free-tier containers awake.
2. **Cold-Start Banner & Auto-Retry**: If the API is spinning up from cold sleep, the frontend displays an animated warm-up banner and automatically retries requests up to 4 times.
3. **Cross-Domain Bearer Tokens**: Solves third-party cookie restrictions across `*.onrender.com` by injecting `Authorization: Bearer <token>` into Axios headers while maintaining cookie compatibility.
4. **Auth State Hydration**: Protects account pages from bouncing users to `/login` during page refreshes by synchronizing auth state hydration.
5. **Cascading Bookings Cleanup**: Cancelling a booking cleanly frees reserved dates from the listing and removes references from user profiles.
6. **Bidirectional Credential Synchronization**: Editing administrator or host credentials (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `HOST_EMAIL`, `HOST_PASSWORD`) in `api/.env` automatically migrates accounts and syncs password hashes in MongoDB on boot or login; conversely, editing profile credentials in the Web UI automatically updates `api/.env` and runtime memory in real time.
6. **IDOR Authorization Protection**: Users can only update or delete accommodations and reservations that they own.

---

## 📡 API Reference

### Authentication & Users
- `POST /user/register` - Create user account
- `POST /user/login` - Authenticate user & issue JWT
- `POST /user/logout` - Clear user session
- `GET /user/profile` - Fetch current authenticated user
- `PUT /user` - Update profile name or password

### Accommodations (Places)
- `GET /places` - Fetch all accommodation listings
- `GET /place/:id` - Fetch details for a specific listing
- `POST /place` - Add a new homestay listing *(Authenticated)*
- `PUT /place` - Update existing listing *(Authenticated)*
- `DELETE /place` - Delete an accommodation listing *(Authenticated)*
- `GET /place/account` - Fetch accommodations created by current user *(Authenticated)*

### Bookings
- `POST /booking` - Reserve a homestay with date intervals *(Authenticated)*
- `GET /booking/account` - View all bookings of current user *(Authenticated)*
- `DELETE /booking` - Cancel a booking *(Authenticated)*

### Verification & Health
- `POST /otp/sendMail` - Generate and send OTP (Real email or Demo mode)
- `POST /otp/verifyOtp` - Validate submitted OTP code
- `POST /upload` - Upload photo files (Multi-part form)
- `POST /upload_by_link` - Add photo via URL
- `GET /health` - Health check probe (`{"status": "ok"}`)

---

## 🧪 Pre-Seeded Demo Data

Pre-populated sample accommodations:
1. **Mountain Mist Luxury Chalet** (Old Manali, Himachal Pradesh)
2. **Sunset Wave Villa & Private Pool** (Anjuna Beach, Goa)
3. **Royal Heritage Courtyard Haveli** (Jaipur, Rajasthan)
4. **Emerald Estate Tea Plantation Cottage** (Munnar, Kerala)

### Demo Credentials:
| Portal | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Dedicated Admin Console** | `admin@homestays.com` | `Admin@123` | Full system control: platform metrics, delete any accommodation, cancel any booking, manage user accounts & roles at `/admin`. |
| **Host Account** | `demo@homestays.com` | `Demo@123` | Host property management at `/account/places`, preview listings, test booking flows. |

---

## 🛡️ Dedicated Admin Console (`/admin`)

HomeStays features a dedicated **Administrator Management Console** accessible at `/admin`:
- **Real-Time KPIs**: Total registered users, total homestay listings, total reservations, and gross platform booking volume in ₹ INR.
- **Accommodations Moderation**: Inspect all listings across all hosts, preview properties, and delete violating listings with automatic cascade cleanup of reservations.
- **Reservations Management**: View all customer reservations platform-wide, guest contact info, dates, and amounts, with administrator cancellation capability.
- **User Management**: View all registered user accounts, toggle user roles between `USER` and `ADMIN`, or delete accounts.
- **System Diagnostics**: Inspect MongoDB connection state, API uptime, Node version, and environment health.

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
