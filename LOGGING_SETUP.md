# Logging System Setup Instructions

## 📦 Installation

### Step 1: Install Required Packages
```bash
npm install winston winston-daily-rotate-file
```

### Step 2: Verify Files
Make sure these files exist:
- `utils/logger.js` ✅
- `utils/logger.example.js` ✅
- `LOGGING_GUIDE.md` ✅

### Step 3: Update .gitignore
Already added:
```
logs/
*.log
```

### Step 4: Restart Server
```bash
npm start
```

## ✅ Verification

### Check if logging is working:

1. **Start the server** - You should see:
```
[2026-03-05 14:30:45] INFO: Application starting... | {"nodeEnv":"development","port":"3000"}
[2026-03-05 14:30:46] INFO: MongoDB Connected Successfully
[2026-03-05 14:30:46] INFO: Server ready | {"port":"3000"}
```

2. **Check logs folder** - Should be created automatically:
```
logs/
  ├── app-2026-03-05.log
  ├── error-2026-03-05.log
  └── cron-2026-03-05.log
```

3. **Make a test API request** - Check `logs/app-YYYY-MM-DD.log`:
```
[2026-03-05 14:31:20] INFO: HTTP Request | {"method":"GET","url":"/api/user/profile","status":200,"duration":"45ms"}
```

## 🎯 Quick Test

### Test 1: View Today's Logs
```bash
# Windows
type logs\app-2026-03-05.log

# Linux/Mac
cat logs/app-2026-03-05.log
```

### Test 2: Trigger an Error (Optional)
Try accessing a non-existent route:
```bash
curl http://localhost:3000/api/test-error
```

Check `logs/error-YYYY-MM-DD.log` for the error log.

### Test 3: Wait for Cron Job
Daily cron runs at 12:00 AM IST. Check `logs/cron-YYYY-MM-DD.log` next day.

## 📚 Documentation

Read the complete guide: **LOGGING_GUIDE.md**

## 🔧 Configuration

### Change Log Level
In `.env` file:
```env
LOG_LEVEL=info  # Options: error, warn, info, debug
```

### Change Log Retention
In `utils/logger.js`:
```javascript
maxFiles: '30d'  // Keep logs for 30 days
maxSize: '20m'   // Max file size 20MB
```

## ✨ Features Enabled

✅ HTTP request/response logging
✅ Error tracking with stack traces
✅ Cron job monitoring
✅ Database connection events
✅ User activity tracking
✅ Investment/withdrawal logging
✅ Daily log rotation
✅ Automatic old log cleanup

## 🚀 You're All Set!

Your backend now has comprehensive logging. Check `LOGGING_GUIDE.md` for detailed usage instructions.
