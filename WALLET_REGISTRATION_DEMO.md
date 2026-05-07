# 🧪 Wallet Registration - Demo Data & Testing

## 📝 Demo Data for Testing

### 1. Registration WITHOUT Referral
```json
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "username": "john_doe"
}
```

### 2. Registration WITH Referral
```json
{
  "walletAddress": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
  "username": "alice_smith",
  "referral": "BSG1234567"
}
```

### 3. Multiple Test Users
```json
// User 1 - Root User (No Referral)
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "username": "root_user"
}

// User 2 - Referred by User 1
{
  "walletAddress": "0x2345678901234567890123456789012345678901",
  "username": "user_two",
  "referral": "BSG1234567"  // User 1's referral code
}

// User 3 - Referred by User 2
{
  "walletAddress": "0x3456789012345678901234567890123456789012",
  "username": "user_three",
  "referral": "BSG7654321"  // User 2's referral code
}
```

---

## 🧪 cURL Test Commands

### Test 1: Register First User (No Referral)
```bash
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "username": "john_doe"
  }'
```

### Test 2: Register with Referral
```bash
curl -X POST http://localhost:3000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    "username": "alice_smith",
    "referral": "BSG1234567"
  }'
```

### Test 3: Login
```bash
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

---

## 🎯 Postman Collection

### Register Endpoint
```
Method: POST
URL: http://localhost:3000/api/user/register
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "username": "john_doe",
  "referral": "BSG1234567"
}
```

### Login Endpoint
```
Method: POST
URL: http://localhost:3000/api/user/login
Headers:
  Content-Type: application/json

Body (raw JSON):
{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
}
```

---

## 🧪 JavaScript Test Script

```javascript
// test-wallet-registration.js

const API_URL = 'http://localhost:3000/api';

// Test Data
const testUsers = [
  {
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    username: "john_doe"
  },
  {
    walletAddress: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    username: "alice_smith",
    referral: "BSG1234567"  // Will be updated after first user registration
  },
  {
    walletAddress: "0x9Cd1f109551bD432803012645Ac136ddd64DBA83",
    username: "bob_jones",
    referral: "BSG1234567"  // Will be updated
  }
];

// Register User
async function registerUser(userData) {
  try {
    const response = await fetch(`${API_URL}/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    // console.log('✅ Registration Success:', data);
    return data;
  } catch (error) {
    console.error('❌ Registration Failed:', error);
    return null;
  }
}

// Login User
async function loginUser(walletAddress) {
  try {
    const response = await fetch(`${API_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress })
    });
    
    const data = await response.json();
    // console.log('✅ Login Success:', data);
    return data;
  } catch (error) {
    console.error('❌ Login Failed:', error);
    return null;
  }
}

// Run Tests
async function runTests() {
  // console.log('🧪 Starting Wallet Registration Tests...\n');
  
  // Test 1: Register first user (no referral)
  // console.log('Test 1: Register Root User');
  const user1 = await registerUser(testUsers[0]);
  
  if (user1 && user1.success) {
    // console.log(`User 1 Referral Code: ${user1.data.referralLink}\n`);
    
    // Update referral for other users
    testUsers[1].referral = user1.data.referralLink;
    testUsers[2].referral = user1.data.referralLink;
    
    // Test 2: Register second user (with referral)
    // console.log('Test 2: Register User with Referral');
    const user2 = await registerUser(testUsers[1]);
    
    if (user2 && user2.success) {
      // console.log(`User 2 Referral Code: ${user2.data.referralLink}\n`);
      
      // Test 3: Register third user
      // console.log('Test 3: Register Another User');
      await registerUser(testUsers[2]);
    }
  }
  
  // Test 4: Login
  // console.log('\nTest 4: Login with Wallet');
  await loginUser(testUsers[0].walletAddress);
  
  // console.log('\n✅ All Tests Completed!');
}

// Run
runTests();
```

---

## 🎨 React Test Component

```jsx
// TestWalletRegistration.jsx

import { useState } from 'react';

export default function TestWalletRegistration() {
  const [result, setResult] = useState('');

  const testData = {
    walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    username: "john_doe",
    referral: ""  // Optional
  };

  const testRegister = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/user/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };

  const testLogin = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/user/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: testData.walletAddress 
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Wallet Registration Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Test Data:</h3>
        <pre>{JSON.stringify(testData, null, 2)}</pre>
      </div>
      
      <button onClick={testRegister} style={{ marginRight: '10px' }}>
        Test Register
      </button>
      
      <button onClick={testLogin}>
        Test Login
      </button>
      
      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>Result:</h3>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '10px', 
            borderRadius: '5px' 
          }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
```

---

## ✅ Expected Responses

### Successful Registration:
```json
{
  "success": true,
  "message": "Wallet connected successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "_id": "65f1234567890abcdef12345",
    "id": "BSG1234567",
    "username": "john_doe",
    "account": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "referralLink": "BSG1234567",
    "active": {
      "isVerified": true,
      "isActive": false,
      "isBlocked": false
    }
  },
  "role": "USER"
}
```

### Successful Login:
```json
{
  "success": true,
  "message": "Wallet connected successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": { ... },
  "role": "USER"
}
```

### Error - Wallet Already Exists:
```json
{
  "success": false,
  "message": "Wallet address already registered."
}
```

### Error - Invalid Referral:
```json
{
  "success": false,
  "message": "Invalid referral code."
}
```

---

## 🔍 Check Logs

After testing, check logs:

```bash
# View registration logs
type logs\app-2026-03-05.log | findstr "registration"

# View all wallet operations
type logs\app-2026-03-05.log | findstr "Wallet"

# View errors
type logs\error-2026-03-05.log
```

---

## 📊 Test Checklist

- [ ] Register user without referral
- [ ] Register user with valid referral
- [ ] Register user with invalid referral
- [ ] Try to register same wallet twice
- [ ] Login with registered wallet
- [ ] Login with unregistered wallet
- [ ] Check cookie is set
- [ ] Check logs for all operations

---

**Ready to test! Copy any demo data and start testing.** 🚀
