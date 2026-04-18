# ⚡ Quick Start Guide

Get the Trust Score Engine running in 5 minutes.

## Prerequisites

- Node.js v14+
- MySQL 8.0+
- npm

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Database

**Ensure MySQL is running**, then:

```bash
mysql -u root -p < schema.sql
```

Enter your MySQL root password when prompted.

### 3. Configure Environment

Copy and update `.env`:

```bash
cp .env.example .env
```

Edit `.env` and replace `your_password` with your MySQL root password:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=trust_score_engine
JWT_SECRET=change_this_in_production
PORT=3000
```

### 4. Start the Server

```bash
npm start
```

You should see:
```
Trust Score Engine running on http://localhost:3000
```

### 5. Open Browser

Navigate to: **http://localhost:3000**

## 🔑 Test Account

**Admin Login:**
- Email: `admin@trust.io`
- Password: `Admin@123`

Or **sign up** a new account.

## 📚 Pages to Explore

1. **Landing Page** - Home with features
2. **Dashboard** - Your trust metrics & charts
3. **Feed** - Browse posts by topic, vote/report
4. **Profile** - Your detailed stats & history
5. **Admin Panel** (if admin) - Platform-wide monitoring

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| MySQL connection error | Start MySQL: `net start MySQL80` (Windows) or `mysql.server start` (Mac) |
| Port 3000 in use | Change PORT in `.env` or kill process on 3000 |
| "No database selected" | Run: `mysql -u root -p < schema.sql` again |
| Login fails | Check `.env` DB credentials |

## 📂 Important Files

- `server/index.js` - Backend entry point
- `public/index.html` - Landing page
- `schema.sql` - Database setup
- `.env` - Configuration

## 🔗 API Base

All APIs: `http://localhost:3000/api`

Protected routes require JWT token in header:
```
Authorization: Bearer <token>
```

## 📖 Full Documentation

See `README.md` for complete documentation.

---

**You're all set!** 🎉
