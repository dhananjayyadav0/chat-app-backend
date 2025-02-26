import mongoose from "mongoose";
import User from "../../models/user.js";
import { sendResponse } from "../../utils/responseHandler.js";
import Message from "../../models/message.js";

class ChatroomController {
  // Get conversation between current user and another user
  //   GET /api/chat/conversation
  async getConversation(req, res) {
    try {
      const senderId = req.user.id;
      const { receiverId } = req.query;

      if (!receiverId) {
        return res.status(400).json({ message: "Receiver ID is required" });
      }

      // Find conversation between the two users
      const conversation = await Message.findOne({
        senderId: { $in: [senderId, receiverId] },
        receiverId: { $in: [senderId, receiverId] },
      });

      if (!conversation) {
        return res.json({ discussions: [] });
      }

      // Return discussions array
      return res.json({ discussions: conversation.discussions });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  // GET /api/chat/all-users
  async getAllUsers(req, res) {
    try {
      const users = await User.find({ _id: { $ne: req.user?.id } }).select(
        "-password"
      ); // Exclude logged-in user
      sendResponse(res, 200, true, "Users retrieved successfully", users);
    } catch (error) {
      console.error("Error fetching users:", error);
      sendResponse(res, 500, false, "Internal server error");
    }
  }
}

export default new ChatroomController();
