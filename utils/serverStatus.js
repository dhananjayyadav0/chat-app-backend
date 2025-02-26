export const getServerStatusMessage = () => ({
  message: "Server is up and running!",
  status: "OK",
  environment: process.env.NODE_ENV || "development",
  version: "1.0.0",
  description: "Welcome to the socket server",
});
