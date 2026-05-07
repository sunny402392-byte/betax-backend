const { NotificationModel } = require("../models/notification.model");

//------------------------- SURVEY QUESTIONS START -------------------------------
exports.createNotification = async (req, res) => {
    try {
        const { questions } = req.body;
        if (!questions) return res.status(400).json({ success: false, message: "Question is required." });
        questions.forEach(async (survey) => {
            const newNotification = new NotificationModel({ question: survey });
            await newNotification.save();
        })
        return res.status(201).json({
            success: true,
            message: "Notification created successfully.",
        });
    } catch (error) {
        // console.log(error);
        return res.status(500).json({ success: false, message: error.message || 'Server error' });

    }
}

exports.updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { question, status } = req.body;
        const updatedNotification = await NotificationModel.findByIdAndUpdate(id, { question, status }, { new: true });
        if (!updatedNotification) return res.status(404).json({ success: false, message: 'Notification not found' });
        return res.status(200).json({ success: true, message: "Notification updated successfully.", data: updatedNotification });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });

    }
}

exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedNotification = await NotificationModel.findByIdAndDelete(id);
        if (!deletedNotification) return res.status(404).json({ success: false, message: 'Notification not found' });
        return res.status(200).json({ success: true, message: "Notification deleted successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });

    }
}

exports.toggleNotificationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const newCommitiontification = await NotificationModel.findById(id);
        if (!newCommitiontification) return res.status(404).json({ success: false, message: 'Notification not found' });
        newCommitiontification.status = !newCommitiontification.status; // Toggle status
        await newCommitiontification.save();
        return res.status(200).json({
            success: true,
            message: "Notification status updated successfully.",
            data: newCommitiontification,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });

    }
}
exports.getNotificationAdminHistory = async (req, res) => {
    try {
        const notifications = await NotificationModel.find();
        return res.status(200).json({
            success: true,
            message: "Notifications history retrieved.",
            data: notifications,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });

    }
}

exports.getNotificationQuestionsHistory = async (req, res) => {
    try {
        const notifications = await NotificationModel.find({ status: true });
        return res.status(200).json({
            success: true,
            message: "Survey questions retrieved successfully.",
            dataLength: notifications.length,
            data: notifications,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Server error' });

    }
}