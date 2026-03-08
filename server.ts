import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const PORT = 3000;
  const rooms = new Map<string, { creatorId: string; settings: any; countries: any[]; cities: any[]; cells: any[] }>();

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Socket.io connection
  io.on("connection", (socket) => {
    console.log("a user connected:", socket.id);

    socket.on("disconnect", () => {
      console.log("user disconnected:", socket.id);
    });

    socket.on("room:join", ({ roomName, settings }) => {
        socket.join(roomName);
        
        if (!rooms.has(roomName)) {
            rooms.set(roomName, { creatorId: socket.id, settings, countries: [], cities: [], cells: [] });
        }
        
        const room = rooms.get(roomName)!;
        socket.emit("room:state", { countries: room.countries, cities: room.cities });
        
        socket.to(roomName).emit("room:user-joined", socket.id);
        socket.emit("room:joined");
    });

    socket.on("country:spawn", ({ roomName, country }) => {
        const room = rooms.get(roomName);
        if (room) {
            room.countries.push(country);
            io.to(roomName).emit("country:spawned", country);
        }
    });

    socket.on("country:update", ({ roomName, id, updates }) => {
        const room = rooms.get(roomName);
        if (room) {
            const country = room.countries.find(c => c.id === id);
            if (country) {
                Object.assign(country, updates);
                io.to(roomName).emit("country:update", { id, updates });
            }
        }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode, serving static files from dist");
    // Production static file serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback
    app.get('(.*)', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
