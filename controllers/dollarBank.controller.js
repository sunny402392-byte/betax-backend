const { DollarBankModel } = require("../models/dollarBank.model");
const { IncomeModel } = require("../models/income.model");
const { TransactionModel } = require("../models/transaction.model");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("../utils/generator.uniqueid");

// Dollar Bank Investment API
exports.DollarBankInvestment = async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be greater than 0.",
      });
    }

    const amountNumber = Number(amount);

    // Minimum investment validation
    if (amountNumber < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum investment amount is $100.",
      });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist.",
      });
    }

    // Get income details
    const incomeDetail = await IncomeModel.findById(user.incomeDetails);
    if (!incomeDetail) {
      return res.status(404).json({
        success: false,
        message: "Income details not found.",
      });
    }

    // Check if user has enough balance
    if (incomeDetail.income.currentIncome < amountNumber) {
      return res.status(409).json({
        success: false,
        message: "Insufficient balance. Please try again with an amount within your available limit.",
      });
    }

    // Calculate profit (15% of investment)
    const profitPercentage = 15;
    const profit = (amountNumber * profitPercentage) / 100;
    const totalAmount = amountNumber + profit;

    // Calculate maturity date (1 year from now)
    const investmentDate = new Date();
    const maturityDate = new Date(investmentDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + 1);

    // Generate transaction ID
    const transactionId = generateCustomId({ prefix: "BSG-TX", min: 10, max: 10 });
    
    // Create transaction record
    const newTransaction = new TransactionModel({
      id: transactionId,
      user: user._id,
      investment: amountNumber,
      clientAddress: user.account || "Dollar Bank Investment",
      mainAddress: process.env.WALLET_ADDRESS || "Dollar Bank",
      role: "USER",
      type: "Deposit",
      status: "Completed",
    });

    // Create Dollar Bank investment record
    const bankId = generateCustomId({ prefix: "DB", min: 10, max: 10 });
    const dollarBankInvestment = new DollarBankModel({
      id: bankId,
      user: user._id,
      investment: amountNumber,
      profit: profit,
      totalAmount: totalAmount,
      investmentDate: investmentDate,
      maturityDate: maturityDate,
      status: "Active",
      transaction: newTransaction._id,
    });

    // Deduct amount from current income
    incomeDetail.income.currentIncome -= amountNumber;

    // Save everything
    await newTransaction.save();
    await dollarBankInvestment.save();
    user.transactions.push(newTransaction._id);
    await user.save();
    await incomeDetail.save();

    res.status(201).json({
      success: true,
      message: "Investment in Dollar Bank successful. Your amount is locked for 1 year with 15% profit.",
      data: {
        investmentId: bankId,
        investment: amountNumber,
        profit: profit,
        totalAmount: totalAmount,
        investmentDate: investmentDate,
        maturityDate: maturityDate,
        status: "Active",
        note: "You can withdraw this amount only after 1 year from investment date.",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dollar Bank Withdrawal API (only after 1 year)
exports.DollarBankWithdrawal = async (req, res) => {
  try {
    const { investmentId, walletAddress } = req.body;

    // Validate input
    if (!investmentId || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: "Investment ID and wallet address are required.",
      });
    }

    const { isAddress } = require("ethers");
    if (!isAddress(walletAddress)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Wallet Address.",
      });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist.",
      });
    }

    // Find Dollar Bank investment
    const dollarBankInvestment = await DollarBankModel.findOne({
      id: investmentId,
      user: user._id,
    });

    if (!dollarBankInvestment) {
      return res.status(404).json({
        success: false,
        message: "Dollar Bank investment not found.",
      });
    }

    // Check if already withdrawn
    if (dollarBankInvestment.status === "Withdrawn") {
      return res.status(400).json({
        success: false,
        message: "This investment has already been withdrawn.",
      });
    }

    // Check if matured (1 year completed)
    const currentDate = new Date();
    if (currentDate < dollarBankInvestment.maturityDate) {
      const daysRemaining = Math.ceil(
        (dollarBankInvestment.maturityDate - currentDate) / (1000 * 60 * 60 * 24)
      );
      return res.status(403).json({
        success: false,
        message: `Investment is still locked. You can withdraw after ${daysRemaining} days. Maturity date: ${dollarBankInvestment.maturityDate.toLocaleDateString()}`,
      });
    }

    // Get income details
    const incomeDetail = await IncomeModel.findById(user.incomeDetails);
    if (!incomeDetail) {
      return res.status(404).json({
        success: false,
        message: "Income details not found.",
      });
    }

    // Calculate gas fee (4% of total amount)
    const gasFeePercentage = 4;
    const gasFee = (dollarBankInvestment.totalAmount * gasFeePercentage) / 100;
    const netAmount = dollarBankInvestment.totalAmount - gasFee;

    // Generate transaction ID
    const transactionId = generateCustomId({ prefix: "BSG-TX", min: 10, max: 10 });

    // Create withdrawal transaction
    const withdrawalTransaction = new TransactionModel({
      id: transactionId,
      user: user._id,
      investment: dollarBankInvestment.totalAmount,
      gasFee: gasFee,
      netAmount: netAmount,
      clientAddress: walletAddress,
      mainAddress: process.env.WALLET_ADDRESS,
      role: "USER",
      type: "Withdrawal",
      status: "Processing",
    });

    // Update Dollar Bank investment status
    dollarBankInvestment.status = "Withdrawn";
    dollarBankInvestment.withdrawalDate = currentDate;

    // Add amount to current income (user will receive net amount after admin approval)
    // Note: We're adding totalAmount here, but actual transfer will be netAmount
    incomeDetail.income.currentIncome += dollarBankInvestment.totalAmount;
    incomeDetail.withdrawal.history.push(withdrawalTransaction._id);

    // Save everything
    await withdrawalTransaction.save();
    await dollarBankInvestment.save();
    await incomeDetail.save();
    user.transactions.push(withdrawalTransaction._id);
    await user.save();

    res.status(201).json({
      success: true,
      message: "Dollar Bank withdrawal request placed successfully. Settlement will be done within 24 hours.",
      data: {
        investmentId: investmentId,
        totalAmount: dollarBankInvestment.totalAmount,
        gasFee: gasFee,
        netAmount: netAmount,
        transactionId: withdrawalTransaction._id,
        note: "Admin will transfer net amount after approval.",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Dollar Bank Investments (User's investments)
exports.getDollarBankInvestments = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist.",
      });
    }

    const investments = await DollarBankModel.find({ user: user._id })
      .sort({ investmentDate: -1 })
      .populate("transaction", "id investment status createdAt");

    // Calculate totals
    const totalInvestment = investments.reduce(
      (sum, inv) => sum + (inv.investment || 0),
      0
    );
    const totalProfit = investments.reduce(
      (sum, inv) => sum + (inv.profit || 0),
      0
    );
    const totalAmount = investments.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    // Active investments
    const activeInvestments = investments.filter(
      (inv) => inv.status === "Active"
    );
    const activeTotal = activeInvestments.reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    // Matured but not withdrawn
    const currentDate = new Date();
    const maturedInvestments = investments.filter(
      (inv) =>
        inv.status === "Active" && currentDate >= inv.maturityDate
    );

    res.status(200).json({
      success: true,
      message: "Dollar Bank investments retrieved successfully.",
      data: {
        investments: investments,
        summary: {
          totalInvestments: investments.length,
          totalInvestment: totalInvestment,
          totalProfit: totalProfit,
          totalAmount: totalAmount,
          activeInvestments: activeInvestments.length,
          activeTotal: activeTotal,
          maturedInvestments: maturedInvestments.length,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Dollar Bank Investment Details
exports.getDollarBankInvestmentDetails = async (req, res) => {
  try {
    const { investmentId } = req.params;

    if (!investmentId) {
      return res.status(400).json({
        success: false,
        message: "Investment ID is required.",
      });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist.",
      });
    }

    const investment = await DollarBankModel.findOne({
      id: investmentId,
      user: user._id,
    }).populate("transaction", "id investment status createdAt");

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Dollar Bank investment not found.",
      });
    }

    // Calculate days remaining
    const currentDate = new Date();
    let daysRemaining = 0;
    let isMatured = false;

    if (investment.status === "Active") {
      if (currentDate >= investment.maturityDate) {
        isMatured = true;
        daysRemaining = 0;
      } else {
        daysRemaining = Math.ceil(
          (investment.maturityDate - currentDate) / (1000 * 60 * 60 * 24)
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "Dollar Bank investment details retrieved successfully.",
      data: {
        investment: investment,
        daysRemaining: daysRemaining,
        isMatured: isMatured,
        canWithdraw: isMatured && investment.status === "Active",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Transfer from Withdrawal Wallet to Dollar Bank
exports.TransferFromWithdrawalWalletToDollarBank = async (req, res) => {
  try {
    const { amount } = req.body;

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount is required and must be greater than 0.",
      });
    }

    const amountNumber = Number(amount);

    // Minimum investment validation
    if (amountNumber < 100) {
      return res.status(400).json({
        success: false,
        message: "Minimum investment amount is $100.",
      });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist.",
      });
    }

    // Get income details
    const incomeDetail = await IncomeModel.findById(user.incomeDetails);
    if (!incomeDetail) {
      return res.status(404).json({
        success: false,
        message: "Income details not found.",
      });
    }

    // Check withdrawal wallet balance (currentIncome)
    const withdrawalWalletBalance = incomeDetail.income.currentIncome;
    
    if (withdrawalWalletBalance < amountNumber) {
      return res.status(409).json({
        success: false,
        message: `Insufficient withdrawal wallet balance. Available balance: $${withdrawalWalletBalance.toFixed(2)}. Please try again with an amount within your available limit.`,
        availableBalance: withdrawalWalletBalance,
      });
    }

    // Check if capital is locked and calculate available balance
    let withdrawableAmount = withdrawalWalletBalance;
    if (user.active.isCapitalLocked) {
      const capitalAmount = user.investment || 0;
      withdrawableAmount = withdrawalWalletBalance - capitalAmount;
      if (withdrawableAmount < 0) withdrawableAmount = 0;
      
      if (withdrawableAmount < amountNumber) {
        return res.status(409).json({
          success: false,
          message: `Insufficient withdrawable balance. Your capital amount of $${capitalAmount.toFixed(2)} is locked. Available withdrawable balance: $${withdrawableAmount.toFixed(2)}.`,
          availableBalance: withdrawableAmount,
          lockedCapital: capitalAmount,
        });
      }
    }

    // Calculate profit (15% of investment)
    const profitPercentage = 15;
    const profit = (amountNumber * profitPercentage) / 100;
    const totalAmount = amountNumber + profit;

    // Calculate maturity date (1 year from now)
    const investmentDate = new Date();
    const maturityDate = new Date(investmentDate);
    maturityDate.setFullYear(maturityDate.getFullYear() + 1);

    // Generate transaction ID
    const transactionId = generateCustomId({ prefix: "BSG-TX", min: 10, max: 10 });
    
    // Create transaction record
    const newTransaction = new TransactionModel({
      id: transactionId,
      user: user._id,
      investment: amountNumber,
      clientAddress: user.account || "Dollar Bank Investment",
      mainAddress: process.env.WALLET_ADDRESS || "Dollar Bank",
      role: "USER",
      type: "Deposit",
      status: "Completed",
    });

    // Create Dollar Bank investment record
    const bankId = generateCustomId({ prefix: "DB", min: 10, max: 10 });
    const dollarBankInvestment = new DollarBankModel({
      id: bankId,
      user: user._id,
      investment: amountNumber,
      profit: profit,
      totalAmount: totalAmount,
      investmentDate: investmentDate,
      maturityDate: maturityDate,
      status: "Active",
      transaction: newTransaction._id,
    });

    // Deduct amount from withdrawal wallet (currentIncome)
    incomeDetail.income.currentIncome -= amountNumber;

    // Save everything
    await newTransaction.save();
    await dollarBankInvestment.save();
    user.transactions.push(newTransaction._id);
    await user.save();
    await incomeDetail.save();

    res.status(201).json({
      success: true,
      message: "Funds transferred from withdrawal wallet to Dollar Bank successfully. Your amount is locked for 1 year with 15% profit.",
      data: {
        investmentId: bankId,
        investment: amountNumber,
        profit: profit,
        totalAmount: totalAmount,
        investmentDate: investmentDate,
        maturityDate: maturityDate,
        status: "Active",
        source: "Withdrawal Wallet",
        remainingWithdrawalBalance: incomeDetail.income.currentIncome,
        note: "You can withdraw this amount only after 1 year from investment date.",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

