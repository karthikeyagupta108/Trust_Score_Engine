# Trust Score Engine

A complete full-stack web application for database-driven user trust and behavior analytics. Real-time behavioral analysis, suspicious activity detection, and community integrity management.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Default Login Credentials](#default-login-credentials)
- [Features Overview](#features-overview)

## ✨ Features

- **Dynamic Trust Scoring** - Real-time trust score calculation based on user behavior
- **Suspicious Activity Detection** - Automated detection with cluster analysis
- **Full Audit Trail** - Comprehensive activity logging and history tracking
- **Trust Graph** - Visualize relationships and trust networks
- **Weighted Voting** - Community consensus with credibility weighting
- **Admin Dashboard** - Platform-wide monitoring and management
- **Modern UI** - Dark-themed, glassmorphism design with smooth animations
- **JWT Authentication** - Secure session management with bcrypt password hashing

## 🛠 Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL 8.0
- **Frontend**: Vanilla HTML5 + CSS3 + JavaScript (no frameworks)
- **Authentication**: JWT + bcrypt
- **Charts**: Chart.js for data visualization
- **Port**: 3000

## 📦 Prerequisites

Before you begin, ensure you have installed:

1. **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
2. **MySQL Server** (v8.0 or higher) - [Download](https://www.mysql.com/downloads/mysql/)
3. **npm** (comes with Node.js)
4. A code editor (VS Code recommended)

Verify installations:
```bash
node --version
npm --version
mysql --version
```

## 🚀 Installation

### Step 1: Clone/Extract Project Files

```bash
cd hello
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- express
- mysql2
- bcrypt
- jsonwebtoken
- dotenv
- cors
- nodemon (dev dependency)

## 🗄 Database Setup

### Step 1: Start MySQL Server

**On Windows:**
```bash
# MySQL should be running as a service. Check Services app or:
net start MySQL80
```

**On macOS:**
```bash
mysql.server start
```

**On Linux:**
```bash
sudo service mysql start
```

### Step 2: Create Database and Tables

Open MySQL Client:

```bash
mysql -u root -p
```

Enter your MySQL root password when prompted.

Then paste the entire contents of `schema.sql`:

```sql
-- Copy the complete schema.sql file content and paste here
```

Or run directly:

```bash
mysql -u root -p < schema.sql
```

This will:
- Create the database `trust_score_engine`
- Create all 13 tables
- Set up triggers and stored procedures
- Insert seed data (5 sample users, posts, interactions)

**Verify tables were created:**
```bash
mysql -u root -p
USE trust_score_engine;
SHOW TABLES;
```

You should see 13 tables listed.

## ⚙ Configuration

### Step 1: Create .env File

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=trust_score_engine
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=3000
```

**Important**: Replace `your_mysql_password` with your actual MySQL root password.

### Step 2: Verify Database Connection

```bash
node server/index.js
```

If successful, you'll see:
```
Trust Score Engine running on http://localhost:3000
```

Press `Ctrl+C` to stop.

## 🎯 Running the Application

### Option 1: Production Mode

```bash
npm start
```

### Option 2: Development Mode (with auto-reload)

```bash
npm run dev
```

### Expected Output:

```
Trust Score Engine running on http://localhost:3000
```

### Step 3: Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

You should see the landing page with:
- Hero section with particles animation
- Feature cards
- Stats ticker
- Navigation to Sign Up and Login

## 📁 Project Structure

```
trust-score-engine/
├── server/
│   ├── index.js                    # Express app entry point
│   ├── db.js                       # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js                 # JWT authentication middleware
│   └── routes/
│       ├── auth.js                 # Sign up, login
│       ├── users.js                # User profile, activity, behavior
│       ├── posts.js                # Post CRUD operations
│       ├── interactions.js         # Voting, reporting, sharing
│       ├── trust.js                # Trust graph, leaderboard
│       └── admin.js                # Admin panel endpoints
├── public/
│   ├── index.html                  # Landing page
│   ├── signup.html                 # Sign up form
│   ├── login.html                  # Login form
│   ├── dashboard.html              # User dashboard
│   ├── feed.html                   # Post feed
│   ├── profile.html                # User profile
│   ├── admin.html                  # Admin panel
│   ├── css/
│   │   └── style.css               # All styling (responsive, dark theme)
│   └── js/
│       ├── auth.js                 # Auth utilities & JWT handling
│       ├── dashboard.js            # Dashboard logic
│       ├── feed.js                 # Feed & interactions
│       ├── profile.js              # Profile page logic
│       └── admin.js                # Admin panel logic
├── schema.sql                      # Database schema + seed data
├── package.json                    # Dependencies
├── .env.example                    # Environment template
└── README.md                       # This file
```

## 🔑 Default Login Credentials

After setup, you can login with these seeded accounts:

### Admin User
- **Username**: `admin_user`
- **Email**: `admin@trust.io`
- **Password**: `Admin@123`

### Regular Users
1. **alice_truth** | alice@trust.io | (Password in seed)
2. **bob_reliable** | bob@trust.io
3. **charlie_steady** | charlie@trust.io
4. **diana_moderate** | diana@trust.io
5. **eve_suspicious** | eve@trust.io (flagged as suspicious)

**Note**: For demo purposes, you can sign up a new account. Passwords must be 6+ characters.

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login user

### Users (JWT Protected)
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id/trust-history` - Get trust history (paginated)
- `GET /api/users/:id/activity` - Get recent activities
- `GET /api/users/:id/behavior` - Get behavior metrics
- `PATCH /api/users/me/status` - Update user status

### Posts (JWT Protected)
- `GET /api/posts` - Get all posts (filterable by topic)
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get single post
- `GET /api/posts/:id/interactions` - Get post interactions

### Interactions (JWT Protected)
- `POST /api/interactions` - Create interaction (vote/report/share)

### Trust (JWT Protected)
- `GET /api/trust/graph/:id` - Get trust graph
- `GET /api/trust/leaderboard` - Get top 10 users

### Admin (JWT Protected + Admin Only)
- `GET /api/admin/suspicious` - Get suspicious users
- `GET /api/admin/clusters` - Get clusters
- `GET /api/admin/trust-history` - Get global trust history
- `GET /api/admin/stats` - Get platform statistics
- `POST /api/admin/recalculate` - Recalculate suspicious detection

## 🎨 Frontend Pages

### 1. **Landing Page** (`index.html`)
- Particle background animation
- Hero section with CTA buttons
- Feature cards (6 features)
- Stats ticker with animated counters
- Navigation to signup/login

### 2. **Sign Up** (`signup.html`)
- Username, email, password fields
- Password strength indicator
- Form validation
- Auto-login on success

### 3. **Login** (`login.html`)
- Email or username login
- Remember me checkbox
- Secure JWT token storage

### 4. **Dashboard** (`dashboard.html`)
- Trust score card with progress bar
- Suspicion score monitoring
- Trust score history line chart (Chart.js)
- Recent activity feed (with icons)
- Behavior metrics with progress bars
- Trust leaderboard (top 5)

### 5. **Feed** (`feed.html`)
- Topic filter tabs (6 topics)
- Post grid (masonry layout)
- Vote/report/share buttons
- Trust-weighted score display
- Create post modal
- Floating action button

### 6. **Profile** (`profile.html`)
- Profile avatar and header
- Large trust score ring (animated)
- Suspicion score ring
- Tabs: Posts | Activity | Trust History | Behavior
- Trust history table with changes

### 7. **Admin Panel** (`admin.html`)
- Sidebar navigation
- Stats panel (6 metrics)
- Suspicious users table
- Cluster cards (color-coded by severity)
- Global trust history
- Re-run detection button

## 🎬 Walkthrough

### First Time Setup Example

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with your MySQL password
cp .env.example .env
# Edit .env and add your MySQL password

# 3. Set up database
mysql -u root -p < schema.sql
# Enter your MySQL password

# 4. Start the server
npm start
# Output: Trust Score Engine running on http://localhost:3000

# 5. Open browser
# Navigate to http://localhost:3000
```

### Complete User Journey

1. **Land on homepage** → See features and stats
2. **Sign up** → Create new account with username, email, password
3. **Dashboard** → View your trust score, activity, leaderboard
4. **Feed** → Browse posts by topic, vote/report/share
5. **Profile** → See your metrics, history, behavior data
6. **Admin (if admin)** → View platform stats, suspicious users, clusters

## 🔧 Troubleshooting

### MySQL Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution**: Ensure MySQL is running
```bash
# Windows
net start MySQL80

# macOS
mysql.server start

# Linux
sudo service mysql start
```

### Port 3000 Already in Use
```
Error: listen EADDRINUSE: address already in use :::3000
```
**Solution**: Change PORT in `.env` or kill process on port 3000
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3000
kill -9 <PID>
```

### "No database selected" Error
**Solution**: Re-run the schema.sql file:
```bash
mysql -u root -p < schema.sql
```

### JWT Token Expired
**Solution**: Clear localStorage and login again
```javascript
// In browser console
localStorage.clear()
// Then reload page or go to login
```

## 📊 Database Schema Overview

**13 Tables:**
1. `users` - User profiles with trust/suspicion scores
2. `user_auth` - Authentication credentials
3. `topics` - Discussion topics (5 seeded)
4. `posts` - User posts with content
5. `interactions` - Votes, reports, shares
6. `post_vote_summary` - Aggregated post statistics
7. `trust_graph` - Trust relationships between users
8. `trust_history` - Historical trust score changes
9. `user_behavior` - Behavioral metrics
10. `activity_log` - Complete activity audit trail
11. `suspicious_users` - Flagged suspicious users
12. `suspicious_clusters` - Risk-level clusters
13. `cluster_members` - Cluster membership mapping

## 🔐 Security Features

- ✅ Bcrypt password hashing (10 salt rounds)
- ✅ JWT authentication with 7-day expiration
- ✅ SQL injection prevention (prepared statements)
- ✅ CORS protection
- ✅ Admin-only routes with middleware verification
- ✅ Secure localStorage token handling
- ✅ Input validation on all endpoints

## 📈 Performance Features

- ✅ MySQL connection pooling
- ✅ Indexed foreign keys
- ✅ Pagination on history endpoints
- ✅ Chart.js for efficient data visualization
- ✅ Lazy loading skeletons
- ✅ Optimized CSS animations

## 🎨 Design Highlights

- **Dark Theme** - Reduces eye strain, modern aesthetic
- **Glassmorphism** - Frosted glass effect on cards
- **Smooth Animations** - 0.3s ease transitions throughout
- **Responsive Design** - Mobile-first, works on all screens
- **Color Coded** - Green (trust), Yellow (warning), Red (danger)
- **Accessibility** - Clear contrast ratios, readable fonts

## 📝 License

This project is provided as-is for educational and demonstration purposes.

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Verify MySQL is running
3. Ensure .env file is configured correctly
4. Check browser console for errors (F12)
5. Review server logs for backend errors

## 🎯 Next Steps

- Create more sample users for testing
- Explore all features in the dashboard
- Try the admin panel (login with admin credentials)
- Test interactions (voting, reporting, sharing)
- Monitor trust score changes in real-time
- Check activity logs for audit trails

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: 2026-04-18
