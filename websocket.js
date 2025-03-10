const WebSocket = require("ws");

// Use the same port as the main app
const PORT = process.env.PORT || 5001;
const wss = new WebSocket.Server({ port: PORT });

console.log(`[INFO] WebSocket Server Running on ws://localhost:${PORT}`);
wss.on("connection", (ws) => {
  console.log("[SUCCESS] WebSocket Client Connected ✅");

  ws.send("Connected to WebSocket Server ✅");

  ws.on("message", async (message) => {
    console.log(`[INFO] Received Message from Client: ${message}`);
    
    const responseMessage = `Server received: ${message}`;
    ws.send(responseMessage);
    
    console.log(`[INFO] Sent Message to Client: ${responseMessage}`);
  });

  ws.on("close", () => {
    console.log("[INFO] WebSocket Client Disconnected ❌");
  });

  ws.on("error", (err) => {
    console.log(`[ERROR] WebSocket Error: ${err.message}`);
  });
});
