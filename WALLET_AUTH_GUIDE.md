# 🔐 Wallet-Based Authentication Guide (No Password)

## ✅ Implementation Complete

Backend aur Frontend dono mein wallet signature-based authentication implement ho gaya hai.

---

## 🎯 Features

### Backend:
✅ Wallet signature verification using ethers.js
✅ No password system
✅ Referral system support
✅ Auto-generated unique user IDs
✅ Secure cookie-based sessions
✅ Comprehensive logging

### Frontend:
✅ MetaMask/TrustWallet/SafePal support
✅ Wallet connection
✅ Signature-based registration
✅ Signature-based login
✅ Auto-detect wallet changes
✅ Session management

---

## 📦 Installation

### Backend (Already Done):
```bash
npm install ethers
```

### Frontend:
```bash
npm install ethers
```

---

## 🚀 Frontend Setup

### Step 1: Copy Files

Copy these files to your React project:

1. **`FRONTEND_API_UTILS.js`** → `src/utils/walletAuth.js`
2. **`FRONTEND_WALLET_AUTH_CONTEXT.jsx`** → `src/context/WalletAuthContext.jsx`
3. **`FRONTEND_WALLET_COMPONENTS.jsx`** → Split into:
   - `src/components/WalletRegister.jsx`
   - `src/components/WalletLogin.jsx`
   - `src/components/Dashboard.jsx`

### Step 2: Environment Variables

```env
# .env
VITE_API_URL=http://localhost:3000/api
```

### Step 3: Wrap App with Provider

```jsx
// src/main.jsx
import { WalletAuthProvider } from './context/WalletAuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <WalletAuthProvider>
    <App />
  </WalletAuthProvider>
);
```

### Step 4: Setup Routes

```jsx
// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import WalletRegister from './components/WalletRegister';
import { WalletLogin } from './components/WalletLogin';
import { Dashboard } from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<WalletRegister />} />
        <Route path="/login" element={<WalletLogin />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 🔑 How It Works

### Registration Flow:

```
1. User clicks "Connect Wallet"
   ↓
2. MetaMask popup appears
   ↓
3. User approves connection
   ↓
4. Wallet address captured
   ↓
5. User enters username, mobile, referral (optional)
   ↓
6. User clicks "Sign Up"
   ↓
7. MetaMask asks to sign message
   ↓
8. Signature sent to backend
   ↓
9. Backend verifies signature
   ↓
10. User registered & logged in
```

### Login Flow:

```
1. User clicks "Connect & Login"
   ↓
2. MetaMask popup appears
   ↓
3. User approves connection
   ↓
4. MetaMask asks to sign message
   ↓
5. Signature sent to backend
   ↓
6. Backend verifies signature
   ↓
7. User logged in
```

---

## 📝 API Endpoints

### Register:
```
POST /api/user/register

Body:
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "username": "john_doe",
  "mobile": "1234567890",
  "referral": "BSG1234567", // optional
  "signature": "0x...",
  "message": "Sign this message..."
}

Response:
{
  "success": true,
  "message": "Wallet connected successfully",
  "token": "eyJhbGc...",
  "data": {
    "id": "BSG7654321",
    "username": "john_doe",
    "account": "0x742d35Cc...",
    "referralLink": "BSG7654321"
  }
}
```

### Login:
```
POST /api/user/login

Body:
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Sign this message..."
}

Response:
{
  "success": true,
  "message": "Wallet connected successfully",
  "token": "eyJhbGc...",
  "data": { ... }
}
```

---

## 🎨 Frontend Usage Examples

### Using the Hook:

```jsx
import { useWalletAuth } from '../context/WalletAuthContext';

function MyComponent() {
  const { 
    user, 
    walletAddress, 
    isAuthenticated, 
    connect, 
    login, 
    logout 
  } = useWalletAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome {user.username}</p>
          <p>Wallet: {walletAddress}</p>
          <button onClick={logout}>Disconnect</button>
        </>
      ) : (
        <button onClick={login}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Manual Registration:

```jsx
import { walletRegister, connectWallet } from '../utils/walletAuth';

async function register() {
  // 1. Connect wallet
  const walletAddress = await connectWallet();
  
  // 2. Register
  const result = await walletRegister(
    walletAddress,
    'username',
    '1234567890',
    'BSG1234567' // referral (optional)
  );
  
  // console.log(result);
}
```

### Manual Login:

```jsx
import { walletLogin, connectWallet } from '../utils/walletAuth';

async function login() {
  // 1. Connect wallet
  const walletAddress = await connectWallet();
  
  // 2. Login
  const result = await walletLogin(walletAddress);
  
  // console.log(result);
}
```

---

## 🔒 Security Features

### 1. Signature Verification
- Backend verifies wallet signature using ethers.js
- Prevents unauthorized access
- No password needed

### 2. Message Signing
- Unique message for each request
- Includes timestamp to prevent replay attacks
- User must sign with their private key

### 3. Secure Cookies
- HttpOnly cookies
- Secure flag in production
- SameSite protection

### 4. Wallet Change Detection
- Auto-logout on wallet change
- Auto-reload on network change

---

## 🐛 Troubleshooting

### Issue: MetaMask not detected

**Solution:**
```javascript
if (!window.ethereum) {
  alert('Please install MetaMask');
  window.open('https://metamask.io/download/', '_blank');
}
```

### Issue: User rejected signature

**Solution:**
```javascript
try {
  await walletLogin(address);
} catch (error) {
  if (error.message.includes('rejected')) {
    alert('Signature rejected. Please try again.');
  }
}
```

### Issue: Wrong network

**Solution:**
```javascript
const chainId = await window.ethereum.request({ 
  method: 'eth_chainId' 
});

if (chainId !== '0x1') { // Ethereum Mainnet
  alert('Please switch to Ethereum Mainnet');
}
```

---

## 📊 Testing

### Test Registration:

1. Open browser console
2. Run:
```javascript
import { walletRegister, connectWallet } from './utils/walletAuth';

const address = await connectWallet();
const result = await walletRegister(
  address,
  'testuser',
  '1234567890',
  null
);
// console.log(result);
```

### Test Login:

```javascript
import { walletLogin, connectWallet } from './utils/walletAuth';

const address = await connectWallet();
const result = await walletLogin(address);
// console.log(result);
```

---

## 🎯 Supported Wallets

✅ MetaMask
✅ TrustWallet
✅ SafePal
✅ Coinbase Wallet
✅ Any wallet supporting window.ethereum

---

## 📚 Key Differences from Password Auth

| Feature | Password Auth | Wallet Auth |
|---------|--------------|-------------|
| Login Method | Email + Password | Wallet Signature |
| Security | Password hash | Cryptographic signature |
| User Experience | Remember password | One-click login |
| Recovery | Forgot password | Wallet recovery phrase |
| Decentralization | ❌ Centralized | ✅ Decentralized |

---

## ✅ Checklist

### Backend:
- [x] ethers.js installed
- [x] Signature verification implemented
- [x] Wallet-based registration
- [x] Wallet-based login
- [x] Logging added

### Frontend:
- [ ] ethers installed
- [ ] Copy walletAuth.js
- [ ] Copy WalletAuthContext.jsx
- [ ] Copy components
- [ ] Wrap app with provider
- [ ] Test registration
- [ ] Test login

---

## 🚀 You're Ready!

Your DApp now has fully decentralized wallet-based authentication!

**No passwords. No email verification. Just wallet signatures.** 🔐
