const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 5001 });

console.log("[INFO] WebSocket Server Running on ws://192.168.167.26:5001");

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
