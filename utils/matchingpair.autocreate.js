const { MatchingPairModel } = require("../models/matchingpair.model.js");
const { UserModel } = require("../models/user.model.js");
const { getDownlineArray } = require("./getteams.downline.js");

exports.MatchingPairAutoCreate = async () => {
    try {
        const users = await UserModel.find({}).populate('matchingPairs');
        for (const user of users) {
            const { left, right } = await getDownlineArray({userId:user._id});
            const matchingPairs = await MatchingPairModel.find({_id:user.matchingPairs}) || [];
            const maxLength = Math.max(left.length, right.length);
            let hasPairs = false;
            for (let i = 0; i < maxLength; i++) {
                if (left[i] && right[i]) {
                    const pair = new MatchingPairModel({
                        left: left[i]._id,
                        right: right[i]._id,
                        user: user._id,
                    });
                    const pairExists = matchingPairs.some(mp =>
                        mp.left &&
                        mp.right &&
                        mp.left.toString() === pair.left.toString() &&
                        mp.right.toString() === pair.right.toString()
                    );
                    if (!pairExists) {
                        await pair.save();
                        matchingPairs.push(pair._id);
                        hasPairs = true;
                    }
                }
            }
            
            user.matchingPairs = matchingPairs;
            await user.save();
            
            user.matchingPairs = matchingPairs;
            await user.save();
            if (!hasPairs) continue
        }
    } catch (error) {
        // console.log(error);
    }
}

