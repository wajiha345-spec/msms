import { Server } from 'socket.io';

export function initSocket(io: Server) {
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (room: string) => {
      socket.join(room);
      console.log(`${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}