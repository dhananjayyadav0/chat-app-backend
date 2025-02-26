import jwt from "jsonwebtoken";
import Message from "../models/message.js";

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map(); // Track online users by userId
    this.typingUsers = new Map(); // Track typing status by userId
  }

  /**
   * Initializes the socket connection
   */
  initialize() {
    this.io.on("connection", (socket) => {
      const userId = socket.user?.id;

      // Add user to online users
      if (userId) {
        this.onlineUsers.set(userId, socket.id);
        // then emit user's online status to all connected clients
        this.io.emit("userStatus", { userId, status: "online" });
      }

      socket.on("joinChatroom", (chatroomId) => {
        console.log(`🟢 User ${userId} joined chatroom: ${chatroomId}`);
        this.joinChatroom(socket, chatroomId);
      });

      socket.on("sendMessage", (data) => {
        this.sendMessage(socket, data);

        // Clear typing status when user sends message
        if (data.receiverId) {
          this.handleTypingStatus(socket, {
            receiverId: data.receiverId,
            isTyping: false,
          });
        }
      });

      socket.on("typing", (data) => {
        this.handleTypingStatus(socket, data);
      });

      socket.on("disconnect", () => {
        console.log(`User disconnected: ${userId}`);
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Handles user joining a chatroom
   */
  joinChatroom(socket, chatroomId) {
    socket.join(chatroomId);

    // Immediately inform the joining user about the online status of the other participant
    const [user1, user2] = chatroomId.split("_");
    const otherUserId = socket.user?.id === user1 ? user2 : user1;

    const isOnline = this.onlineUsers.has(otherUserId);
    socket.emit("userStatus", {
      userId: otherUserId,
      status: isOnline ? "online" : "offline",
    });
  }

  /**
   * Handles message sending
   */
  async sendMessage(socket, data) {
    try {
      console.log(`Processing message from ${socket.user?.id}`, data);

      const { text, receiverId } = data;
      const senderId = socket.user?.id;

      if (!text || !receiverId) {
        console.error("Invalid message data", data);
        return socket.emit("messageError", { error: "Invalid message data" });
      }

      // Generate a unique chatroom ID
      const chatroomId =
        senderId < receiverId
          ? `${senderId}_${receiverId}`
          : `${receiverId}_${senderId}`;

      console.log(`Searching for existing conversation: ${chatroomId}`);

      let conversation = await Message.findOne({
        senderId: { $in: [senderId, receiverId] },
        receiverId: { $in: [senderId, receiverId] },
      });

      if (!conversation) {
        console.log("No conversation found, creating new one.");
        conversation = new Message({
          senderId,
          receiverId,
          discussions: [],
        });
      } else {
        console.log("Existing conversation found.");
      }

      // Append new message to discussions
      const newMessage = {
        senderId,
        message: text,
        read: false,
        createdAt: new Date(),
      };

      conversation.discussions.push(newMessage);
      await conversation.save();

      console.log("Message saved successfully:", newMessage);

      // Emit the new message to both users
      console.log(`Emitting message to chatroom: ${chatroomId}`);
      this.io.to(chatroomId).emit("message", {
        senderId,
        receiverId,
        text,
        createdAt: new Date(),
      });

      console.log(
        `Message sent successfully from ${senderId} to ${receiverId}`
      );
    } catch (error) {
      console.error("Error processing message:", error);
      socket.emit("messageError", { error: "Failed to send message" });
    }
  }

  /**
   * Handles typing status changes
   */
  handleTypingStatus(socket, data) {
    const { receiverId, isTyping } = data;
    const senderId = socket.user?.id;

    if (!receiverId || typeof isTyping !== "boolean") {
      return console.error("nvalid typing data", data);
    }

    // Generate chatroom ID
    const chatroomId =
      senderId < receiverId
        ? `${senderId}_${receiverId}`
        : `${receiverId}_${senderId}`;

    // Update typing status in memory
    const typingKey = `${senderId}_${receiverId}`;
    if (isTyping) {
      this.typingUsers.set(typingKey, true);
    } else {
      this.typingUsers.delete(typingKey);
    }

    // Broadcast typing status to the chatroom
    this.io.to(chatroomId).emit("typingStatus", {
      userId: senderId,
      isTyping,
    });
  }

  /**
   * Handles user disconnect
   */
  handleDisconnect(socket) {
    const userId = socket.user?.id;
    console.log(`User disconnected: ${userId}`);

    if (userId) {
      // Remove user from online users
      this.onlineUsers.delete(userId);

      // Clear all typing statuses for this user
      for (const [key, _] of this.typingUsers) {
        if (key.startsWith(`${userId}_`)) {
          this.typingUsers.delete(key);
        }
      }

      // Broadcast offline status to all clients
      this.io.emit("userStatus", {
        userId,
        status: "offline",
      });
    }
  }

  /**
   * Socket.IO authentication middleware
   */
  static async socketAuthMiddleware(socket, next) {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      socket.user = decoded;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication error"));
    }
  }
}

export default SocketHandler;
