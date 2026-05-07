# Backend Logging System - Complete Guide

## 📊 Overview
Comprehensive Winston-based logging system implemented across the entire backend for clear monitoring and debugging.

## 🗂️ Log Files Location
All logs are stored in `logs/` directory:

### 1. **app-YYYY-MM-DD.log**
- All application logs (info, warnings, errors)
- HTTP requests and responses
- System events
- Rotates daily, keeps 30 days

### 2. **error-YYYY-MM-DD.log**
- Only error logs
- Stack traces included
- Critical failures
- Rotates daily, keeps 30 days

### 3. **cron-YYYY-MM-DD.log**
- All cron job executions
- Trading profit calculations
- Team shuffles
- ROI distributions
- Rotates daily, keeps 30 days

## 📝 Log Format
```
[2026-03-05 14:30:45] INFO: User logged in | {"userId":"123","ip":"192.168.1.1"}
[2026-03-05 14:31:20] ERROR: Payment failed | {"userId":"456","amount":5000,"error":"Insufficient balance"}
```

## 🔧 Files Updated with Logger

### Core Files
1. **app.js** - Application startup, middleware, error handling
2. **utils/config.db.js** - Database connection events
3. **utils/admin.autoregister.js** - Admin registration
4. **utils/logger.js** - Logger configuration (NEW)

### Cron Jobs
1. **cron/combined.daily.cron.js** - Daily ROI & Trading calculations
2. **cron/teamShuffle.cron.js** - Weekly team shuffling
3. **utils/levelIncome.calculation.js** - All income calculations

### Controllers
1. **controllers/user.controller.js** - User operations, investments, withdrawals

## 📊 What Gets Logged

### ✅ Success Events
- User registrations
- Successful investments
- Trading profit distributions
- Level income calculations
- Cron job completions
- Database connections

### ⚠️ Warning Events
- Low balances
- Failed transactions (non-critical)
- MongoDB disconnections

### ❌ Error Events
- Database connection failures
- Payment processing errors
- Blockchain verification failures
- Cron job failures
- API errors with stack traces

### 🔄 Cron Job Logs
- Start time (IST)
- Users processed
- Amounts distributed
- Success/failure status
- Execution duration

## 🎯 Key Features

### 1. HTTP Request Logging
Every API request logs:
- Method (GET, POST, etc.)
- URL
- Status code
- Response time
- IP address
- User agent

### 2. Cron Job Tracking
```javascript
logger.cronLog('Daily ROI Calculation', 'STARTED', { istTime });
logger.cronLog('Daily ROI Calculation', 'SUCCESS', { processedUsers: 150, totalAmount: 50000 });
logger.cronLog('Daily ROI Calculation', 'FAILED', { error: 'Database timeout' });
```

### 3. Error Tracking
All errors include:
- Error message
- Stack trace
- User ID (if applicable)
- Request details
- Timestamp

### 4. Investment Tracking
```javascript
logger.info('Package investment initiated', { userId, amount, txnHash });
logger.info('Package investment successful', { userId, amount, newInvestment });
logger.error('Package investment failed', { userId, error: err.message });
```

## 📖 How to Read Logs

### View Today's Logs
```bash
# All logs
type logs\app-2026-03-05.log

# Only errors
type logs\error-2026-03-05.log

# Only cron jobs
type logs\cron-2026-03-05.log
```

### Search for Specific User
```bash
findstr "userId:BT7123" logs\app-2026-03-05.log
```

### Search for Errors
```bash
findstr "ERROR" logs\app-2026-03-05.log
```

### Check Cron Job Status
```bash
findstr "CRON:" logs\cron-2026-03-05.log
```

## 🔍 Common Monitoring Tasks

### 1. Check if Daily ROI Ran
```bash
findstr "Daily ROI" logs\cron-2026-03-05.log
```

### 2. Find Failed Investments
```bash
findstr "investment failed" logs\error-2026-03-05.log
```

### 3. Monitor Database Issues
```bash
findstr "MongoDB" logs\error-2026-03-05.log
```

### 4. Track User Activity
```bash
findstr "userId:BT7123" logs\app-2026-03-05.log
```

## 🚨 Alert Indicators

### Critical Issues (Check Immediately)
- `MongoDB connection failed`
- `SESSION_SECRET is required`
- `Admin auto-registration failed`
- `CRON: ... FAILED`

### Warning Signs (Monitor)
- `MongoDB disconnected`
- `Payment processing failed`
- `Insufficient balance`

### Normal Operations
- `MongoDB Connected Successfully`
- `Server ready`
- `CRON: ... SUCCESS`
- `Package investment successful`

## 📈 Daily Monitoring Checklist

### Morning Check (After Cron Jobs)
1. Check `cron-YYYY-MM-DD.log` for:
   - ✅ Combined Daily Cron SUCCESS
   - ✅ Trading Profit calculations
   - ✅ Withdrawal stats updated

2. Check `error-YYYY-MM-DD.log` for:
   - Any FAILED cron jobs
   - Database errors
   - Payment failures

### Throughout the Day
1. Monitor `app-YYYY-MM-DD.log` for:
   - User registrations
   - Investment activities
   - Withdrawal requests

2. Check `error-YYYY-MM-DD.log` for:
   - API errors
   - User-reported issues

## 🛠️ Troubleshooting

### Issue: Logs not generating
**Solution:** Check if `logs/` directory exists, logger will create it automatically

### Issue: Too many log files
**Solution:** Old logs auto-delete after 30 days. Adjust in `utils/logger.js`:
```javascript
maxFiles: '30d'  // Change to '7d' for 7 days
```

### Issue: Log files too large
**Solution:** Adjust max size in `utils/logger.js`:
```javascript
maxSize: '20m'  // Change to '10m' for 10MB
```

## 📞 Support

### Log Levels
- **INFO** - Normal operations
- **WARN** - Potential issues
- **ERROR** - Failures requiring attention

### Environment Variable
Set log level in `.env`:
```
LOG_LEVEL=info  # Options: error, warn, info, debug
```

## 🎉 Benefits

1. **Clear Visibility** - Know exactly what's happening in your backend
2. **Quick Debugging** - Find issues fast with detailed error logs
3. **Audit Trail** - Track all user activities and transactions
4. **Performance Monitoring** - See response times for all requests
5. **Cron Job Tracking** - Verify automated tasks are running correctly
6. **Business Intelligence** - Analyze user behavior and system usage

---

**Note:** Logs are automatically rotated daily and old logs are deleted after 30 days to save disk space.
