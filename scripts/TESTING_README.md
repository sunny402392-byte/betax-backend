# 🧪 Testing Scripts - 50 Users Chain

## 📋 Purpose
Test complete income distribution system with 50 users in a referral chain.

---

## 🚀 How to Run

### Step 1: Create 50 Users
```bash
node scripts/create-50-users-chain.js
```

**What it does:**
- Creates 50 users in a chain (User01 → User02 → User03 ... → User50)
- Assigns random packages ($100 to $15,000)
- Creates deposit transactions
- Distributes sponsor income (5%)
- Shows initial income breakdown

**Output:**
```
✅ 1/50 - User01 | $1000 | Sponsor: Root
✅ 2/50 - User02 | $500 | Sponsor: User01
✅ 3/50 - User03 | $2000 | Sponsor: User02
...
```

---

### Step 2: Run Monthly ROI Distribution
```bash
node scripts/test-monthly-roi.js
```

**What it does:**
- Runs monthly ROI calculation (4-7% based on package)
- Distributes level income (on ROI amount)
- Shows complete income breakdown for all users
- Displays overall statistics

**Output:**
```
User01 (ID: BT71234567)
────────────────────────────────────────────────────────────────────────────────
💼 Investment: $1000.00
👥 Direct Team: 1

💰 INCOME BREAKDOWN:
  💵 Sponsor Income (5%): $50.00
  📊 Level Income (ROI-based): $4.00
  📈 Trade ROI (Monthly): $40.00
  💳 Current Income (Withdrawable): $50.00
  💰 Total Income: $94.00
  📉 ROI Progress: 4.7% / 200%

📋 RECENT TRANSACTIONS:
  1. Level Income L1: $4.00
  2. Trading Profit Income: $40.00
  3. Sponsor Income: $50.00
```

---

## 📊 What You'll See

### 1. **Sponsor Income (5%)**
- Immediate on deposit
- Goes to direct sponsor only
- Example: User02 deposits $500 → User01 gets $25

### 2. **Trade ROI (Monthly)**
- 4-7% based on investment
- Goes to ROI Wallet
- Example: $1000 investment → $40 ROI (4%)

### 3. **Level Income (On ROI)**
- Distributed on ROI amount (not investment)
- Requires directs per level
- Example: User02 gets $40 ROI → User01 gets 10% = $4

### 4. **Income Wallets**
- **Current Income:** Sponsor income (withdrawable)
- **ROI Wallet:** Trade ROI (for deposits)
- **Level Income Wallet:** Level income (for deposits)
- **Total Income:** Tracks 200% cap

---

## 🔍 Testing Scenarios

### Scenario 1: Direct Sponsor Income
```
User01: $1000 investment
User02: $500 investment (sponsored by User01)

User01 receives:
- Sponsor Income: 5% of $500 = $25 ✅
```

### Scenario 2: Level Income Chain
```
User01: $1000 (gets $40 ROI)
User02: $500 (sponsored by User01, has 1 direct)
User03: $2000 (sponsored by User02, has 2 directs)

When User01 gets $40 ROI:
- User02 gets: 10% of $40 = $4 (L1) ✅
- User03 gets: 5% of $40 = $2 (L2) ✅
```

### Scenario 3: Direct Requirements
```
User01: $1000 (gets $40 ROI)
User02: 0 directs → Skipped ❌
User03: 1 direct → Gets L1 (10%) ✅
User04: 2 directs → Gets L2 (5%) ✅
```

---

## 📈 Expected Results

**Total Investment:** ~$250,000 (50 users × avg $5,000)

**Month 1 Income:**
- Sponsor Income: ~$12,500 (5% of total)
- Trade ROI: ~$12,500 (avg 5% of total)
- Level Income: ~$3,375 (27% of ROI)
- **Total Distributed:** ~$28,375

**ROI Progress:** ~5% towards 200% cap

---

## 🧹 Cleanup (Optional)

To remove test users:
```bash
node scripts/cleanup-test-users.js
```

---

## ✅ Verification Checklist

After running scripts, verify:
- [ ] All 50 users created
- [ ] Sponsor income distributed (5%)
- [ ] Trade ROI calculated (4-7%)
- [ ] Level income distributed (on ROI)
- [ ] Direct requirements working
- [ ] 300% capping enforced
- [ ] Income wallets separated
- [ ] Total income tracking 200% cap

---

## 📝 Notes

- Scripts use test data (User01-User50)
- Random packages assigned ($100-$15,000)
- Chain structure: linear (each user sponsors next)
- Real system: tree structure with multiple branches
- Generation ROI: Disabled (not in project doc)

---

## 🎯 Next Steps

1. Run `create-50-users-chain.js`
2. Check sponsor income distribution
3. Run `test-monthly-roi.js`
4. Verify level income on ROI
5. Check income wallets
6. Verify capping logic

**All income flows will be clearly visible!** 🚀
