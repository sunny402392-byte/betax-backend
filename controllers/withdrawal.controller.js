const { UserModel } = require("../models/user.model");
const { TransactionModel } = require("../models/transaction.model");
const { CommissionIncome } = require("../models/commission.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const logger = require("../utils/logger");
const { ethers } = require("ethers");

const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];

// BEP20 USDT contract on BSC
const USDT_CONTRACT_BSC = "0x55d398326f99059fF775485246999027B3197955";

exports.requestWithdrawal = async (req, res) => {
  try {
    const userId = req.user._id;
    const { amount, walletAddress } = req.body;

    if (!amount || Number(amount) < 10)
      return res.status(400).json({ success: false, message: "Minimum withdrawal is $10." });

    if (!walletAddress)
      return res.status(400).json({ success: false, message: "Wallet address required." });

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // 24 hour check
    if (user.withdrawalInfo?.lastWithdrawalAt) {
      const lastTime = new Date(user.withdrawalInfo.lastWithdrawalAt);
      const hoursSince = (Date.now() - lastTime.getTime()) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = (24 - hoursSince).toFixed(1);
        return res.status(400).json({
          success: false,
          message: `You can withdraw again after ${hoursLeft} hours.`
        });
      }
    }

    const available = user.withdrawalInfo?.availableWithdrawalAmount || 0;
    const numAmount = Number(amount);

    if (numAmount > available)
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: $${available.toFixed(2)}` });

    const fee = numAmount * 0.1;
    const netAmount = numAmount - fee;

    // Auto BEP20 transfer via private key
    let txHash = null;
    try {
      const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC || "https://bsc-dataseed1.binance.org/");
      const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
      const usdtContract = new ethers.Contract(USDT_CONTRACT_BSC, USDT_ABI, wallet);
      const decimals = await usdtContract.decimals();
      const amountInWei = ethers.parseUnits(netAmount.toFixed(6), decimals);

      // Check contract balance
      const contractBalance = await usdtContract.balanceOf(wallet.address);
      if (contractBalance < amountInWei) {
        logger.error("Insufficient USDT in hot wallet", { required: netAmount, available: ethers.formatUnits(contractBalance, decimals) });
        return res.status(400).json({ success: false, message: "Withdrawal temporarily unavailable. Please try again later." });
      }

      const tx = await usdtContract.transfer(walletAddress, amountInWei);
      await tx.wait();
      txHash = tx.hash;
      logger.info("BEP20 transfer successful", { txHash, to: walletAddress, amount: netAmount });
    } catch (txErr) {
      logger.error("BEP20 transfer failed", { error: txErr.message });
      return res.status(500).json({ success: false, message: "Blockchain transfer failed. Please try again." });
    }

    // Deduct from available balance
    user.withdrawalInfo.availableWithdrawalAmount = Math.max(0, available - numAmount);
    user.withdrawalInfo.withdrawnAmount = (user.withdrawalInfo.withdrawnAmount || 0) + numAmount;
    user.withdrawalInfo.lastWithdrawalAt = new Date();
    user.markModified("withdrawalInfo");
    await user.save();

    // Save transaction
    const id = generateCustomId({ prefix: "BSG-WD", max: 14, min: 14 });
    await TransactionModel.create({
      id,
      user: userId,
      investment: numAmount,
      type: "Withdrawal",
      status: "Completed",
      hash: txHash,
      clientAddress: walletAddress,
      gasFee: fee,
      netAmount,
      role: "USER",
    });

    logger.info("Withdrawal successful", { userId, amount: numAmount, netAmount, txHash });

    return res.status(200).json({
      success: true,
      message: `Withdrawal of $${netAmount.toFixed(2)} sent successfully!`,
      data: { txHash, amount: numAmount, fee, netAmount, walletAddress }
    });

  } catch (err) {
    logger.error("Withdrawal error", { error: err.message });
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
