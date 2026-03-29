const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { share, canShare, getNativeWindowHandle } = require('electron-native-share');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('can-share', () => {
  return canShare();
});

ipcMain.handle('share', async (_event, options) => {
  return share(options, mainWindow);
});
