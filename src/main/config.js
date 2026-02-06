const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class ConfigManager {
  constructor() {
    this.configDir = path.join(app.getPath('userData'), 'config');
    this.configPath = path.join(this.configDir, 'config.json');
    this.assetsDir = path.join(app.getPath('userData'), 'assets');
    this.defaultConfig = {
      serverPort: 7474,
      groups: [],
      activeGroupId: null,
      defaultTransition: 'instant',
      transitionDuration: 300,
      // Audio stuff
      micDeviceId: null,
      voiceThreshold: 30,
      voiceHoldTime: 150
    };
    this.config = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    if (!fs.existsSync(this.assetsDir)) {
      fs.mkdirSync(this.assetsDir, { recursive: true });
    }

    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = { ...this.defaultConfig, ...JSON.parse(data) };
        // Migrate old expressions to groups if needed (old test unreleased version)
        if (this.config.expressions && !this.config.groups.length) {
          this.config.groups = this.config.expressions.map(expr => ({
            id: expr.id,
            name: expr.name,
            idleImage: expr.faceImage,
            speakingImage: expr.faceImage,
            hotkey: expr.hotkey
          }));
          delete this.config.expressions;
          this.save();
        }
      } catch (error) {
        console.error('Failed to load config:', error);
        this.config = { ...this.defaultConfig };
      }
    } else {
      this.config = { ...this.defaultConfig };
      this.save();
    }
  }

  get(key) {
    return key ? this.config[key] : this.config;
  }

  set(key, value) {
    this.config[key] = value;
    this.save();
  }

  update(updates) {
    this.config = { ...this.config, ...updates };
    this.save();
  }

  save() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Failed to save config:', error);
      return false;
    }
  }

  addGroup(group) {
    this.config.groups.push({
      id: Date.now().toString(),
      ...group
    });
    this.save();
    return this.config.groups[this.config.groups.length - 1];
  }

  updateGroup(id, updates) {
    const index = this.config.groups.findIndex(g => g.id === id);
    if (index !== -1) {
      this.config.groups[index] = { ...this.config.groups[index], ...updates };
      this.save();
      return this.config.groups[index];
    }
    return null;
  }

  deleteGroup(id) {
    const index = this.config.groups.findIndex(g => g.id === id);
    if (index !== -1) {
      this.config.groups.splice(index, 1);
      if (this.config.activeGroupId === id) {
        this.config.activeGroupId = this.config.groups[0]?.id || null;
      }
      this.save();
      return true;
    }
    return false;
  }

  getAssetsDir() {
    return this.assetsDir;
  }
}

module.exports = ConfigManager;
