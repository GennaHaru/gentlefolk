let currentFontSize = 1.15;
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let favoritesOnlyMode = false;
let allSongsData = []; // Store the full tagged objects here

function applySettings() {
    const savedAlignment = localStorage.getItem('alignment');
    const savedTheme = localStorage.getItem('theme');

    if (savedAlignment === 'center') {
        document.getElementById('toc').classList.add('center-align');
        document.getElementById('songbook').classList.add('center-align');
    }
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function toggleOptions() {
    const menu = document.getElementById('options-menu');
    menu.style.display = (menu.style.display === 'none' || menu.style.display === '') ? 'flex' : 'none';
}

function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

function toggleAlignment() {
    const toc = document.getElementById('toc');
    const songbook = document.getElementById('songbook');
    const isCentered = toc.classList.toggle('center-align');
    songbook.classList.toggle('center-align');
    localStorage.setItem('alignment', isCentered ? 'center' : 'left');
}

// --- FAVORITES LOGIC ---

function toggleFavorite(songId, event) {
    event.preventDefault();
    const index = favorites.indexOf(songId);

    if (index === -1) {
        favorites.push(songId);
    } else {
        favorites.splice(index, 1);
    }

    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateHeartUI(songId);
    if (favoritesOnlyMode) filterSongs();
}

function updateHeartUI(songId) {
    const isFav = favorites.includes(songId);
    const mainHeart = document.querySelector(`.song-chunk[id="${songId}"] .fav-btn`);
    if (mainHeart) {
        mainHeart.innerHTML = isFav ? '❤️' : '🤍';
        mainHeart.className = `fav-btn ${isFav ? 'heart-full' : 'heart-empty'}`;
    }
    const tocLink = document.querySelector(`#toc a[href="#${songId}"]`);
    if (tocLink) {
        tocLink.parentElement.classList.toggle('is-favorite', isFav);
    }
}

function toggleFavoritesFilter() {
    favoritesOnlyMode = !favoritesOnlyMode;
    const btn = document.getElementById('fav-filter-btn');
    btn.style.backgroundColor = favoritesOnlyMode ? '#e74c3c' : '';
    btn.style.color = favoritesOnlyMode ? 'white' : '';
    filterSongs();
}

function clearAllFavorites() {
    if (confirm("Are you sure you want to clear all favorites?")) {
        favorites = [];
        localStorage.setItem('favorites', JSON.stringify(favorites));
        location.reload();
    }
}

// --- UPDATED LOAD & FILTER ---

async function loadSongs() {
    const toc = document.getElementById('toc');
    const main = document.getElementById('songbook');

    applySettings();

    try {
        // Change: Fetching the tagged version
        const response = await fetch('songs_tagged.json');
        allSongsData = await response.json();

        let tocHtml = '<ul>';
        let currentLetter = '';

        // Generate Table of Contents with Tags
        allSongsData.forEach(songObj => {
            const song = songObj.title;
            const id = song.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const isFav = favorites.includes(id);

            let cleanTitle = song.toLowerCase().startsWith("the ") ? song.substring(4) : song;
            if (cleanTitle.startsWith("(")) {
                const endBracket = cleanTitle.indexOf(")");
                if (endBracket !== -1) cleanTitle = cleanTitle.substring(endBracket + 1).trim();
            }
            const firstChar = cleanTitle.charAt(0).toUpperCase();

            if (firstChar !== currentLetter) {
                currentLetter = firstChar;
                tocHtml += `<li class="toc-letter-header">${currentLetter}</li>`;
            }

            // Generate tag labels for the TOC
            const tagLabels = songObj.tags.map(t => `<span class="toc-tag">${t}</span>`).join('');

            tocHtml += `<li class="${isFav ? 'is-favorite' : ''}" data-tags='${JSON.stringify(songObj.tags)}'>
                <a href="#${id}">${song}</a>${tagLabels}<span class="toc-heart"> ❤️</span>
            </li>`;
        });
        toc.innerHTML = tocHtml + '</ul>';

        // Load Lyrics
        const songPromises = allSongsData.map(async (songObj) => {
            const song = songObj.title;
            const id = song.toLowerCase().replace(/[^a-z0-9]/g, '-');
            try {
                const res = await fetch(`songs/${encodeURIComponent(song)}.txt`);
                const text = await res.text();
                const lines = text.split('\n');
                const body = lines[0].startsWith("Title:") ? lines.slice(1).join('\n') : text;
                const formatted = body.trim().replace(/\*\*(.*?)\*\*/gs, '<b>$1</b>');
                return { id, title: song, lyrics: formatted, tags: songObj.tags };
            } catch (err) {
                return { id, title: song, lyrics: "Error loading lyrics.", tags: [] };
            }
        });

        const renderedSongs = await Promise.all(songPromises);

        main.innerHTML = `<div id="empty-fav-message">Press the ❤️ emoji on any song to save it to this list.</div>` +
        renderedSongs.map(s => {
            const isFav = favorites.includes(s.id);
            return `
                <section class="song-chunk" id="${s.id}" data-tags='${JSON.stringify(s.tags)}'>
                    <h1>${s.title} <button class="fav-btn ${isFav ? 'heart-full' : 'heart-empty'}" onclick="toggleFavorite('${s.id}', event)">${isFav ? '❤️' : '🤍'}</button></h1>
                    <div class="lyrics">${s.lyrics}</div>
                    <a href="#songSearch" class="back-to-top">↑ Back to table of contents</a>
                </section>
            `
        }).join('');

    } catch (e) {
        toc.innerHTML = `<p style="color:red;">Error: ${e.message}</p>`;
    }
}

function filterSongs() {
    const query = document.getElementById('songSearch').value.toLowerCase();
    const selectedTag = document.getElementById('tagFilter').value;
    const tocItems = document.querySelectorAll('#toc li');
    const sections = document.querySelectorAll('.song-chunk');
    const emptyMsg = document.getElementById('empty-fav-message');

    let visibleCount = 0;

    sections.forEach(s => {
        const title = s.querySelector('h1').textContent.toLowerCase();
        const isFav = favorites.includes(s.id);
        const songTags = JSON.parse(s.getAttribute('data-tags') || '[]');

        const matchesSearch = title.includes(query);
        const matchesTag = selectedTag === "" || songTags.includes(selectedTag);
        const matchesFavFilter = !favoritesOnlyMode || isFav;

        if (matchesSearch && matchesTag && matchesFavFilter) {
            s.style.display = 'block';
            visibleCount++;
        } else {
            s.style.display = 'none';
        }
    });

    // Update TOC display
    tocItems.forEach(li => {
        if (li.classList.contains('toc-letter-header')) {
            // Hide letter headers if any filter is active
            li.style.display = (query === '' && selectedTag === '' && !favoritesOnlyMode) ? '' : 'none';
        } else {
            const title = li.textContent.toLowerCase();
            const id = li.querySelector('a')?.getAttribute('href').substring(1);
            const isFav = favorites.includes(id);
            const songTags = JSON.parse(li.getAttribute('data-tags') || '[]');

            const matchesSearch = title.includes(query);
            const matchesTag = selectedTag === "" || songTags.includes(selectedTag);
            const matchesFavFilter = !favoritesOnlyMode || isFav;

            li.style.display = (matchesSearch && matchesTag && matchesFavFilter) ? '' : 'none';
        }
    });

    if (favoritesOnlyMode && visibleCount === 0 && query === '' && selectedTag === '') {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
    }
}

function changeFontSize(delta) {
    currentFontSize += delta * 0.1;
    const elementsToScale = document.querySelectorAll('.lyrics, #toc li');
    elementsToScale.forEach(el => {
        el.style.fontSize = currentFontSize + 'em';
    });
}

function getRandomSong() {
    const sections = Array.from(document.querySelectorAll('.song-chunk')).filter(s => s.style.display !== 'none');
    if (sections.length === 0) return;
    const randomIndex = Math.floor(Math.random() * sections.length);
    const target = sections[randomIndex];
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.song-chunk').forEach(s => s.classList.remove('highlight-target'));
    target.classList.add('highlight-target');
    toggleOptions();
}

window.onload = loadSongs;

function openQR() {
    document.getElementById('qr-modal').classList.add('open');
    toggleOptions(); // closes the options menu
}
function closeQR() {
    document.getElementById('qr-modal').classList.remove('open');
}


function openFAQ() {
    document.getElementById('faq-modal').classList.add('open');
    toggleOptions();
}
function closeFAQ() {
    document.getElementById('faq-modal').classList.remove('open');
}
