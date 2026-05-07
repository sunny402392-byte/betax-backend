const { CommissionIncome } = require("../models/commission.model");
const mongoose = require("mongoose");
const { IncomeModel } = require("../models/income.model");
const { PackageModel } = require("../models/package.model");
const { TransactionModel } = require("../models/transaction.model");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { levelIncomeCalculate } = require("../utils/levelIncome.calculation");
const { sendToOtp } = require("../utils/sendtootp.nodemailer");
const { ethers } = require("ethers");
const { isAddress } = require("ethers");
exports.Fundadd = async (req, res) => {
  try {
    const { amount, packageId, username } = req.body;
    if (!amount || amount <= 0 || !username)
      return res
        .status(500)
        .json({ success: false, message: "Amount, UserId are required." });
    
    // Minimum deposit validation
    const amountNumber = Number(amount);
    if (amountNumber < 100)
      return res
        .status(400)
        .json({ success: false, message: "Minimum deposit amount is $100." });
    
    const user = await UserModel.findOne({
      $or: [{ username }, { id: username }, { account: username }],
    });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    const id = generateCustomId({ prefix: "BSG-TX", max: 14, min: 14 });
    // const packageFind = await PackageModel.findOne({id:packageId});
    // if(!packageFind) return res.status(500).json({success:false,message:"Package not exist."});
    const newTransaction = new TransactionModel({
      id,
      user: user._id,
      investment: amount,
      hash: user.account,
      clientAddress: user.account,
      mainAddress: "Admin Deposit",
      role: "ADMIN",
      type: "Deposit",
      status: "Completed",
    });
    user.transactions.push(newTransaction._id);
    // user.packages.push(packageFind._id);
    user.investment += Number(amount);
    // Automatically lock capital amount when investment is made
    user.active.isCapitalLocked = true;
    // packageFind.users.push(user._id);
    // await packageFind.save();
    if (!user.active.isActive) {
      user.active.isActive = true;
      user.active.activeDate = new Date();
    }
    await newTransaction.save();
    if (user.sponsor) {
      // const sponsor = await IncomeModel.findOne({user:user.sponsor}).populate({ path: 'referralIncome.history', select: 'fromUser user' });
      // if (sponsor) {
      //     const alreadyReceived = sponsor.referralIncome.history.some( ref => ref.fromUser.toString() === user._id.toString());
      //     if (!alreadyReceived) {
      //         const refIncome = (amount * 5) / 100;
      //         const id = generateCustomId({prefix:'BSG-REF',max:14,min:14});
      //         const newReferral = new CommissionIncome({id, amount: amount, income: refIncome, user: sponsor.user, fromUser: user._id, percentage: 5,type:"Referral Income", status: "Completed" });
      //         sponsor.income.currentIncome += refIncome;
      //         sponsor.income.totalIncome += refIncome;
      //         sponsor.referralIncome.income += refIncome;
      //         sponsor.referralIncome.history.push(newReferral._id);
      //         await newReferral.save();
      //         await sponsor.save();
      //     }
      // }
      // Level income on investment amount
      await levelIncomeCalculate({
        userId: user._id,
        amount: Number(amount),
        levelActive: true,
      });
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: "Package added successfully",
      data: user,
    });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.Fundget = async (req, res) => {
  try {
    const transactions = await TransactionModel.find({
      type: "Deposit",
      role: "admin",
      mainAddress: "Admin Deposit",
      status: "Completed",
    }).populate({ path: "user", select: "username account" });
  } catch (error) {
    // console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const USDT_CONTRACT = process.env.USDT_CONTRACT_ADDRESS; // required
const DEFAULT_TOKEN_DECIMALS = Number(process.env.TOKEN_DECIMALS || 18);
const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);

// minimal ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

// helper to generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.createOnchainPaymentIntent = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverAccount, amount } = req.body;
    // console.log(receiverAccount, amount);

    if (!receiverAccount || !amount) {
      return res.status(400).json({
        success: false,
        message: "receiverAccount and amount required",
      });
    }
    if (!isAddress(receiverAccount)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid receiver address" });
    }
    if (!USDT_CONTRACT || !ethers.isAddress(USDT_CONTRACT)) {
      return res.status(500).json({
        success: false,
        message: "USDT contract address not configured on server",
      });
    }

    const sender = await UserModel.findById(senderId);
    if (!sender)
      return res
        .status(404)
        .json({ success: false, message: "Sender not found" });
    if (!sender.account)
      return res.status(400).json({
        success: false,
        message: "Sender has no wallet address on file",
      });

    // ensure sender.account matches logged in wallet, optional:
    const expectedFrom = sender.account.toLowerCase();
    // generate OTP and expiry
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    const localTx = new TransactionModel({
      id: `ONCHAIN-USDT-${Date.now()}`,
      user: sender._id,
      investment: amount, // reusing field for amount
      type: "Onchain USDT OTP Pending",
      status: "PendingOTP",
      clientAddress: sender.account,
      mainAddress: receiverAccount,
      metadata: { token: "USDT" },
      otp,
      otpExpiry,
    });

    await localTx.save();

    // console.log(otp, "otp");

    // send OTP using your util
    await sendToOtp({
      otp,
      user: sender,
      subject: "USDT On-Chain Payment OTP",
    });

    return res.status(200).json({
      success: true,
      message:
        "OTP sent to your email. Verify to prepare the USDT transfer transaction.",
      data: {
        localTxId: localTx._id,
        receiverAccount,
        amount,
        tokenContract: USDT_CONTRACT,
        requiredFrom: expectedFrom,
      },
    });
  } catch (err) {
    console.error("createOnchainPaymentIntent:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyOtpAndPrepareUSDTTransfer = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { localTxId, otp } = req.body;

    if (!localTxId || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "localTxId and otp required" });
    }

    const localTx = await TransactionModel.findById(localTxId);
    if (!localTx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    if (String(localTx.user) !== String(senderId)) {
      return res.status(403).json({
        success: false,
        message: "Not allowed to prepare this transaction",
      });
    }

    if (localTx.status !== "PendingOTP") {
      return res.status(400).json({
        success: false,
        message: "Transaction not in OTP pending state",
      });
    }

    if (localTx.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (Date.now() > localTx.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    // All good => prepare ERC20 transfer calldata
    const sender = await UserModel.findById(senderId);
    if (!sender)
      return res
        .status(404)
        .json({ success: false, message: "Sender not found" });

    const fromAddress = (sender.account || "").toLowerCase();
    const toAddress = (localTx.mainAddress || "").toLowerCase();

    // instantiate contract
    const tokenContract = new ethers.Contract(
      USDT_CONTRACT,
      ERC20_ABI,
      provider
    );

    // token decimals
    let decimals = DEFAULT_TOKEN_DECIMALS;
    try {
      const d = await tokenContract.decimals();
      decimals = Number(d);
    } catch (e) {
      console.warn(
        "Could not fetch token decimals, using fallback:",
        DEFAULT_TOKEN_DECIMALS
      );
    }

    // parse amount into token smallest unit
    const amountHuman = String(localTx.investment);
    let amountUnits;
    try {
      amountUnits = ethers.parseUnits(amountHuman, decimals);
    } catch (errParse) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount format" });
    }

    // check on-chain token balance
    let onchainBalance = BigInt(0);
    try {
      onchainBalance = await tokenContract.balanceOf(fromAddress);
    } catch (errBalance) {
      console.warn(
        "Could not fetch on-chain balance:",
        errBalance.message || errBalance
      );
    }

    if (onchainBalance < amountUnits) {
      return res.status(400).json({
        success: false,
        message: "Insufficient on-chain USDT balance in your wallet",
      });
    }

    // encode transfer calldata
    const iface = new ethers.Interface(ERC20_ABI);
    const data = iface.encodeFunctionData("transfer", [toAddress, amountUnits]);

    // estimate gas
    let gasLimit;
    try {
      const estimate = await provider.estimateGas({
        from: fromAddress,
        to: USDT_CONTRACT,
        data,
      });
      gasLimit = (estimate * BigInt(12)) / BigInt(10); // add 20%
    } catch (errGas) {
      console.warn(
        "Gas estimate failed, using fallback:",
        errGas.message || errGas
      );
      gasLimit = BigInt(300000); // fallback
    }

    // update transaction state
    localTx.status = "ReadyForSigning";
    localTx.type = "Onchain USDT ReadyForSigning";
    localTx.otp = undefined;
    localTx.otpExpiry = undefined;
    await localTx.save();

    return res.status(200).json({
      success: true,
      message:
        "OTP verified. Use returned payload to sign & send the USDT transfer via MetaMask.",
      data: {
        to: USDT_CONTRACT,
        value: "0x0",
        data,
        gasLimit: gasLimit.toString(),
        tokenDecimals: decimals,
        amountHuman,
        localTxId: localTx._id,
      },
    });
  } catch (err) {
    console.error("verifyOtpAndPrepareUSDTTransfer:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const { Interface, getAddress, parseUnits } = ethers;
exports.verifyOnchainPayment = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { txHash, localTxId } = req.body;

    if (!txHash || !localTxId) {
      return res.status(400).json({
        success: false,
        message: "txHash and localTxId are required",
      });
    }

    // Fetch the local transaction
    const localTx = await TransactionModel.findById(localTxId);
    if (!localTx) {
      return res.status(404).json({
        success: false,
        message: "Local transaction not found",
      });
    }

    if (localTx.status !== "ReadyForSigning") {
      return res.status(400).json({
        success: false,
        message: "Transaction not ready for on-chain verification",
      });
    }

    // Fetch on-chain transaction
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found on-chain",
      });
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: "Transaction receipt not available yet",
      });
    }

    const from = tx.from?.toLowerCase();
    const to = (tx.to || "").toLowerCase();
    const expectedFrom = (localTx.clientAddress || "").toLowerCase();
    const expectedTo = (localTx.mainAddress || "").toLowerCase();
    const usdtContract = (
      process.env.USDT_CONTRACT_ADDRESS || ""
    ).toLowerCase();
    const tokenDecimals = Number(process.env.TOKEN_DECIMALS || 6);

    // Decode ERC20 transfer data
    const ERC20_ABI = [
      "function transfer(address to, uint256 amount) returns (bool)",
    ];
    const iface = new Interface(ERC20_ABI);

    let decodedAmount = null;
    let recipient = null;

    try {
      const decoded = iface.decodeFunctionData("transfer", tx.data);
      recipient = decoded[0]?.toLowerCase();
      decodedAmount = decoded[1]; // bigint
    } catch (err) {
      console.warn("Could not decode transaction data:", err);
      return res.status(400).json({
        success: false,
        message: "Transaction data could not be decoded",
      });
    }

    const expectedAmountWei = parseUnits(
      Number(localTx.investment).toFixed(tokenDecimals),
      tokenDecimals
    );

    console.log({
      decodedAmount: decodedAmount.toString(),
      expectedAmountWei: expectedAmountWei.toString(),
    });

    // Validate sender
    if (from !== expectedFrom) {
      return res.status(400).json({
        success: false,
        message: "Sender address mismatch",
      });
    }

    // Validate that contract is USDT
    if (to !== usdtContract) {
      return res.status(400).json({
        success: false,
        message: "Transaction recipient is not the USDT contract",
      });
    }

    // Validate recipient inside transfer data
    if (recipient !== expectedTo) {
      return res.status(400).json({
        success: false,
        message: "Decoded recipient address mismatch",
      });
    }

    // Validate amount using BigInt comparison
    if (BigInt(decodedAmount) !== BigInt(expectedAmountWei)) {
      return res.status(400).json({
        success: false,
        message: "Transaction amount does not match expected amount",
      });
    }

    // Validate transaction was successful on-chain
    if (receipt.status !== 1) {
      return res.status(400).json({
        success: false,
        message: "Transaction failed on-chain",
      });
    }

    // ✅ All checks passed, commit DB updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Mark transaction as completed
      localTx.status = "Completed";
      localTx.type = "Transfer";
      localTx.hash = txHash; // Using 'hash' field as per schema
      await localTx.save({ session });

      // Optional: update sender/receiver USDT balances
      const sender = await UserModel.findById(senderId).session(session);
      if (!sender) throw new Error("Sender not found");

      const receiver = await UserModel.findOne({ account: expectedTo }).session(
        session
      );

      const amountHuman = Number(localTx.investment);

      if (
        typeof sender.usdtBalance === "number" &&
        sender.usdtBalance >= amountHuman
      ) {
        sender.usdtBalance -= amountHuman;
        await sender.save({ session });

        if (receiver) {
          receiver.usdtBalance = (receiver.usdtBalance || 0) + amountHuman;
          await receiver.save({ session });
        }
      }

      await session.commitTransaction();
    } catch (errInner) {
      await session.abortTransaction();
      throw errInner;
    } finally {
      session.endSession();
    }

    return res.status(200).json({
      success: true,
      message: "USDT on-chain transfer verified and recorded successfully",
      txHash,
    });
  } catch (err) {
    console.error("verifyOnchainPayment error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

exports.userTransferHistory = async (req, res) => {
  try {
    // ✅ Current logged in user
    const userId = req.user._id;

    // ✅ Transactions find (sent + received)
    const transactions = await TransactionModel.find({
      user: userId,
      type: { $in: ["Wallet Transfer Sent", "Wallet Transfer Received"] },
    })
      .populate("user", "username account") // user info
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "User fund transfer history fetched successfully",
      data: transactions,
    });
  } catch (error) {
    console.error("❌ Fund history error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
