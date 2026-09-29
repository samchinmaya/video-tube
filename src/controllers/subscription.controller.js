import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";

// subscribe if not subscribed yet, unsubscribe if already subscribed
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params
  if (!mongoose.isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id")
  }
  if (channelId === req.user._id.toString()) {
    throw new ApiError(400, "You cannot subscribe to your own channel")
  }
  const channel = await User.findById(channelId)
  if (!channel) {
    throw new ApiError(404, "Channel not found")
  }

  // already subscribed -> remove the subscription
  const removed = await Subscription.findOneAndDelete({ subscriber: req.user._id, channel: channelId })
  if (removed) {
    return res.status(200).json(new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully"))
  }

  // not subscribed -> save both ids
  try {
    await Subscription.create({ subscriber: req.user._id, channel: channelId })
  } catch (err) {
    // duplicate key: a parallel request already subscribed, so the end state is the same
    if (err.code !== 11000) throw err
  }
  return res.status(200).json(new ApiResponse(200, { subscribed: true }, "Subscribed successfully"))
})

export { toggleSubscription }
