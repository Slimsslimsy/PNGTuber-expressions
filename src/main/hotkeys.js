const { globalShortcut } = require('electron');

class HotkeyManager {
    constructor() {
        this.registeredHotkeys = new Map();
    }

    register(accelerator, callback) {
        try {
            // Unregister if already exists
            if (this.registeredHotkeys.has(accelerator)) {
                this.unregister(accelerator);
            }

            // Register the hotkey globally
            const success = globalShortcut.register(accelerator, callback);

            if (success) {
                this.registeredHotkeys.set(accelerator, callback);
                console.log(`Hotkey registered: ${accelerator}`);
                return true;
            } else {
                console.error(`Failed to register hotkey ${accelerator} - may be in use by another app`);
                return false;
            }
        } catch (error) {
            console.error(`Failed to register hotkey ${accelerator}:`, error);
            return false;
        }
    }

    unregister(accelerator) {
        try {
            if (this.registeredHotkeys.has(accelerator)) {
                globalShortcut.unregister(accelerator);
                this.registeredHotkeys.delete(accelerator);
                console.log(`Hotkey unregistered: ${accelerator}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error(`Failed to unregister hotkey ${accelerator}:`, error);
            return false;
        }
    }

    unregisterAll() {
        try {
            globalShortcut.unregisterAll();
            this.registeredHotkeys.clear();
            console.log('All hotkeys unregistered');
            return true;
        } catch (error) {
            console.error('Failed to unregister all hotkeys:', error);
            return false;
        }
    }

    isRegistered(accelerator) {
        return globalShortcut.isRegistered(accelerator);
    }

    getRegistered() {
        return Array.from(this.registeredHotkeys.keys());
    }

    validateAccelerator(accelerator) {
        const validPattern = /^(Ctrl|Cmd|Alt|Shift|CmdOrCtrl)(\+(Ctrl|Cmd|Alt|Shift|CmdOrCtrl))*\+[A-Z0-9]$|^F[1-9][0-2]?$|^Num[0-9]$/i;
        return validPattern.test(accelerator);
    }
}

module.exports = HotkeyManager;
