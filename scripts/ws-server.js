// Simple WebSocket server that integrates with Redis pub/sub
// Usage: node scripts/ws-server.js
import { WebSocketServer, WebSocket } from "ws";
import Redis from "ioredis";

const port = process.env.WS_PORT || 8080;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Initialize Redis clients with error handlers
const redis = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    if (times > 3) {
      console.error(
        "Redis connection failed after 3 retries. Running without Redis."
      );
      return null; // Stop retrying
    }
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true,
});

const redisSubscriber = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true,
});

const redisPublisher = new Redis(REDIS_URL, {
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true,
});

// Add error handlers to prevent crashes
redis.on("error", (err) => {
  console.warn("Redis client error:", err.message);
});

redisSubscriber.on("error", (err) => {
  console.warn("Redis subscriber error:", err.message);
});

redisPublisher.on("error", (err) => {
  console.warn("Redis publisher error:", err.message);
});

let redisConnected = false;

async function start() {
  console.log("Starting WebSocket server...");

  // Try to connect to Redis
  try {
    await redis.connect();
    await redisSubscriber.connect();
    await redisPublisher.connect();
    redisConnected = true;
    console.log("✓ Redis connected successfully");
  } catch (err) {
    console.warn("⚠ Redis connection failed. Running in WebSocket-only mode.");
    console.warn(
      "To enable Redis features, make sure Redis is running on",
      REDIS_URL
    );
  }

  const wss = new WebSocketServer({ port });
  console.log(`WebSocket server listening on ws://localhost:${port}`);

  // Subscribe to Redis broadcast channel only if connected
  if (redisConnected) {
    redisSubscriber.subscribe("broadcast", (err, count) => {
      if (err) {
        console.error("Redis subscribe error:", err);
      } else {
        console.log("✓ Subscribed to Redis channel: broadcast");
      }
    });
  }

  // Handle messages from Redis and broadcast to all WebSocket clients
  if (redisConnected) {
    redisSubscriber.on("message", (channel, message) => {
      if (channel !== "broadcast") return;
      try {
        const payload =
          typeof message === "string" ? message : JSON.stringify(message);
        // Broadcast to all connected WebSocket clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(payload);
          }
        });
      } catch (err) {
        console.error("Error broadcasting Redis message:", err);
      }
    });
  }

  // Handle new WebSocket connections
  wss.on("connection", (ws) => {
    console.log("New WebSocket client connected");

    // Send welcome message
    ws.send(JSON.stringify({ type: "welcome", timestamp: Date.now() }));

    // Handle incoming messages from WebSocket clients
    ws.on("message", async (msg) => {
      try {
        const data = JSON.parse(msg.toString());

        if (redisConnected) {
          // Publish to Redis - it will broadcast to all clients
          await redisPublisher.publish("broadcast", JSON.stringify(data));
        } else {
          // Fallback: broadcast directly to all clients without Redis (excluding sender)
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
            }
          });
        }
      } catch (err) {
        console.error("Error handling incoming WebSocket message:", err);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

  // Keep server running
  console.log("WebSocket server is ready to accept connections");
}

process.on("SIGTERM", async () => {
  console.log("\nShutting down WebSocket server...");
  if (redisConnected) {
    await redis.quit();
    await redisSubscriber.quit();
    await redisPublisher.quit();
  }
  await redisPublisher.quit();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down WebSocket server...");
  await redis.quit();
  await redisSubscriber.quit();
  await redisPublisher.quit();
  process.exit(0);
});

start().catch((err) => {
  console.error("Failed to start WebSocket server:", err);
  process.exit(1);
});
