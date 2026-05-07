const express = require("express");
const router = express.Router();
const { UserModel } = require("../models/user.model");

// Add dummy investment
router.post("/add-dummy-investment", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ message: "UserId and amount required" });
    }

    const user = await UserModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.investment += Number(amount);
    await user.save();

    return res.status(200).json({ message: "Dummy investment added", user });
  } catch (err) {
    // console.log(err);
    res.status(500).json({ error: err.message });
  }
});



router.post("/reset-roi", async (req, res) => {
  const { userId } = req.body;
  
  const user = await UserModel.findById(userId);
  if (!user) return res.json({ message: "User not found" });

  user.todayRoiCollected = false;
  await user.save();

  return res.json({ message: "ROI reset done" });
});


module.exports = router;
