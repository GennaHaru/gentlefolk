let currentSettings = [];

async function init() {
    const listDiv = document.getElementById('file-list');
    try {
        // The ?v=Date.now() forces the browser to get a fresh copy from Porkbun
        const response = await fetch('abcfiles/index.json?v=' + Date.now());
        if (!response.ok) throw new Error("Could not find index.json");

        const files = await response.json();
        listDiv.innerHTML = '';

        for (const filename of files) {
            try {
                const fileRes = await fetch(`abcfiles/${filename}`);
                if (!fileRes.ok) continue;

                const text = await fileRes.text();

                // Extract Title (T:) and Rhythm (R:)
                // The [ \t]* handles spaces or tabs after the colon
                const titleMatch = text.match(/^T:[ \t]*(.*)$/m);
                const rhythmMatch = text.match(/^R:[ \t]*(.*)$/m);

                const title = titleMatch ? titleMatch[1].trim() : filename;
                const rhythm = rhythmMatch ? rhythmMatch[1].trim() : "";

                const div = document.createElement('div');
                div.className = 'file-item';

                // Show "Tune Name (Jig)"
                div.innerText = rhythm ? `${title} (${rhythm})` : title;

                div.onclick = () => {
                    document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
                    div.classList.add('active');
                    document.body.classList.add('tune-selected');
                    processAbcData(text);
                };
                listDiv.appendChild(div);

            } catch (err) {
                console.error("Error loading file: " + filename, err);
            }
        }
    } catch (e) {
        console.error("Initialization failed", e);
        listDiv.innerText = "Error loading tunes.";
    }
}

// ... rest of your baseline app.js functions (processAbcData, displaySetting, etc.) remains exactly the same

function processAbcData(text) {
    currentSettings = text.split(/\n(?=X:)/).filter(s => s.trim().length > 0);
    renderSettingsNav();
    displaySetting(0);
}

function renderSettingsNav() {
    const nav = document.getElementById('setting-nav');
    if (!nav) return;
    nav.style.display = currentSettings.length > 1 ? 'flex' : 'none';
    nav.innerHTML = '<span style="font-size:0.8rem; font-weight:bold; margin-right:5px">Settings:</span>';

    currentSettings.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'setting-btn';
        btn.innerText = i + 1;
        btn.id = 'btn-' + i;
        btn.onclick = () => displaySetting(i);
        nav.appendChild(btn);
    });
}

function displaySetting(index) {
    document.querySelectorAll('.setting-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById('btn-' + index);
    if (activeBtn) activeBtn.classList.add('active');

    const abcData = currentSettings[index];
    const titleMatch = abcData.match(/^T:[ \t]*(.*)$/m);
    document.getElementById('tune-title').innerText = titleMatch ? titleMatch[1] : "Untitled Tune";

    // 1. Render the Sheet Music
    ABCJS.renderAbc("paper", abcData, {
        responsive: 'resize',
        paddingleft: 15, paddingright: 15, paddingtop: 15, paddingbottom: 15,
        staffwidth: 700
    });

    // 2. Render the MIDI Player
    renderMidi(abcData);
}

async function forceReset() {
    if (confirm("Refresh all tunes and app data?")) {
        if ('caches' in window) {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        }
        window.location.reload(true);
    }
}

function toggleModal(show) {
    const modal = document.getElementById('share-modal');
    if (modal) modal.style.display = show ? 'flex' : 'none';
}

function closeTune() {
    document.body.classList.remove('tune-selected');
}

window.onload = init;

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}

async function renderMidi(abcData) {
    const midiDiv = document.getElementById('midi-player');

    if (ABCJS.synth.supportsAudio()) {
        const visualObj = ABCJS.renderAbc("paper", abcData)[0];
        const synthControl = new ABCJS.synth.SynthController();

        synthControl.load("#midi-player", null, {
            displayRestart: true,
            displayPlay: true,
            displayProgress: true,
            displayWarp: true
        });

        const midiBuffer = new ABCJS.synth.CreateSynth();

        try {
            await midiBuffer.init({ visualObj: visualObj });
            // This force-links the visual progress bar to the audio buffer
            await synthControl.setTune(visualObj, false);

            // Mobile Fix: Resume audio context on the first click
            const playBtn = midiDiv.querySelector('.abcjs-btn.abcjs-play');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    if (ABCJS.synth.activeAudioContext()) {
                        ABCJS.synth.activeAudioContext().resume();
                    }
                }, { once: true });
            }
        } catch (err) {
            console.error("Audio Sync Error:", err);
        }
    } else {
        midiDiv.innerHTML = "<em>Audio not supported</em>";
    }
}
