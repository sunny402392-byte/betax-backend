# 🔄 ACTIVE CRONS & INCOME TYPES - COMPLETE SUMMARY

## 📅 DAILY CRONS (00:00 UTC / 5:30 AM IST)

### 1️⃣ Combined Daily Cron (`combined.daily.cron.js`)
**Schedule:** `0 0 * * *` (Daily 5:30 AM IST)
**Actions:**
- ✅ Reset `todayRoiCollected` flags
- ✅ Calculate Trading Profit (via `tradingNodeCron()`)
- ✅ Calculate Withdrawal Stats
- ❌ Daily ROI - DISABLED (commented out)

### 2️⃣ Trading Profit Cron (`levelIncome.calculation.js`)
**Schedule:** `0 0 * * *` (Daily 5:30 AM IST)
**Income Type:** `Trading Profit Income`
**Conditions:**
- ✅ User must be active, verified, not blocked
- ✅ `todayRoiCollected` must be false
- ✅ No Trading Profit already distributed today
- ✅ Package must NOT be 'LIVE AC'
- ✅ Must not exceed 3X cap per transaction
- ✅ Investment >= $100
**Calculation:**
- Monthly percentage / days in month = daily %
- Daily income = investment × daily %
- Capped at 3X per transaction
**Wallet:** Goes to `currentIncome` (main wallet)

### 3️⃣ Rank Reward Check (`levelIncome.calculation.js`)
**Schedule:** `10 0 * * *` (Daily 12:10 AM IST)
**Income Type:** `Rank Reward`
**Conditions:**
- ✅ User active, verified, not blocked
- ✅ Weaker leg business >= rank target
- ✅ User not already in that rank
**Calculation:**
- Based on weaker leg (min of left/right)
- Creates record with `rewardPaid: "Pending"`
- Does NOT pay immediately (paid manually by admin)

---

## 📆 MONTHLY CRONS (1st of Month)

### 4️⃣ Monthly ROI Cron (`monthly.roi.cron.js`)
**Schedule:** `0 0 1 * *` (1st of month, 12:00 AM IST)
**Income Type:** `Trading Profit Income`
**Conditions:**
- ✅ Investment >= $100
- ✅ Not already received ROI this month
- ✅ Total income < 200% cap (2X)
**Calculation:**
- $100-$1000 → 4% monthly
- $1100-$5000 → 5% monthly
- $5001-$10000 → 6% monthly
- $10001+ → 7% monthly
**Wallet:** Goes to `roiWallet` (separate ROI wallet)
**Note:** Also distributes generation ROI to uplines

### 5️⃣ Silver Club Incentive (`levelIncome.calculation.js`)
**Schedule:** `10 0 1 * *` (1st of month, 12:10 AM IST)
**Income Type:** `Silver Club Incentive`
**Conditions:**
- ✅ Total team business >= $200,000
- ✅ Total team business < $500,000 (else Gold Club)
- ✅ Strongest member >= 60% of total
- ✅ Not already paid this month
**Calculation:** 0.25% of total team business
**Wallet:** Goes to `currentIncome`

### 6️⃣ Gold Club Incentive (`levelIncome.calculation.js`)
**Schedule:** `10 0 1 * *` (1st of month, 12:10 AM IST)
**Income Type:** `Gold Club Incentive`
**Conditions:**
- ✅ Total team business >= $500,000
- ✅ Total team business < $1,000,000 (else Diamond Club)
- ✅ Strongest member >= 60% of total
- ✅ Not already paid this month
**Calculation:** 0.75% of total team business
**Wallet:** Goes to `currentIncome`

### 7️⃣ Diamond Club Royalty (`levelIncome.calculation.js`)
**Schedule:** `10 0 1 * *` (1st of month, 12:10 AM IST)
**Income Type:** `Diamond Club Royalty`
**Conditions:**
- ✅ Total team business >= $1,000,000
- ✅ Strongest member >= 60% of total
- ✅ Not already paid this month
**Calculation:**
- 2% of global monthly turnover
- Divided equally among all Diamond qualifiers
**Wallet:** Goes to `currentIncome`

---

## 🔄 WEEKLY CRONS

### 8️⃣ Team Shuffle Cron (`teamShuffle.cron.js`)
**Schedule:** `0 3 * * 1` (Every Monday 3:00 AM IST)
**Action:** Shuffles team divisions
**No Income Generated**

---

## 💰 ON-DEMAND INCOMES (Triggered by Events)

### 9️⃣ Sponsor Income (5%)
**Trigger:** When user makes deposit
**Income Type:** `Sponsor Income`
**Conditions:**
- ✅ Sponsor must be active, not blocked
- ✅ Investing user NOT in excluded list
- ✅ Sponsor NOT in excluded list
- ✅ Sponsor total income < 300% cap (3X)
**Calculation:** 5% of deposit amount
**Wallet:** Goes to `currentIncome`
**Excluded Users:** `['BSG0506884', 'BSG7210166', 'BSG6645644']`

### 🔟 Level Income (10 Levels)
**Trigger:** When user makes deposit
**Income Type:** `Level Income`
**Conditions:**
- ✅ Sponsor must be active, not blocked
- ✅ Investing user NOT in excluded list
- ✅ Sponsor NOT in excluded list
- ✅ Sponsor total income < 300% cap (3X)
- ✅ Level unlocked based on active directs (1 direct = 1 level)
**Percentages:**
- L1: 10%, L2: 5%, L3: 3%, L4-5: 2%, L6-10: 1%
**Wallet:** Goes to `levelIncomeWallet` (separate wallet)
**Excluded Users:** `['BSG0506884', 'BSG7210166', 'BSG6645644']`

---

## ❌ DISABLED CRONS

### ⛔ Matching Income
**Status:** COMMENTED OUT
**Schedule:** Was `10 0 1 * *`
**Income Type:** `Matching Income`
**Note:** Code exists but cron is disabled

### ⛔ Global Archive Reward
**Status:** COMMENTED OUT
**Schedule:** Was `10 0 * * *`
**Income Type:** `Global Archive Reward`
**Note:** Code exists but cron is disabled

---

## 📊 INCOME TYPES SUMMARY

| Income Type | Frequency | Wallet | Cap | Active |
|------------|-----------|--------|-----|--------|
| Trading Profit Income | Daily | currentIncome | 3X per tx | ✅ |
| Trading Profit Income (Monthly) | Monthly | roiWallet | 2X total | ✅ |
| Sponsor Income | On Deposit | currentIncome | 3X total | ✅ |
| Level Income | On Deposit | levelIncomeWallet | 3X total | ✅ |
| Rank Reward | Daily Check | Manual Payout | None | ✅ |
| Silver Club Incentive | Monthly | currentIncome | None | ✅ |
| Gold Club Incentive | Monthly | currentIncome | None | ✅ |
| Diamond Club Royalty | Monthly | currentIncome | None | ✅ |
| Matching Income | Monthly | currentIncome | 5 months | ❌ |
| Global Archive Reward | Daily | currentIncome | One-time | ❌ |

---

## 🆕 NEW IMPLEMENTATION NEEDED

### Rank Reward System (10 Ranks, 10-Month Payout)
**Status:** ⚠️ PARTIALLY IMPLEMENTED
- Daily check exists but only creates pending records
- Monthly payout cron NOT YET ACTIVE
- Need to add cron: `require('./cron/rankRoyalty.cron');` in app.js

### Royalty Club Income (5 Tiers, Monthly Reset)
**Status:** ⚠️ READY BUT NOT ACTIVE
- Code implemented in reward.controller.js
- Cron created in `cron/rankRoyalty.cron.js`
- Need to add cron: `require('./cron/rankRoyalty.cron');` in app.js

---

## 🔧 TO ACTIVATE NEW FEATURES

Add this line in `app.js` after line 24:
```javascript
require("./cron/rankRoyalty.cron");
```

This will activate:
- Monthly Rank Reward payouts (1st of month)
- Monthly Royalty Club distribution (1st of month)
