const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint amount) returns (bool)"
];

// ✅ Token mapping
const tokens = {
  BNB: ethers.ZeroAddress, // Native BNB
  USDT: '0x55d398326f99059ff775485246999027b3197955',
  ETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', // ETH on BSC
  TRX: '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B', // TRX on BSC
  TRX: '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B', // TRX on BSC
  FDUSDT: '0xYourFDUSDTTokenAddress',
  ETC: '0xYourETCTokenAddress'
};

// Fetch real-time BNB price and convert USDT → BNB
const fetchBNBPrice = async (amount) => {
  try {
    const res = await fetch(process.env.BNB_TO_USDT);
    const data = await res.json();
    const bnbPrice = parseFloat(data.price); // BNB price in USDT
    if (bnbPrice > 0) {
      const convertedBNB = (amount / bnbPrice).toFixed(5);
      return convertedBNB || 0;
    }
  } catch (error) {
    console.error("Error fetching BNB price:", error);
    return 0
  }
};

async function sendToken(symbol, to, amount) {
  try {
    const tokenAddress = tokens[symbol.toUpperCase()];
    if (!tokenAddress) throw new Error(`Token ${symbol} not supported`);
    if (tokenAddress === ethers.ZeroAddress) {
      const bnbAmount = await fetchBNBPrice(amount)
      const parsedAmount = ethers.parseEther(bnbAmount.toString()); // BigInt
      const balance = await wallet.provider.getBalance(wallet.address); // BigInt
      if (balance < parsedAmount) throw new Error("Insufficient BNB balance");
  
      const tx = await wallet.sendTransaction({ to, value: parsedAmount,gasLimit: "21000", });
      await tx.wait();
      return tx.hash;
    }
    
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const decimals = await contract.decimals();
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals); // BigInt
    
    const balance = await contract.balanceOf(wallet.address); // BigInt
    if (balance < parsedAmount) throw new Error(`Insufficient ${symbol} balance`);
    const tx = await contract.transfer(to, parsedAmount);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    throw error;
  }
};

async function sendUsdtWithdrawal({symbol, toAddress, amount}) {
  try {
    const tokenAddress = tokens[symbol.toUpperCase()];
    if (!tokenAddress) throw new Error(`Token ${symbol} not supported`);
    if (tokenAddress === ethers.ZeroAddress) {
      const bnbAmount = await fetchBNBPrice(amount)
      const parsedAmount = ethers.parseEther(bnbAmount.toString()); // BigInt
      const balance = await wallet.provider.getBalance(wallet.address); // BigInt
      if (balance < parsedAmount) throw new Error("Insufficient BNB balance");
      const tx = await wallet.sendTransaction({ toAddress, value: parsedAmount,gasLimit: "21000", });
      await tx.wait();
      return tx.hash;
    }
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    const decimals = await contract.decimals();
    const parsedAmount = ethers.parseUnits(amount.toFixed(6).toString(), decimals); // BigInt
    
    const balance = await contract.balanceOf(wallet.address); // BigInt
    // // console.log({amount,balance,parsedAmount})
    if (balance < parsedAmount) {
      throw new Error(`Insufficient ${symbol} balance`);
    };
    const tx = await contract.transfer(toAddress, parsedAmount);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    throw error;
  }
}

async function sendUsdtInvestment({symbol, toAddress, amount, privateKey}) {
  try {
    const walletClient = new ethers.Wallet(privateKey, provider);
    const tokenAddress = tokens[symbol.toUpperCase()];
    if (!tokenAddress) throw new Error(`Token ${symbol} not supported`);
    if (tokenAddress === ethers.ZeroAddress) {
      const bnbAmount = await fetchBNBPrice(amount);
      const parsedAmount = ethers.parseEther(bnbAmount.toString()); // BigInt
      const balance = await walletClient.provider.getBalance(walletClient.address); // BigInt
      if (balance < parsedAmount) throw new Error("Insufficient BNB balance");
      const tx = await walletClient.sendTransaction({ toAddress, value: parsedAmount,gasLimit: "21000", });
      await tx.wait();
      return tx.hash;
    }
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, walletClient);
    const decimals = await contract.decimals();
    const parsedAmount = ethers.parseUnits(amount.toString(), decimals); // BigInt
    const balance = await contract.balanceOf(walletClient.address); // BigInt
    // // console.log({parsedAmount,balance})
    if (balance < parsedAmount) {
      throw new Error(`Insufficient ${symbol} balance`);
    };
    const tx = await contract.transfer(toAddress, parsedAmount);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    throw error;
  }
}

module.exports = { sendToken,sendUsdtWithdrawal,sendUsdtInvestment };
