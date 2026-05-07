# Register New User Under User50 (BT73560296)

## Using curl:
```bash
curl -X POST http://localhost:5000/api/wallet/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x1234567890123456789012345678901234567890",
    "username": "TestUser1",
    "referral": "BT73560296"
  }'
```

## Using Postman/Thunder Client:
- Method: POST
- URL: http://localhost:5000/api/wallet/register
- Headers: Content-Type: application/json
- Body (JSON):
```json
{
  "walletAddress": "0x1234567890123456789012345678901234567890",
  "username": "TestUser1",
  "referral": "BT73560296"
}
```

## Important Notes:
1. Replace the walletAddress with a unique Ethereum/BSC wallet address
2. Replace username with desired username
3. User50's referral code is: BT73560296
4. The new user will be created as a direct partner of User50
5. User50's partner count will increase by 1

## To run the Node.js test script:
```bash
node test-register-user.js
```
