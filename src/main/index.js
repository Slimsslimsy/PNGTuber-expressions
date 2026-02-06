const { app, BrowserWindow, ipcMain, dialog, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const ConfigManager = require('./config');
const OverlayServer = require('./server');
const HotkeyManager = require('./hotkeys');

let mainWindow = null;
let configManager = null;
let overlayServer = null;
let hotkeyManager = null;
let isSpeaking = false;

function createWindow() {
    Menu.setApplicationMenu(null);

    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.ico');
    console.log('Icon path:', iconPath, 'Exists:', fs.existsSync(iconPath));

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        backgroundColor: '#1e1e1e',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: iconPath
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

    // Open DevTools with Ctrl+Shift+I
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            mainWindow.webContents.toggleDevTools();
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

async function initializeApp() {
    configManager = new ConfigManager();

    overlayServer = new OverlayServer(configManager);
    try {
        const port = configManager.get('serverPort');
        await overlayServer.start(port);
    } catch (error) {
        console.error('Failed to start overlay server:', error);
    }

    hotkeyManager = new HotkeyManager();

    const groups = configManager.get('groups');
    groups.forEach(group => {
        if (group.hotkey) {
            registerGroupHotkey(group.id, group.hotkey);
        }
    });

    // Set initial active group
    if (!configManager.get('activeGroupId') && groups.length > 0) {
        configManager.set('activeGroupId', groups[0].id);
    }
}

function registerGroupHotkey(groupId, hotkey) {
    console.log(`Registering hotkey ${hotkey} for group ID: ${groupId}`);
    hotkeyManager.register(hotkey, () => {
        const groups = configManager.get('groups');
        const group = groups.find(g => g.id === groupId);
        if (group) {
            console.log(`Switching to group: ${group.name}`);
            configManager.set('activeGroupId', groupId);
            broadcastCurrentState();
            if (mainWindow) {
                mainWindow.webContents.send('group-changed', group);
            }
        }
    });
}

function broadcastCurrentState() {
    const activeGroupId = configManager.get('activeGroupId');
    const groups = configManager.get('groups');
    const activeGroup = groups.find(g => g.id === activeGroupId);

    if (activeGroup) {
        const image = isSpeaking ? activeGroup.speakingImage : activeGroup.idleImage;
        overlayServer.broadcastState({
            groupId: activeGroupId,
            groupName: activeGroup.name,
            image: image,
            isSpeaking: isSpeaking
        });
    }
}

// IPC Handlers
ipcMain.handle('get-config', () => {
    return configManager.get();
});

ipcMain.handle('update-config', (event, updates) => {
    configManager.update(updates);
    return configManager.get();
});

ipcMain.handle('get-groups', () => {
    return configManager.get('groups');
});

ipcMain.handle('add-group', async (event, group) => {
    const newGroup = configManager.addGroup(group);

    if (newGroup.hotkey) {
        registerGroupHotkey(newGroup.id, newGroup.hotkey);
    }

    // first group always active
    if (configManager.get('groups').length === 1) {
        configManager.set('activeGroupId', newGroup.id);
        broadcastCurrentState();
    }

    return newGroup;
});

ipcMain.handle('update-group', (event, id, updates) => {
    const oldGroup = configManager.get('groups').find(g => g.id === id);

    if (oldGroup && oldGroup.hotkey) {
        hotkeyManager.unregister(oldGroup.hotkey);
    }

    const updatedGroup = configManager.updateGroup(id, updates);

    if (updatedGroup && updatedGroup.hotkey) {
        registerGroupHotkey(updatedGroup.id, updatedGroup.hotkey);
    }

    if (configManager.get('activeGroupId') === id) {
        broadcastCurrentState();
    }

    return updatedGroup;
});

ipcMain.handle('delete-group', (event, id) => {
    const group = configManager.get('groups').find(g => g.id === id);

    if (group && group.hotkey) {
        hotkeyManager.unregister(group.hotkey);
    }

    const result = configManager.deleteGroup(id);

    if (result) {
        broadcastCurrentState();
    }

    return result;
});

ipcMain.handle('select-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }
        ],
        ...options
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const sourcePath = result.filePaths[0];
        const fileName = `${Date.now()}-${path.basename(sourcePath)}`;
        const destPath = path.join(configManager.getAssetsDir(), fileName);

        fs.copyFileSync(sourcePath, destPath);

        return fileName;
    }

    return null;
});

ipcMain.handle('get-server-url', () => {
    const port = configManager.get('serverPort');
    return overlayServer.getUrl(port);
});

ipcMain.handle('set-speaking', (event, speaking) => {
    if (isSpeaking !== speaking) {
        isSpeaking = speaking;
        broadcastCurrentState();
    }
});

ipcMain.handle('switch-to-group', (event, id) => {
    const groups = configManager.get('groups');
    const group = groups.find(g => g.id === id);
    if (group) {
        configManager.set('activeGroupId', id);
        broadcastCurrentState();
        return true;
    }
    return false;
});

ipcMain.handle('get-active-group', () => {
    const activeGroupId = configManager.get('activeGroupId');
    const groups = configManager.get('groups');
    return groups.find(g => g.id === activeGroupId) || null;
});

app.whenReady().then(async () => {
    createWindow();
    await initializeApp();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', async () => {
    if (overlayServer) {
        await overlayServer.stop();
    }
    if (hotkeyManager) {
        hotkeyManager.unregisterAll();
    }
});
