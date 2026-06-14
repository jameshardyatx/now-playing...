const path = require("path");
const { app, BrowserWindow, screen, ipcMain } = require("electron");

ipcMain.on("window-close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
});

let win;

app.whenReady()
    .then(() => {
        const { width } = screen.getPrimaryDisplay().workAreaSize;

        win = new BrowserWindow({
            width,
            height: 55,
            resizable: true,
            frame: false,
            hasShadow: false,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
            },
        });

        win.loadFile("index.html");
    })
    .catch(console.error);
