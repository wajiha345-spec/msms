const { app, BrowserWindow, shell, ipcMain, session } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const WEB_BUILD_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

// The Expo static web export (dist/index.html) references assets with
// root-absolute paths (e.g. /_expo/static/js/web/...). Loading that file
// directly via loadFile() resolves those paths against the filesystem root
// under file://, which breaks the bundle. Serving dist/ over a local HTTP
// server instead sidesteps that entirely, and gives client-side routes
// (e.g. /Main/DashboardTab) a real fallback to index.html on refresh.
function createStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(WEB_BUILD_DIR, urlPath);

      if (!filePath.startsWith(WEB_BUILD_DIR)) {
        res.writeHead(403);
        res.end();
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          filePath = path.join(WEB_BUILD_DIR, 'index.html');
        }
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            res.writeHead(500);
            res.end('Internal server error');
            return;
          }
          const ext = path.extname(filePath);
          res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
          res.end(data);
        });
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

let mainWindow = null;

async function createWindow() {
  if (!fs.existsSync(path.join(WEB_BUILD_DIR, 'index.html'))) {
    throw new Error(
      `No web build found at ${WEB_BUILD_DIR}. Run "npm run web:build" first.`
    );
  }

  const server = await createStaticServer();
  const { port } = server.address();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'SmartShop',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
    server.close();
  });
}

app.whenReady().then(() => {
  createWindow();

  // Backup export (backupWriter.ts) triggers a plain browser download via a
  // temporary <a download> link — works unmodified in any browser tab. This
  // upgrades that same download into a native Save-As dialog when running
  // inside Electron specifically, so the renderer/preload never need a
  // dedicated IPC channel or filesystem access for this feature at all.
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ defaultPath: item.getFilename() });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Renderer-requested navigation to an external URL (e.g. the public
// invoice/quotation print page) — opened in the user's real default
// browser rather than inside the app window. Only http(s) URLs are
// forwarded; the renderer never gets direct shell access.
ipcMain.handle('shell:openExternal', (_event, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
  shell.openExternal(url);
});
