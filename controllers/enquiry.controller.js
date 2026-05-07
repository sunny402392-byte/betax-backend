const { EnquiryModel } = require("../models/enquiry.model");
const { generateCustomId } = require("../utils/generator.uniqueid");

exports.EnquiryCreate = async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;
        if (!name || !email || !message) return res.status(400).json({ success: false, message: "Name, Email, and Message are required fields."});
        const id = generateCustomId({ prefix: "ENQ", max: 15, min: 15 });
        const newEnquiry = new EnquiryModel({ id, name, email,phone, message, status: "Processing"});
        await newEnquiry.save();
        res.status(201).json({success: true, message: "Enquiry submitted successfully.", data: newEnquiry});
    } catch (error) {
        console.error("❌ Error submitting enquiry:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.EnquiryAdminReports = async (req, res) => {
    try {
        const enquiries = await EnquiryModel.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, message: "Enquiry list retrieved", data: enquiries });
    } catch (error) {
        console.error("Error retrieving enquiries:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

exports.EnquiryRespond = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!id || !status || !["Accepted", "Rejected"].includes(status)) return res.status(400).json({ success: false, message: "Invalid input" });
        const enquiry = await EnquiryModel.findById(id);
        if (!enquiry) return res.status(404).json({ success: false, message: "Enquiry not found" });
        enquiry.status = status;
        enquiry.responseDate = new Date();
        await enquiry.save();
        res.status(200).json({ success: true, message: `Enquiry ${status.toLowerCase()}ed`, data: enquiry });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
