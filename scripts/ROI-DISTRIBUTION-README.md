# ROI Share Distribution Script

## 📋 Overview
Yeh script un users ko ROI (Return on Investment) distribute karti hai jinko aaj tak ROI nahi mila hai.

## 🎯 Script Kya Karta Hai?

### 1. **Users Ko Find Karta Hai**
Script ye users dhundhti hai:
- ✅ Active users (`isActive: true`)
- ✅ Blocked nahi hai (`isBlocked: false`)
- ✅ ROI blocked nahi hai (`isRoiBlocked: false`)
- ✅ Aaj ROI collect nahi kiya (`todayRoiCollected: false`)
- ✅ Investment hai (`investment > 0`)

### 2. **ROI Calculate Karta Hai**
- Default ROI: **0.5% daily** (investment ka)
- Formula: `ROI Amount = (Investment × 0.5) / 100`

### 3. **Income Update Karta Hai**
Har eligible user ke liye:
- `roiWallet` me ROI amount add hota hai
- `currentIncome` update hota hai
- `totalIncome` update hota hai
- ROI history create hoti hai
- `todayRoiCollected` flag `true` ho jata hai

## 💰 Example Calculation

| User | Investment | ROI (0.5%) | Total Earned |
|------|-----------|-----------|--------------|
| User A | $10,000 | $50 | $50/day |
| User B | $5,000 | $25 | $25/day |
| User C | $2,000 | $10 | $10/day |
| User D | $1,000 | $5 | $5/day |

## 🚀 Script Kaise Chalaye?

### Method 1: NPM Script (Recommended)
```bash
npm run distribute-roi
```

### Method 2: Direct Node Command
```bash
node scripts/distribute-roi-shares.js
```

## 📊 Output Example

```
🚀 Starting ROI Share Distribution Script...

✅ Database connected successfully

📊 Total users found without ROI: 150

✅ User: john_doe | Investment: $10000 | ROI: $50.00
✅ User: jane_smith | Investment: $5000 | ROI: $25.00
✅ User: mike_wilson | Investment: $2000 | ROI: $10.00
...

============================================================
📈 ROI DISTRIBUTION SUMMARY
============================================================
✅ Successfully distributed: 150 users
❌ Failed: 0 users
💰 Total amount distributed: $7500.00
📊 Average ROI per user: $50.00
============================================================

✅ Script completed successfully!
```

## ⚙️ Configuration

Script me ye settings change kar sakte ho:

```javascript
const ROI_PERCENTAGE = 0.5;  // Daily ROI percentage
const SHARE_AMOUNT = 100;    // Default share amount
```

## 🔒 Security Features

- ✅ Sirf active aur verified users ko ROI milta hai
- ✅ Blocked users ko skip karta hai
- ✅ Duplicate distribution prevent karta hai
- ✅ Complete transaction history maintain karta hai

## 📝 Database Changes

### Users Collection
- `todayRoiCollected`: `false` → `true`

### IncomeDetails Collection
- `income.roiWallet`: +ROI amount
- `income.currentIncome`: +ROI amount
- `income.totalIncome`: +ROI amount

### ROIHistory Collection
- New entry create hoti hai har distribution ke liye

## ⚠️ Important Notes

1. **Daily Execution**: Yeh script daily ek baar chalani chahiye
2. **Cron Job**: Automatic execution ke liye cron job setup karein
3. **Backup**: Script chalane se pehle database backup le lein
4. **Testing**: Pehle test environment me test karein

## 🔄 Automation Setup

Automatic daily execution ke liye cron job:

```javascript
// Add to your cron folder
const cron = require('node-cron');

// Run daily at 12:01 AM
cron.schedule('1 0 * * *', async () => {
  // console.log('Running ROI distribution...');
  require('./scripts/distribute-roi-shares');
});
```

## 🐛 Troubleshooting

### Error: Database connection failed
```bash
# Check .env file me DATABASE_URL correct hai
DATABASE_URL=mongodb+srv://...
```

### Error: No users found
- Check karo users active hai ya nahi
- Verify karo `todayRoiCollected` flag reset ho raha hai daily

## 📞 Support

Issues ke liye admin se contact karein.
