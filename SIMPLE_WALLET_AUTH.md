# 🔐 Simple Wallet Authentication (No Signature Required)

## ✅ Backend Updated - Signature Removed

Ab sirf wallet address se login/registration ho sakta hai. No signature verification needed.

---

## 📝 API Endpoints

### 1. Register
```
POST /api/user/register

Body:
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "username": "john_doe",
  "mobile": "1234567890",
  "referral": "BT71234567"  // optional
}

Response:
{
  "success": true,
  "message": "Wallet connected successfully",
  "token": "eyJhbGc...",
  "data": {
    "id": "BT77654321",
    "username": "john_doe",
    "account": "0x742d35Cc...",
    "referralLink": "BT77654321"
  }
}
```

### 2. Login
```
POST /api/user/login

Body:
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
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

## 🎨 Frontend Implementation

### Simple Fetch Example:

```javascript
// Connect Wallet
async function connectWallet() {
  if (!window.ethereum) {
    alert('Please install MetaMask');
    return;
  }
  
  const accounts = await window.ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  
  return accounts[0];
}

// Register
async function register() {
  const walletAddress = await connectWallet();
  
  const response = await fetch('http://localhost:3000/api/user/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      username: 'john_doe',
      mobile: '1234567890',
      referral: 'BT71234567' // optional
    })
  });
  
  const data = await response.json();
  // console.log(data);
}

// Login
async function login() {
  const walletAddress = await connectWallet();
  
  const response = await fetch('http://localhost:3000/api/user/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress })
  });
  
  const data = await response.json();
  // console.log(data);
}
```

---

## ⚡ React Component Example

```jsx
import { useState } from 'react';

export default function WalletAuth() {
  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [referral, setReferral] = useState('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }
    
    const accounts = await window.ethereum.request({ 
      method: 'eth_requestAccounts' 
    });
    
    setWalletAddress(accounts[0]);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    const response = await fetch('http://localhost:3000/api/user/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress,
        username,
        mobile,
        referral: referral || undefined
      })
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Registration successful!');
    }
  };

  const handleLogin = async () => {
    const response = await fetch('http://localhost:3000/api/user/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Login successful!');
    }
  };

  return (
    <div>
      {!walletAddress ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Connected: {walletAddress}</p>
          
          <form onSubmit={handleRegister}>
            <input 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input 
              placeholder="Mobile" 
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              required
            />
            <input 
              placeholder="Referral (optional)" 
              value={referral}
              onChange={(e) => setReferral(e.target.value)}
            />
            <button type="submit">Register</button>
          </form>
          
          <button onClick={handleLogin}>Login</button>
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Features

- ✅ No signature required
- ✅ Simple wallet connection
- ✅ Cookie-based sessions
- ✅ Referral system support
- ✅ Auto-generated user IDs
- ✅ Comprehensive logging

---

## 🎯 Testing

```bash
# Test Registration
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "username": "testuser",
    "mobile": "1234567890"
  }'

# Test Login
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

---

**Simple aur fast! No signature verification needed.** 🚀
