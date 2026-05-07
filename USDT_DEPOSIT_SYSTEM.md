# 💰 USDT BEP20 Automatic Deposit System

## ✅ Backend Already Configured

Backend mein USDT BEP20 payment system already implement hai with following features:

### Current Implementation:

```javascript
// POST /api/user/investment
{
  "amount": 500,                    // Package amount in USDT
  "txnHash": "0x123abc...",         // BEP20 transaction hash
  "fromWalletAddress": "0x742...",  // User's wallet
  "toWalletAddress": "0xA93..."     // Company wallet
}
```

### What Backend Does:

1. ✅ **Validates Amount** - Minimum $100
2. ✅ **Verifies Transaction** - Checks BSC blockchain
3. ✅ **Confirms Payment** - Validates transaction status
4. ✅ **Activates Package** - Updates user investment
5. ✅ **Starts ROI Timer** - Automatically via cron jobs
6. ✅ **Locks Capital** - Sets isCapitalLocked = true
7. ✅ **Logs Everything** - Complete audit trail

---

## 🎯 Package Configuration

### Trade Income Model Packages:

```javascript
const packages = [
  {
    id: 1,
    name: "V-100 ALPHA",
    roi: "4%",
    min: 100,
    max: 1000,
    capping: "200%"
  },
  {
    id: 2,
    name: "V-1100 BRAVO",
    roi: "5%",
    min: 1100,
    max: 5000,
    capping: "200%"
  },
  {
    id: 3,
    name: "V-5000 CHARLIE",
    roi: "6%",
    min: 5000,
    max: 10000,
    capping: "200%"
  },
  {
    id: 4,
    name: "V-X DELTA",
    roi: "7%",
    min: 10000,
    max: Infinity,
    capping: "200%"
  }
];
```

---

## 🔄 Complete Flow

### Step 1: User Selects Package
```javascript
// Frontend
const selectedPackage = {
  name: "V-100 ALPHA",
  amount: 500,  // User enters amount between min-max
  roi: "4%"
};
```

### Step 2: User Pays USDT BEP20
```javascript
// Frontend - Web3 Integration
const web3 = new Web3(window.ethereum);
const usdtContract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);

// Send USDT to company wallet
const tx = await usdtContract.methods
  .transfer(COMPANY_WALLET, amount)
  .send({ from: userWallet });

const txHash = tx.transactionHash;
```

### Step 3: Backend Verifies & Activates
```javascript
// Backend automatically:
// 1. Verifies transaction on BSC
const tx = await provider.getTransaction(txHash);
const receipt = await provider.getTransactionReceipt(txHash);

// 2. Confirms payment
if (receipt.status === 1) {
  // 3. Activates package
  user.investment += amount;
  user.active.isCapitalLocked = true;
  user.active.isActive = true;
  
  // 4. Saves transaction
  await TransactionModel.create({
    user: userId,
    investment: amount,
    type: "Deposit",
    status: "Completed",
    hash: txHash
  });
  
  // 5. ROI timer starts automatically via cron
}
```

### Step 4: ROI Starts Automatically
```javascript
// Cron job runs daily at 12:00 AM IST
// File: cron/combined.daily.cron.js

// Calculates trading profit for all active users
await tradingProfitCalculate(userId);

// Monthly ROI = (investment * package.roi) / 30 days
const dailyROI = (investment * 0.04) / 30;  // For 4% package
```

---

## 📝 API Endpoint

### POST /api/user/investment

**Request:**
```json
{
  "amount": 500,
  "txnHash": "0x1234567890abcdef...",
  "fromWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "toWalletAddress": "0xA93A5c1BE0C2869325daF327801720bF65F2b8f3"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Investment successful via blockchain wallet",
  "data": {
    "investment": 500
  }
}
```

**Error Responses:**
```json
// Invalid amount
{
  "success": false,
  "message": "Minimum deposit amount is $100."
}

// Transaction not found
{
  "success": false,
  "message": "Transaction not found on blockchain"
}

// Transaction failed
{
  "success": false,
  "message": "Transaction failed or not confirmed yet"
}
```

---

## 🔐 Environment Variables Required

```env
# .env file
BSC_RPC=https://bsc-dataseed.binance.org/
WALLET_ADDRESS=0xA93A5c1BE0C2869325daF327801720bF65F2b8f3
```

---

## 🎨 Frontend Integration Example

```javascript
// Complete deposit flow
async function depositUSDT(packageAmount) {
  try {
    // 1. Connect wallet
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    const userWallet = accounts[0];
    
    // 2. USDT Contract (BEP20)
    const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'; // BSC Mainnet
    const COMPANY_WALLET = '0xA93A5c1BE0C2869325daF327801720bF65F2b8f3';
    
    const web3 = new Web3(window.ethereum);
    const usdtContract = new web3.eth.Contract(USDT_ABI, USDT_ADDRESS);
    
    // 3. Send USDT
    const amountInWei = web3.utils.toWei(packageAmount.toString(), 'ether');
    const tx = await usdtContract.methods
      .transfer(COMPANY_WALLET, amountInWei)
      .send({ from: userWallet });
    
    // 4. Submit to backend
    const response = await fetch('http://localhost:3000/api/user/investment', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: packageAmount,
        txnHash: tx.transactionHash,
        fromWalletAddress: userWallet,
        toWalletAddress: COMPANY_WALLET
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Package activated! ROI will start from tomorrow.');
    }
    
  } catch (error) {
    console.error('Deposit failed:', error);
  }
}
```

---

## ⏰ ROI Timer Details

### Automatic ROI Calculation:

**File:** `cron/combined.daily.cron.js`

**Schedule:** Every day at 12:00 AM IST

**Process:**
1. Finds all active users with investments
2. Calculates daily ROI based on package percentage
3. Adds income to user's wallet
4. Stops when 200% capping reached

**Formula:**
```javascript
// Monthly ROI divided by 30 days
const daysInMonth = 30;
const dailyPercentage = packageROI / daysInMonth;
const dailyIncome = investment * (dailyPercentage / 100);

// Example: $500 investment in 4% package
// Daily = 500 * (4/30/100) = $0.67 per day
// Monthly = $20
// Total after 200% = $1000 (stops automatically)
```

---

## ✅ What's Already Working

1. ✅ USDT BEP20 payment verification
2. ✅ Blockchain transaction validation
3. ✅ Automatic package activation
4. ✅ ROI timer starts automatically
5. ✅ Daily ROI distribution via cron
6. ✅ 200% capping enforcement
7. ✅ Capital locking
8. ✅ Complete logging

---

## 🚀 Testing

```bash
# Test deposit
curl -X POST http://localhost:3000/api/user/investment \
  -H "Content-Type: application/json" \
  -H "Cookie: bsg=YOUR_TOKEN" \
  -d '{
    "amount": 500,
    "txnHash": "0x1234567890abcdef",
    "fromWalletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "toWalletAddress": "0xA93A5c1BE0C2869325daF327801720bF65F2b8f3"
  }'
```

---

**System fully ready for USDT BEP20 automatic deposits!** 🚀
