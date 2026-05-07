const { PlanModel } = require("../models/plan.model");
const { generateCustomId } = require("../utils/generator.uniqueid");

exports.PlanCreate = async (req, res) => {
    const { planType, title, duration, minAmount, maxAmount, dailyRoi, totalRoi, status } = req.body;
    if (!planType || !title || !duration || dailyRoi === undefined) {
        return res.status(400).json({ success: false, message: "Required fields missing." });
    }

    try {
        const id = generateCustomId({ prefix: "PLN", min: 7, max: 7 });
        const calculatedTotalRoi = Number(dailyRoi) * Number(duration);

        const newPlan = new PlanModel({
            id,
            planType,
            title,
            duration,
            minAmount,
            maxAmount,
            dailyRoi,
            totalRoi: calculatedTotalRoi,
            status
        });
        await newPlan.save();
        res.status(201).json({ success: true, message: 'Plan created successfully', data: newPlan });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.PlanUpdate = async (req, res) => {
    const { id } = req.params;
    const { planType, title, duration, minAmount, maxAmount, dailyRoi, totalRoi, status } = req.body;
    try {
        let plan = await PlanModel.findOne({ id: id });
        if (!plan) {
            plan = await PlanModel.findById(id);
        }
        if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });

        if (planType !== undefined) plan.planType = planType;
        if (title !== undefined) plan.title = title;
        if (duration !== undefined) plan.duration = Number(duration);
        if (minAmount !== undefined) plan.minAmount = Number(minAmount);
        if (maxAmount !== undefined) plan.maxAmount = Number(maxAmount);
        if (dailyRoi !== undefined) plan.dailyRoi = Number(dailyRoi);
        if (status !== undefined) plan.status = status;

        // Auto calculate totalRoi on update
        plan.totalRoi = Number(plan.dailyRoi) * Number(plan.duration);

        await plan.save();
        return res.status(200).json({ success: true, message: 'Plan updated successfully', data: plan });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.PlanDelete = async (req, res) => {
    const { id } = req.params;
    try {
        let deletedPlan = await PlanModel.findOneAndDelete({ id: id });
        if (!deletedPlan) {
            deletedPlan = await PlanModel.findByIdAndDelete(id);
        }
        if (!deletedPlan) return res.status(404).json({ success: false, message: 'Plan not found' });
        res.status(200).json({ success: true, message: 'Plan deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.PlansAdminReports = async (req, res) => {
    try {
        const plans = await PlanModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Plans retrieved successfully.", data: plans });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.PlansClientReports = async (req, res) => {
    try {
        // console.log("🔍 Fetching active plans for client...");
        const plans = await PlanModel.find({ status: true }).sort({ minAmount: 1 });
        // console.log(`✅ Found ${plans.length} active plans.`);
        res.status(200).json({
            success: true,
            message: 'Plans retrieved successfully.',
            data: plans
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
