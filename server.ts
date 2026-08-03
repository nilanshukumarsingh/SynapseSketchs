import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: '/api/socket',
    addTrailingSlash: false,
  });

  // Server-side state per room
  const rooms = new Map<string, { strokes: any[], comments: any[], backgroundImage: string | null }>();

  io.on('connection', (socket) => {
    const roomId = (socket.handshake.query.room as string) || 'default';
    socket.join(roomId);
    console.log(`Client connected to room ${roomId}:`, socket.id);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { strokes: [], comments: [], backgroundImage: null });
    }
    const roomState = rooms.get(roomId)!;

    // Send initial state
    socket.emit('init', roomState);

    socket.on('stroke:add', (stroke) => {
      roomState.strokes.push(stroke);
      socket.to(roomId).emit('stroke:add', stroke);
    });

    socket.on('stroke:update', ({ id, point }) => {
      const stroke = roomState.strokes.find(s => s.id === id);
      if (stroke) {
        stroke.points.push(point);
        socket.to(roomId).emit('stroke:update', { id, point });
      }
    });

    socket.on('comment:add', (comment) => {
      roomState.comments.push(comment);
      socket.to(roomId).emit('comment:add', comment);
    });

    socket.on('canvas:clear', () => {
      roomState.strokes = [];
      roomState.comments = [];
      roomState.backgroundImage = null;
      socket.to(roomId).emit('canvas:clear');
    });

    socket.on('background:set', (url) => {
      roomState.backgroundImage = url;
      socket.to(roomId).emit('background:set', url);
    });

    socket.on('message:set', (msg) => {
      socket.to(roomId).emit('message:set', msg);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
