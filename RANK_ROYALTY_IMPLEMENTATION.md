# Rank Reward & Royalty Club Implementation

## ✅ Implemented Features

### 1. Rank Reward System (10 Ranks, 10-Month Payout)

**Ranks:**
- Reward 1: $20K target → $50/month × 10 months = $500
- Reward 2: $40K target → $100/month × 10 months = $1,000
- Reward 3: $100K target → $500/month × 10 months = $5,000
- Reward 4: $200K target → $1K/month × 10 months = $10,000
- Reward 5: $500K target → $2.5K/month × 10 months = $25,000
- Reward 6: $1M target → $5K/month × 10 months = $50,000
- Reward 7: $1.6M target → $10K/month × 10 months = $100,000
- Reward 8: $3.6M target → $20K/month × 10 months = $200,000
- Reward 9: $8M target → $50K/month × 10 months = $500,000
- Reward 10: $16M target → $100K/month × 10 months = $1,500,000

**Features:**
- Auto-detection when user achieves rank based on team business
- Monthly payout for 10 months
- Tracks payout month and last payout date
- Income added to user wallet

### 2. Royalty Club Income (5 Tiers, Monthly Reset)

**Tiers:**
- 2%: $5,000 - $20,000 monthly business
- 3%: $20,001 - $50,000 monthly business
- 4%: $50,001 - $100,000 monthly business
- 5%: $100,001 - $250,000 monthly business
- 6%: $250,000+ monthly business

**Features:**
- 5% of total monthly turnover goes to royalty pool
- Distributed based on tier percentage shares
- Resets every month
- Tracks monthly business and tier

## 📁 Modified Files

1. **models/user.model.js** - Added `currentRank` and `royaltyClub` fields
2. **models/commission.model.js** - Added `Royalty Income` type
3. **controllers/reward.controller.js** - Complete implementation
4. **routes/reward.routes.js** - Added new endpoints
5. **cron/rankRoyalty.cron.js** - Monthly distribution cron (runs 1st of month at 00:01)

## 🔌 API Endpoints

### User Endpoints
- `GET /api/reward/rank-status` - Get current rank status & progress
- `GET /api/reward/royalty-status` - Get royalty tier & monthly business
- `GET /api/reward/rank-history` - Get rank reward payment history
- `GET /api/reward/royalty-history` - Get royalty income history

### Admin Endpoints (existing)
- `POST /api/reward/create` - Create reward
- `PUT /api/reward/update/:id` - Update reward
- `DELETE /api/reward/delete/:id` - Delete reward
- `PUT /api/reward/status/:id` - Toggle status
- `GET /api/reward/get-admin-reports` - All rewards
- `GET /api/reward/get-client-reports` - Active rewards

## 🔄 Cron Jobs

**File:** `cron/rankRoyalty.cron.js`
**Schedule:** 1st of every month at 00:01
**Functions:**
- `distributeMonthlyRankRewards()` - Pays rank rewards
- `calculateMonthlyRoyalty()` - Distributes royalty pool

## 🚀 Usage

### To activate cron in app.js:
```javascript
require('./cron/rankRoyalty.cron');
```

### Check rank achievement (call after deposit):
```javascript
const { checkRankAchievement } = require('./controllers/reward.controller');
await checkRankAchievement(userId);
```

## 📊 Database Schema

### User Model Additions:
```javascript
currentRank: {
  rank: String,
  achievedAt: Date,
  payoutMonth: Number,
  lastPayout: Date
},
royaltyClub: {
  tier: String,
  monthlyBusiness: Number,
  lastCalculated: Date
}
```

### Commission Income Types:
- "Rank Reward"
- "Royalty Income"
