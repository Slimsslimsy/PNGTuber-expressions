# PNGTuber Expression Hotkeys

A desktop application for PNGTubers to manage expression groups with voice-activated idle/speaking states and global hotkeys, integrated with OBS.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Voice Detection** - Automatically switch between idle and speaking expressions based on microphone input
- **Global Hotkeys** - Switch expression groups instantly with keyboard shortcuts
- **Expression Groups** - Each group contains an idle image and a speaking image
- **OBS Integration** - Real-time WebSocket connection for instant updates in your stream
- **Transitions** - Instant, fade, and scale animation effects
- **Adjustable Sensitivity** - Fine-tune voice detection threshold with audio level meter

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd PNGTuber-expressions

# Install dependencies
npm install

# Run in development mode
npm start

# Build for distribution
npm run build
```

## 🚀 Quick Start

### 1. Create an Expression Group

1. Launch the app
2. Click **"+ Add Group"**
3. Enter a **name** (e.g., "Happy")
4. Select your **Idle Image** (shown when not speaking)
5. Select your **Speaking Image** (shown when talking)
6. Record a **Hotkey** to switch to this group
7. Click **Save**

### 2. Set Up Voice Detection

1. Select your **Microphone** from the dropdown
2. Adjust the **Sensitivity** slider - watch the audio meter to find the right threshold
3. Speak into your mic to test - the indicator should show "Speaking"

### 3. Configure OBS

1. Copy the **Server URL** (e.g., `http://localhost:7474/overlay`)
2. In OBS, add a new **Browser Source**:
   - **URL**: Paste the server URL
   - **Width**: `1920`
   - **Height**: `1080`
3. Position and scale as needed

### 4. Stream!

- Use hotkeys to switch between expression groups
- Voice detection automatically handles idle ↔ speaking transitions

## ⚙️ Settings

| Setting | Description |
|---------|-------------|
| **Microphone** | Select your input device |
| **Sensitivity** | Voice threshold (5-80) |
| **Transition** | Instant, Fade, or Scale |
| **Duration** | Animation speed (100-2000ms) |

## 🎯 Hotkey Format

Requires at least one modifier key:
- `Alt+A`, `Alt+Q`, `Ctrl+1`, `Shift+F1`, etc.

## 📁 Config Location

- **Windows**: `%APPDATA%\pngtuber-expression-hotkeys\`
- **macOS**: `~/Library/Application Support/pngtuber-expression-hotkeys/`

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Mic not detected | Allow microphone access, restart app |
| Hotkeys not working | Ensure no conflicts with other apps |
| OBS not updating | Check server URL, refresh Browser Source |
| Voice not detecting | Adjust sensitivity slider, check mic selection |

## 📄 License

MIT License

---

**Happy streaming!**
