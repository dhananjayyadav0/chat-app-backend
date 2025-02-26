import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    discussions: [
      {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        message: {
          type: String,
          required: true,
        },
        read: { type: Boolean, default: false },
        readAt: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// **this is for Unique Conversation Between Two Users**
messageSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

const Message = mongoose.model("Message", messageSchema);
export default Message;
