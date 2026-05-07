const { PackageModel, PackageInvestment } = require("../models/package.model");
const { UserModel } = require("../models/user.model");
const { generateCustomId } = require("../utils/generator.uniqueid");
const { uploadToImageKit } = require("../utils/upload.imagekit");

exports.PackageCreate = async (req, res) => {
    const { title, minAmount, maxAmount, tags, picture, percentage, status } = req.body;
    if (!minAmount || !maxAmount || !title || !percentage) return res.status(500).json({ success: false, message: "All fields required." })
    const packageFind = await PackageModel.findOne({ title });
    if (packageFind) return res.status(500).json({ success: false, message: "Allready Package Created." });
    try {
        const id = generateCustomId({ prefix: "BT7", min: 7, max: 7 });
        const pictureUrl = await uploadToImageKit(picture, 'Packages')
        const newPackage = new PackageModel({ id, title, minAmount, maxAmount, tags, picture: pictureUrl, percentage, status });
        await newPackage.save();
        res.status(201).json({ success: true, message: 'Package created successfully', data: newPackage });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.PackageUpdate = async (req, res) => {
    const { id } = req.params;
    const { title, minAmount, maxAmount, picture, tags, percentage, status, perDayRoi } = req.body;
    try {
        // Try to find by custom id field first, if not found try MongoDB _id
        let package = await PackageModel.findOne({ id: id });
        if (!package) {
            // Fallback to MongoDB _id in case someone passes _id
            package = await PackageModel.findById(id);
        }
        if (!package) return res.status(404).json({ success: false, message: 'Package not found' });

        // Update picture only if it's different
        if (picture && package.picture !== picture) {
            package.picture = await uploadToImageKit(picture, 'Packages');
        }

        // Update fields only if provided
        if (title !== undefined) package.title = title;
        if (minAmount !== undefined) package.minAmount = minAmount;
        if (maxAmount !== undefined) package.maxAmount = maxAmount;
        if (tags !== undefined) package.tags = tags;
        if (percentage !== undefined) package.percentage = percentage;
        if (status !== undefined) package.status = status;
        if (perDayRoi !== undefined) package.perDayRoi = perDayRoi;

        await package.save();
        return res.status(200).json({ success: true, message: 'Package updated successfully', data: package });
    } catch (error) {
        // console.log(error.message)
        return res.status(500).json({ success: false, message: error.message });
    }
}

exports.PackageDelete = async (req, res) => {
    const { id } = req.params;
    try {
        // Try to find by custom id field first, if not found try MongoDB _id
        let deletedPackage = await PackageModel.findOneAndDelete({ id: id });
        if (!deletedPackage) {
            // Fallback to MongoDB _id in case someone passes _id
            deletedPackage = await PackageModel.findByIdAndDelete(id);
        }
        if (!deletedPackage) return res.status(404).json({ success: false, message: 'Package not found' });
        res.status(200).json({ success: true, message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.PackageStatusUpdate = async (req, res) => {
    const { id } = req.params;
    try {
        // Try to find by custom id field first, if not found try MongoDB _id
        let updatedPackage = await PackageModel.findOne({ id: id });
        if (!updatedPackage) {
            // Fallback to MongoDB _id in case someone passes _id
            updatedPackage = await PackageModel.findById(id);
        }
        if (!updatedPackage) return res.status(404).json({ success: false, message: 'Package not found' });
        updatedPackage.status = !updatedPackage.status;
        await updatedPackage.save();
        const message = updatedPackage.status ? 'Package activated successfully' : 'Package deactivated successfully';
        res.status(200).json({ success: true, message });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.PackagesAdminReports = async (req, res) => {
    try {
        const packages = await PackageModel.find();
        res.status(200).json({ success: true, message: "Package Admin Finds Successfully.", data: packages });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

exports.PackagesClientReports = async (req, res) => {
    try {
        const packages = await PackageModel.find({ status: true }).sort({ amount: 1 });
        const user = await UserModel.findById(req.user._id);
        const newPackages = await Promise.all(
            packages.map(async (p) => {
                const isActive = p.users.includes(user._id) ? true : false;
                return {
                    ...p._doc,
                    isActive,
                    users: null,
                };
            })
        );

        res.status(200).json({
            success: true,
            message: 'Package client report generated successfully.',
            data: newPackages
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.PackagesAllReports = async (req, res) => {
    try {
        const packages = await PackageModel.find({ status: true }, { users: 0, _id: 0 }).sort({ amount: 1 });
        res.status(200).json({
            success: true,
            message: 'Packages generated successfully.',
            data: packages
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPackageBuyers = async (req, res) => {
    try {
        const { packageId } = req.query; // Get packageId from query params

        if (!packageId) {
            return res.status(400).json({
                success: false,
                message: "Package ID is required. Use ?packageId=<package_id>"
            });
        }

        // Try to find by custom id field first, if not found try MongoDB _id
        let packageData = await PackageModel.findOne({ id: packageId })
            .populate({
                path: 'users',
                select: 'id username email mobile account investment active createdAt',
                options: { sort: { createdAt: -1 } }
            });

        if (!packageData) {
            // Fallback to MongoDB _id in case someone passes _id
            packageData = await PackageModel.findById(packageId)
                .populate({
                    path: 'users',
                    select: 'id username email mobile account investment active createdAt',
                    options: { sort: { createdAt: -1 } }
                });
        }

        if (!packageData) {
            return res.status(404).json({
                success: false,
                message: 'Package not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Package buyers retrieved successfully',
            data: {
                package: {
                    id: packageData.id,
                    title: packageData.title,
                    minAmount: packageData.minAmount,
                    maxAmount: packageData.maxAmount,
                    percentage: packageData.percentage,
                    status: packageData.status
                },
                totalBuyers: packageData.users.length,
                buyers: packageData.users
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};