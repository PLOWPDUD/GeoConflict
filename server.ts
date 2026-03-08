import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "node:http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;
  const rooms = new Map<string, { creatorId: string; settings: any }>();

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("a user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("user disconnected:", socket.id);
      // Room persistence is handled by socket.io; we do not delete rooms on creator disconnect.
    });

    socket.on("room:join", ({ roomName, settings }) => {
        socket.join(roomName);
        console.log(`User ${socket.id} joined/created room: ${roomName} with settings:`, settings);
        
        // Store room settings if it's a new room
        if (settings && !rooms.has(roomName)) {
            rooms.set(roomName, { creatorId: socket.id, settings });
            console.log(`Room ${roomName} created with settings:`, settings);
            
            // Start the game in 5 seconds
            setTimeout(() => {
                io.to(roomName).emit("room:start");
                console.log(`Room ${roomName} started`);
            }, 5000);
        }
        
        socket.to(roomName).emit("room:user-joined", socket.id);
        socket.emit("room:joined");
    });

    socket.on("country:update", (data) => {
        console.log("country update:", data);
        // Broadcast to everyone in the same room
        const room = Array.from(socket.rooms).find(r => r !== socket.id);
        if (room) {
            socket.to(room).emit("country:update", data);
        } else {
            socket.broadcast.emit("country:update", data);
        }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
