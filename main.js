const path = require("path");
const { app, BrowserWindow, screen, ipcMain, shell } = require("electron");
const http = require("http");
const crypto = require("crypto");
const Store = require("electron-store");

// require("dotenv").config({ path: path.join(__dirname, ".env") });
require('dotenv').config({ path: path.join(path.dirname(app.getPath('exe')), '.env') });

const store = new Store();

let accessToken = null;
let refreshToken = null;
let mainWindow = null;
let pollingInterval = null;

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPES = "user-read-currently-playing user-read-playback-state";

function startAuthFlow() {
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl =
        `https://accounts.spotify.com/authorize?` +
        `client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&scope=${encodeURIComponent(SCOPES)}&state=${state}`;
    shell.openExternal(authUrl);

    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, REDIRECT_URI);
        if (url.pathname !== "/callback") return;

        const code = url.searchParams.get("code");
        res.end("<h1>Authorized! You can close this tab.</h1>");
        server.close();

        await exchangeCodeForTokens(code);
        startPolling();
    });
    server.listen(8888);
}

async function exchangeCodeForTokens(code) {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
        "base64",
    );
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: REDIRECT_URI,
        }),
    });
    const data = await res.json();
    accessToken = data.access_token;
    if (data.refresh_token) {
        refreshToken = data.refresh_token;
        store.set("refreshToken", refreshToken);
    }
}

async function refreshAccessToken() {
    const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
        "base64",
    );
    const res = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });
    const data = await res.json();
    accessToken = data.access_token;
    if (data.refresh_token) {
        refreshToken = data.refresh_token;
        store.set("refreshToken", refreshToken);
    }
}

async function getCurrentlyPlaying() {
    try {
        const res = await fetch(
            "https://api.spotify.com/v1/me/player/currently-playing",
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
        );
        if (res.status === 204) return null;
        if (res.status === 401) {
            await refreshAccessToken();
            return getCurrentlyPlaying();
        }
        if (!res.ok) return null;
        return res.json();
    } catch (err) {
        console.error("Error fetching currently playing:", err);
        return null;
    }
}

function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(async () => {
        if (!mainWindow) return;
        const data = await getCurrentlyPlaying();
        mainWindow.webContents.send("now-playing", data);
    }, 5000);
}

async function initSpotify() {
    refreshToken = store.get("refreshToken");
    if (refreshToken) {
        try {
            await refreshAccessToken();
            startPolling();
        } catch (err) {
            console.error(
                "Failed to restore Spotify session, re-auth required:",
                err,
            );
            store.delete("refreshToken");
        }
    }
}

ipcMain.on("window-close", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win.close();
});

ipcMain.handle("start-auth", () => startAuthFlow());

ipcMain.handle("get-auth-status", () => !!accessToken);

app.whenReady()
    .then(async () => {
        const { width } = screen.getPrimaryDisplay().workAreaSize;
        mainWindow = new BrowserWindow({
            width,
            height: 55,
            resizable: true,
            frame: false,
            hasShadow: false,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
            },
        });

        mainWindow.loadFile("index.html");

        mainWindow.on("closed", () => {
            mainWindow = null;
            if (pollingInterval) clearInterval(pollingInterval);
        });

        await initSpotify();
    })
    .catch(console.error);
