const { CommissionIncome } = require("../models/commission.model");
const { IncomeModel } = require("../models/income.model");
const { RewardModel } = require("../models/reward.model");

exports.RewardRequest = async (req,res)=>{
    try {
        const {id} = req.params;
        if(!id) return res.status(500).json({success:false,message:"ID & status are required."});
        const reward = await CommissionIncome.findOne({reward:id,user:req.user._id});
        if(!reward) return res.status(500).json({success:false,message:"Reward not found."});
        reward.rewardPaid = 'Processing';
        await reward.save();
        return res.status(200).json({success:true,data:reward,message:"Reward Commission required."});
    } catch (error) {
        // console.log(error);
        res.status(500).json({success:false,message:error.message})
    }
};
exports.RewardRequestHistory = async (req,res)=>{
    try {
        const history = await CommissionIncome.find({rewardPaid:"Processing"}).populate({path:"reward",select:'-users'});
        return res.status(200).json({success:true,data:history,message:"Reward Commission finds."});
    } catch (error) {
        // console.log(error);
        res.status(500).json({success:false,message:error.message})
    }
};

exports.RewardRequestAllHistory = async (req,res)=>{
    try {
        const history = await CommissionIncome.find({rewardPaid: { $nin: ['Processing', 'Pending', 'Not Applied'] },type:"Rank Reward"}).populate({path:"reward",select:'-users'});
        return res.status(200).json({success:true,data:history,message:"Reward Commission finds."});
    } catch (error) {
        // console.log(error);
        res.status(500).json({success:false,message:error.message})
    }
};

exports.RewardRequestAccepted = async (req,res)=>{
    try {
        const {status,amount} = req.body;
        const {id} = req.params;
        if(!status || !id) return res.status(500).json({success:false,message:"ID & status are required."});
        const reward = await CommissionIncome.findById(id);
        if(!reward) return res.status(500).json({success:false,message:"Reward not found."});
        const incomeDetails = await IncomeModel.findOne({user:reward.user});
        if(!incomeDetails) return res.status(500).json({success:false,message:"Income Details not found."});
        if((status == 'Completed') && amount){
            incomeDetails.rankRewardIncome.income += amount;
            incomeDetails.income.totalIncome += amount;
            incomeDetails.income.currentIncome += amount;
            reward.income += amount;
        }
        reward.rewardPaid = status;
        await incomeDetails.save();
        await reward.save();
        return res.status(200).json({success:true,data:reward,message:"Reward Commission accepted."});
    } catch (error) {
        // console.log(error);
        res.status(500).json({success:false,message:error.message})
    }
}