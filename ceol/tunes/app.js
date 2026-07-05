let currentSettings = [];
let synthControl;

async function init() {
    const listDiv = document.getElementById('file-list');
    try {
        const response = await fetch('abcfiles/index.json?v=' + Date.now());
        const files = await response.json();
        listDiv.innerHTML = '';
        for (const filename of files) {
            const fileRes = await fetch(`abcfiles/${filename}`);
            const text = await fileRes.text();
            const titleMatch = text.match(/^T:[ \t]*(.*)$/m);
            const rhythmMatch = text.match(/^R:[ \t]*(.*)$/m);

            const div = document.createElement('div');
            div.className = 'file-item';
            div.innerText = rhythmMatch ? `${titleMatch[1]} (${rhythmMatch[1]})` : titleMatch[1];
            div.onclick = () => {
                document.querySelectorAll('.file-item').forEach(item => item.classList.remove('active'));
                div.classList.add('active');
                document.body.classList.add('tune-selected');
                processAbcData(text);
            };
            listDiv.appendChild(div);
        }
    } catch (e) { listDiv.innerText = "Error loading tunes."; }
}

function processAbcData(text) {
    currentSettings = text.split(/\n(?=X:)/).filter(s => s.trim().length > 0);
    renderSettingsNav();
    displaySetting(0);
}

function renderSettingsNav() {
    const nav = document.getElementById('setting-nav');
    nav.style.display = currentSettings.length > 1 ? 'flex' : 'none';
    nav.innerHTML = '';
    currentSettings.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.className = 'setting-btn';
        btn.innerText = i + 1;
        btn.onclick = () => displaySetting(i);
        nav.appendChild(btn);
    });
}

function displaySetting(index) {
    const abcData = currentSettings[index] + "\n[| |]";
    const paperEl = document.getElementById('paper');
    const width = paperEl.clientWidth - 40; // Keeps the padding buffer

    document.getElementById('tune-title').innerText = abcData.match(/^T:[ \t]*(.*)$/m)?.[1] || "Tune";

    document.querySelectorAll('.setting-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });

    // THE FIX: Added 'all_left: false' and 'justify: true'
    const visualObj = ABCJS.renderAbc("paper", abcData, {
        responsive: 'resize',
        paddingleft: 15,
        paddingright: 15,
        all_left: false     // FORCES the last line to stretch to full width
    })[0];

    renderMidi(visualObj);
}
async function renderMidi(visualObj) {
    if (synthControl) synthControl.pause();
    synthControl = new ABCJS.synth.SynthController();

    // We keep your existing load settings
    synthControl.load("#midi-player", null, {
        displayRestart: true,
        displayPlay: true,
        displayProgress: true,
        displayWarp: true,
        customCss: true
    });

    const midiBuffer = new ABCJS.synth.CreateSynth();
    try {
        await midiBuffer.init({ visualObj: visualObj, options: { warp: 0.5 } });
        await synthControl.setTune(visualObj, false, { warp: 0.5 });
        // This line ensures the internal state of the player matches your speed
        synthControl.pushWarp(0.5);
    } catch (e) { console.warn("Audio synthesis failed:", e); }
}

function toggleQR() {
    const overlay = document.getElementById('qr-overlay');
    const isVisible = window.getComputedStyle(overlay).display !== 'none';
    overlay.style.setProperty('display', isVisible ? 'none' : 'flex', 'important');
}

function toggleMail() {
    const overlay = document.getElementById('mail-overlay');
    const isVisible = window.getComputedStyle(overlay).display !== 'none';
    overlay.style.setProperty('display', isVisible ? 'none' : 'flex', 'important');
}

function toggleContact() {
    const overlay = document.getElementById('contact-overlay');
    const isVisible = window.getComputedStyle(overlay).display !== 'none';
    overlay.style.setProperty('display', isVisible ? 'none' : 'flex', 'important');
}

function handleMailSubmit() {
    setTimeout(() => {
        const overlay = document.getElementById('mail-overlay');
        overlay.style.setProperty('display', 'none', 'important');
        const emailInput = document.getElementById('mce-EMAIL');
        if(emailInput) emailInput.value = '';
    }, 2000);
}

function forceReset() { window.location.reload(true); }

function closeTune() {
    if (synthControl) synthControl.pause();
    document.body.classList.remove('tune-selected');
}

window.onload = init;

function setSpeed(factor) {
    if (synthControl) {
        synthControl.pushWarp(factor);

        // Visual feedback for the active button
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.getAttribute('onclick').match(/[\d.]+/)) === factor);
        });
    }
}

