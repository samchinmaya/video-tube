import mongoose, { Schema } from "mongoose";
const subscriptionSchema = new Schema({
  subscriber: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  channel: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },



},{timestamps: true});

// a user can subscribe to a channel only once
subscriptionSchema.index({ subscriber: 1, channel: 1 }, { unique: true });

export default mongoose.model("Subscription", subscriptionSchema);
