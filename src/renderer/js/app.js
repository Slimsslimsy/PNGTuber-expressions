const { ipcRenderer } = require('electron');

// State
let currentConfig = null;
let groups = [];
let editingGroupId = null;
let recordingHotkey = false;
let selectedIdleFile = null;
let selectedSpeakingFile = null;

async function init() {
    try {
        console.log('Initializing app...');
        await loadConfig();
        console.log('Config loaded');
        await loadGroups();
        console.log('Groups loaded');
        setupEventListeners();
        console.log('Event listeners set up');
        updateServerUrl();
        console.log('Server URL updated');
        await initAudio();
        console.log('Audio initialized');
    } catch (error) {
        console.error('Init error:', error);
    }
}

async function loadConfig() {
    currentConfig = await ipcRenderer.invoke('get-config');

    document.getElementById('defaultTransition').value = currentConfig.defaultTransition || 'instant';
    document.getElementById('transitionDuration').value = currentConfig.transitionDuration || 300;
    document.getElementById('voiceThreshold').value = currentConfig.voiceThreshold || 30;
    document.getElementById('thresholdValue').textContent = currentConfig.voiceThreshold || 30;
}

async function loadGroups() {
    groups = await ipcRenderer.invoke('get-groups');
    renderGroups();
}

function renderGroups() {
    const grid = document.getElementById('groupsGrid');
    const emptyState = document.getElementById('emptyState');

    if (groups.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = groups.map(group => createGroupCard(group)).join('');

    // event listeners
    groups.forEach(group => {
        const card = document.querySelector(`[data-id="${group.id}"]`);
        if (card) {
            card.querySelector('.btn-success').addEventListener('click', (e) => {
                e.stopPropagation();
                switchToGroup(group.id);
            });
            card.querySelector('.btn-secondary').addEventListener('click', (e) => {
                e.stopPropagation();
                editGroup(group);
            });
            card.querySelector('.btn-danger').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteGroup(group.id);
            });
        }
    });
}

function createGroupCard(group) {
    const isActive = currentConfig.activeGroupId === group.id;
    const idleUrl = group.idleImage ? `http://localhost:${currentConfig.serverPort}/assets/${group.idleImage}` : '';

    return `
    <div class="expression-card ${isActive ? 'active' : ''}" data-id="${group.id}">
      <div class="card-preview">
        ${idleUrl ? `<img src="${idleUrl}" alt="${group.name}">` : '<span style="color: var(--text-secondary);">No image</span>'}
      </div>
      <div class="card-info">
        <div class="card-name">${group.name}</div>
        ${group.hotkey ? `<span class="card-hotkey">${group.hotkey}</span>` : '<span class="help-text small">No hotkey</span>'}
      </div>
      <div class="card-actions">
        <button class="btn btn-success" style="flex: 1;">Select</button>
        <button class="btn btn-secondary">Edit</button>
        <button class="btn btn-danger">Delete</button>
      </div>
    </div>
  `;
}

function setupEventListeners() {
    // Settings
    document.getElementById('saveSettings').addEventListener('click', saveSettings);
    document.getElementById('voiceThreshold').addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('thresholdValue').textContent = value;
        window.audioDetector.setThreshold(parseInt(value));
    });

    // Group management
    document.getElementById('addGroup').addEventListener('click', () => openModal());
    document.getElementById('saveGroup').addEventListener('click', saveGroup);
    document.getElementById('cancelModal').addEventListener('click', closeModal);
    document.querySelector('.modal-close').addEventListener('click', closeModal);

    // File selection
    document.getElementById('selectIdle').addEventListener('click', () => selectFile('idle'));
    document.getElementById('selectSpeaking').addEventListener('click', () => selectFile('speaking'));

    // Hotkey recording
    document.getElementById('recordHotkey').addEventListener('click', startRecordingHotkey);

    // URL copy
    document.getElementById('copyUrl').addEventListener('click', copyObsUrl);

    // Modal backdrop
    document.getElementById('groupModal').addEventListener('click', (e) => {
        if (e.target.id === 'groupModal') closeModal();
    });

    // Mic selection
    document.getElementById('micSelect').addEventListener('change', async (e) => {
        if (e.target.value) {
            await window.audioDetector.start(e.target.value);
            await ipcRenderer.invoke('update-config', { micDeviceId: e.target.value });
        }
    });

    // Listen for group changes
    ipcRenderer.on('group-changed', async (event, group) => {
        currentConfig = await ipcRenderer.invoke('get-config');
        renderGroups();
    });
}

async function initAudio() {
    try {
        const detector = window.audioDetector;

        // Get available microphones
        const devices = await detector.getDevices();
        const select = document.getElementById('micSelect');

        devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Microphone ${select.options.length}`;
            select.appendChild(option);
        });

        // Set saved device
        if (currentConfig.micDeviceId) {
            select.value = currentConfig.micDeviceId;
            await detector.start(currentConfig.micDeviceId);
        }

        // Set threshold
        detector.setThreshold(currentConfig.voiceThreshold || 30);

        // Setup callbacks
        detector.onLevelChange = (level) => {
            document.getElementById('audioLevel').style.width = `${level}%`;
        };

        detector.onSpeakingChange = (speaking) => {
            const indicator = document.getElementById('speakingIndicator');
            const text = document.getElementById('speakingText');
            indicator.classList.toggle('speaking', speaking);
            text.textContent = speaking ? 'Speaking' : 'Idle';
        };
    } catch (error) {
        console.error('Audio init error:', error);
    }
}

async function saveSettings() {
    const updates = {
        defaultTransition: document.getElementById('defaultTransition').value,
        transitionDuration: parseInt(document.getElementById('transitionDuration').value),
        voiceThreshold: parseInt(document.getElementById('voiceThreshold').value)
    };

    await ipcRenderer.invoke('update-config', updates);
    currentConfig = await ipcRenderer.invoke('get-config');
}

function updateServerUrl() {
    const url = `http://localhost:${currentConfig.serverPort}/overlay`;
    document.getElementById('serverUrl').textContent = `Server: ${url}`;
    document.getElementById('obsUrl').textContent = url;
}

function openModal(group = null) {
    editingGroupId = group ? group.id : null;
    const modal = document.getElementById('groupModal');
    const title = document.getElementById('modalTitle');

    title.textContent = group ? 'Edit Group' : 'Add Group';

    document.getElementById('groupName').value = group ? group.name : '';
    document.getElementById('idleImage').value = group ? group.idleImage : '';
    document.getElementById('speakingImage').value = group ? group.speakingImage : '';
    document.getElementById('groupHotkey').value = group ? group.hotkey : '';

    selectedIdleFile = group ? group.idleImage : null;
    selectedSpeakingFile = group ? group.speakingImage : null;

    updateImagePreview('idle', selectedIdleFile);
    updateImagePreview('speaking', selectedSpeakingFile);

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('groupModal').classList.remove('active');
    editingGroupId = null;
    selectedIdleFile = null;
    selectedSpeakingFile = null;
}

async function selectFile(type) {
    const fileName = await ipcRenderer.invoke('select-file');

    if (fileName) {
        if (type === 'idle') {
            selectedIdleFile = fileName;
            document.getElementById('idleImage').value = fileName;
            updateImagePreview('idle', fileName);
        } else {
            selectedSpeakingFile = fileName;
            document.getElementById('speakingImage').value = fileName;
            updateImagePreview('speaking', fileName);
        }
    }
}

function updateImagePreview(type, fileName) {
    const previewId = type === 'idle' ? 'idlePreview' : 'speakingPreview';
    const preview = document.getElementById(previewId);

    if (fileName) {
        const url = `http://localhost:${currentConfig.serverPort}/assets/${fileName}`;
        preview.innerHTML = `<img src="${url}" alt="Preview">`;
    } else {
        preview.innerHTML = '';
    }
}

function startRecordingHotkey() {
    const input = document.getElementById('groupHotkey');
    const btn = document.getElementById('recordHotkey');

    recordingHotkey = true;
    btn.textContent = 'Press...';
    input.value = '';

    const handler = (e) => {
        e.preventDefault();

        const modifiers = [];
        if (e.ctrlKey || e.metaKey) modifiers.push('CmdOrCtrl');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        let key = e.key.toUpperCase();
        if (key.startsWith('F') && key.length <= 3) {
            // F keys
        } else if (key >= '0' && key <= '9') {
            // Numbers
        } else if (key.length === 1 && /[A-Z]/.test(key)) {
            // Letters
        } else {
            return;
        }

        if (modifiers.length === 0) return;

        const accelerator = [...modifiers, key].join('+');
        input.value = accelerator;

        recordingHotkey = false;
        btn.textContent = 'Record';
        document.removeEventListener('keydown', handler);
    };

    document.addEventListener('keydown', handler);
}

async function saveGroup() {
    const name = document.getElementById('groupName').value.trim();
    const hotkey = document.getElementById('groupHotkey').value.trim();

    if (!name) {
        alert('Please enter a group name');
        return;
    }

    if (!selectedIdleFile) {
        alert('Please select an idle image');
        return;
    }

    if (!selectedSpeakingFile) {
        alert('Please select a speaking image');
        return;
    }

    const groupData = {
        name,
        idleImage: selectedIdleFile,
        speakingImage: selectedSpeakingFile,
        hotkey: hotkey || null
    };

    if (editingGroupId) {
        await ipcRenderer.invoke('update-group', editingGroupId, groupData);
    } else {
        await ipcRenderer.invoke('add-group', groupData);
    }

    currentConfig = await ipcRenderer.invoke('get-config');
    await loadGroups();
    closeModal();
}

function editGroup(group) {
    openModal(group);
}

async function deleteGroup(id) {
    if (confirm('Delete this group?')) {
        await ipcRenderer.invoke('delete-group', id);
        currentConfig = await ipcRenderer.invoke('get-config');
        await loadGroups();
    }
}

async function switchToGroup(id) {
    await ipcRenderer.invoke('switch-to-group', id);
    currentConfig = await ipcRenderer.invoke('get-config');
    renderGroups();
}

function copyObsUrl() {
    const url = document.getElementById('obsUrl').textContent;
    navigator.clipboard.writeText(url);
}

// Initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
