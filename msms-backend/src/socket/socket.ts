import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export function initSocket(io: Server) {
  io.on('connection', (socket) => {
    // Verify the JWT sent by the client and auto-join that shop's room —
    // the room is derived from the token, never trusted from client input,
    // so one shop can never receive another shop's realtime events.
    const token = socket.handshake.auth?.token;
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { shopId: string };
      if (!payload.shopId) throw new Error('Missing shopId');
      socket.join(`shop:${payload.shopId}`);
      console.log(`${socket.id} joined room: shop:${payload.shopId}`);
    } catch {
      console.log(`${socket.id} rejected: invalid or missing token`);
      socket.disconnect(true);
      return;
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
