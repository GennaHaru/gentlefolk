// 1. Service Worker Kill Switch
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    });
}

let currentSettings = [];
let synthControl = null;

async function init() {
    const listDiv = document.getElementById('file-list');
    try {
        const response = await fetch('abcfiles/index.json?v=' + Date.now());
        if (!response.ok) throw new Error("Could not find index.json");

        const files = await response.json();
        listDiv.innerHTML = '';

        for (const filename of files) {
            try {
                const fileRes = await fetch(`abcfiles/${filename}`);
                if (!fileRes.ok) continue;
                const text = await fileRes.text();

                const titleMatch = text.match(/^T:[ \t]*(.*)$/m);
                const rhythmMatch = text.match(/^R:[ \t]*(.*)$/m);
                const title = titleMatch ? titleMatch[1].trim() : filename;
                const rhythm = rhythmMatch ? rhythmMatch[1].trim() : "";

                const div = document.createElement('div');
                div.className = 'file-item';
                div.innerText = rhythm ? `${title} (${rhythm})` : title;

                div.onclick = () => {
                    document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
                    div.classList.add('active');
                    document.body.classList.add('tune-selected');
                    processAbcData(text);
                };
                listDiv.appendChild(div);
            } catch (err) { console.error(err); }
        }
    } catch (e) { listDiv.innerText = "Error loading tunes."; }
}

function processAbcData(text) {
    currentSettings = text.split(/\n(?=X:)/).filter(s => s.trim().length > 0);
    renderSettingsNav(); // Restored logic
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

    // Trim the data to ensure it starts with 'X:'
    const abcData = currentSettings[index].trim();
    const titleMatch = abcData.match(/^T:[ \t]*(.*)$/m);
    document.getElementById('tune-title').innerText = titleMatch ? titleMatch[1] : "Tune";

    const paper = document.getElementById('paper');
    paper.innerHTML = "<p style='padding:20px; color:#666;'>Loading notation...</p>";

    setTimeout(() => {
        paper.innerHTML = "";
        // We use a defined staffwidth and let CSS scale it,
        // which is often more stable than 'responsive: resize'
        const visualObj = ABCJS.renderAbc("paper", abcData, {
            scale: 0.8,
            staffwidth: 740, // Standard width for most screens
            paddingleft: 0,
            paddingright: 0,
            add_classes: true
        })[0];

        if (visualObj) {
            renderMidi(visualObj);
        }
    }, 150);
}

async function renderMidi(visualObj) {
    const midiDiv = document.getElementById('midi-player');
    if (synthControl) { synthControl.pause(); }

    if (ABCJS.synth.supportsAudio()) {
        synthControl = new ABCJS.synth.SynthController();
        synthControl.load("#midi-player", null, {
            displayRestart: true, displayPlay: true,
            displayProgress: true, displayWarp: true
        });

        const midiBuffer = new ABCJS.synth.CreateSynth();
        try {
            await midiBuffer.init({ visualObj: visualObj });
            await synthControl.setTune(visualObj, false);

            const playBtn = midiDiv.querySelector('.abcjs-btn.abcjs-play');
            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    const ctx = ABCJS.synth.activeAudioContext();
                    if (ctx && ctx.state === 'suspended') {
                        ctx.resume();
                    }
                }, { once: true });
            }
        } catch (err) { console.error("Audio Sync Error:", err); }
    }
}

function closeTune() {
    if (synthControl) { synthControl.pause(); }
    document.body.classList.remove('tune-selected');
}

function forceReset() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
            for(let reg of regs) reg.unregister();
            window.location.reload(true);
        });
    } else {
        window.location.reload(true);
    }
}

function toggleModal(show) {
    const modal = document.getElementById('share-modal');
    if (modal) modal.style.display = show ? 'flex' : 'none';
}

window.onload = init;
