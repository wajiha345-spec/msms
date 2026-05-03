import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { initSocket } from './socket/socket';
import { checkAndAlertImeiBalance } from './modules/imei-verify/imei-verify.service';
import 'dotenv/config';

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

initSocket(io);
app.set('io', io);

httpServer.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);

  // Check IMEI API balance on startup, then every 6 hours
  checkAndAlertImeiBalance();
  setInterval(checkAndAlertImeiBalance, 6 * 60 * 60 * 1000);
});