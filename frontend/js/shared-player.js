const PLAYBACK_STORAGE_KEY = "spoofify-current-playback";
const REPEAT_STORAGE_KEY = "spoofify-repeat-enabled";

// SAVE / LOAD PLAYBACK
function savePlaybackState(song, queue) {
    const data = { song, queue };
    try {
        localStorage.setItem(PLAYBACK_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn("Could not save playback state", e);
    }
}
function loadPlaybackState() {
    try {
        const raw = localStorage.getItem(PLAYBACK_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        console.warn("Could not read playback state");
        return null;
    }
}

function renderQueue(queue) {
    const container = document.getElementById("queue-list");
    if (!container) return;

    container.innerHTML = "";
    const visible = queue.slice(1, 4);

    visible.filter((song) => song !== null).forEach((song) => {
        const li = document.createElement("li");
        li.className = "queue__item";
        li.innerHTML = `
         <span class="thumb"></span>
         <div class="queue__item-text">
            <span class="queue__title">${song.title}</span>
            <span class="queue__artist">${song.artist}</span>
         </div>
      `;

        const thumb = li.querySelector(".thumb");
        if (song.cover && thumb) {
            thumb.style.backgroundImage = `url('${song.cover}')`;
        }
        li.addEventListener("click", () => handlePlaySong(song));
        container.appendChild(li);
    });
}

function renderNowPlaying(song) {
    const card = document.getElementById("now-playing-card");
    const queueSection = document.querySelector(".queue");
    const playerBar = document.getElementById("player-bar");

    if (!song) {
        if (card) {
            card.style.display = "none";
            card.innerHTML = "";
        }
        if (queueSection) queueSection.style.display = "none";
        if (playerBar) playerBar.classList.remove("player-bar--visible");
        return;
    }

    if (card) {
        const coverStyle = song.cover ? `style="background-image:url('${song.cover}')"` : "";
        card.style.display = "block";
        card.innerHTML = `
         <div class="np-cover" ${coverStyle}></div>
         <p class="np-label">Now Playing</p>
         <h4 class="np-title">${song.title}</h4>
         <p class="np-artist">${song.artist}</p>
      `;
    }

    if (queueSection) queueSection.style.display = "block";
    if (playerBar) playerBar.classList.add("player-bar--visible");
}


function setupShuffleMenu() {
    const icon = document.getElementById("shuffle-icon");
    const list = document.getElementById("shuffle-list");
    const label = document.getElementById("shuffle-label");

    if (!icon || !list || !label) return;

    const current = localStorage.getItem(SHUFFLE_STORAGE_KEY);
    highlightShuffle(current);

    icon.addEventListener("click", (e) => {
        e.stopPropagation();
        list.classList.toggle("shuffle-list--open");
    });

    list.querySelectorAll("li").forEach((li) => {
        li.addEventListener("click", () => {
            const mode = li.dataset.mode;
            localStorage.setItem(SHUFFLE_STORAGE_KEY, mode);
            highlightShuffle(mode);
            list.classList.remove("shuffle-list--open");
        });
    });

    document.addEventListener("click", (e) => {
        if (!list.contains(e.target) && e.target !== icon)
            list.classList.remove("shuffle-list--open");
    });
}

function highlightShuffle(mode) {
    const label = document.getElementById("shuffle-label");
    const list = document.getElementById("shuffle-list");
    const icon = document.getElementById("shuffle-icon");
    if (!label || !list || !icon) return;

    label.textContent = mode === "default" ? "Default" :
        mode === "most" ? "Most Played" :
            mode === "least" ? "Least Played" :
                mode === "none" ? "No Shuffle" :
                    "Shuffle";
    list.querySelectorAll("li").forEach((li) => {
        li.classList.toggle("shuffle-list--selected", li.dataset.mode === mode);
    });

    icon.classList.toggle("icon-btn--active", mode !== "default");
}

// REPEAT
function setupRepeatButton() {
    const btn = document.getElementById("btn-repeat");
    if (!btn) return;

    let enabled = localStorage.getItem(REPEAT_STORAGE_KEY) === "true";
    btn.classList.toggle("icon-btn--active", enabled);

    btn.addEventListener("click", () => {
        enabled = !enabled;
        localStorage.setItem(REPEAT_STORAGE_KEY, enabled ? "true" : "false");
        btn.classList.toggle("icon-btn--active", enabled);
    });
}

let audioElement = null;
let isPlaying = false;

function getAudioElement() {
    if (!audioElement) {
        audioElement = new Audio();
        setupAudioListeners();
    }
    return audioElement;
}

function setupAudioListeners() {
    const audio = audioElement;
    const seekSlider = document.getElementById("seek-slider");
    const volumeSlider = document.getElementById("volume-slider");
    const currentTimeEl = document.getElementById("player-current");
    const totalTimeEl = document.getElementById("player-total");
    const playBtn = document.getElementById("btn-player-play");

    if (!seekSlider || !volumeSlider || !currentTimeEl || !totalTimeEl || !playBtn) {
        console.error("Player UI elements missing, skipping audio listeners setup");
        return;
    }
    audio.addEventListener("timeupdate", () => {
        if (audio.duration && !seekSlider.dataset.seeking) {
            seekSlider.value = (audio.currentTime / audio.duration) * 100;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    });

    audio.addEventListener("loadedmetadata", () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("ended", () => {
        if (localStorage.getItem(REPEAT_STORAGE_KEY) === "true") {
            audio.currentTime = 0;
            audio.play();
        } else {
            stepInQueue(1);
        }
    });

    audio.addEventListener("play", () => {
        isPlaying = true;
        playBtn.textContent = "⏸";
    });

    audio.addEventListener("pause", () => {
        isPlaying = false;
        playBtn.textContent = "▶";
    });

    seekSlider.addEventListener(
        "mousedown",
        () => (seekSlider.dataset.seeking = "true")
    );
    seekSlider.addEventListener(
        "mouseup",
        () => delete seekSlider.dataset.seeking
    );
    seekSlider.addEventListener("input", () => {
        if (audio.duration)
            audio.currentTime = (seekSlider.value / 100) * audio.duration;
    });

    audio.volume = volumeSlider.value / 100;
    volumeSlider.addEventListener(
        "input",
        () => (audio.volume = volumeSlider.value / 100)
    );
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

async function playAudio(song) {
    // Update database for last time song was played
    song.last_listened_to = new Date();
    const { error } = await supabase.from("songs").update({
        last_listened_to: new Date(),
    })
        .eq("sid", song.id);

    if (error) {
        console.error(error);
    }

    const audio = getAudioElement();
    audio.pause();
    audio.currentTime = 0;
    audio.src = "";

    audio.src = await getSignedAudioUrl(song.storage_key);
    audio.load();
    await audio.play();
    isPlaying = true;
}

function togglePlayPause() {
    const audio = getAudioElement();
    if (!audio.src) return;
    isPlaying ? audio.pause() : audio.play();
}

function setupPlayerControls() {
    const prev = document.getElementById("btn-prev");
    const next = document.getElementById("btn-next");
    const play = document.getElementById("btn-player-play");

    if (prev) prev.addEventListener("click", () => stepInQueue(-1));
    if (next) next.addEventListener("click", () => stepInQueue(1));
    if (play) play.addEventListener("click", togglePlayPause);
}

function stepInQueue(offset) {
    const playback = loadPlaybackState();
    if (!playback?.song) return;

    let queue;
    if (playback.queue && playback.queue.length > 0) {
        queue = playback.queue;
    } else {
        queue = [playback.song];
    }
    if (queue.length === 1) return;

    const currentIndex = queue.findIndex((s) => s.id === playback.song.id);
    const newIndex = (currentIndex + offset + queue.length) % queue.length;
    const rotatedQueue = queue.slice(newIndex).concat(queue.slice(0, newIndex));
    const newSong = rotatedQueue[0];

    savePlaybackState(newSong, rotatedQueue);
    renderNowPlaying(newSong);
    renderQueue(rotatedQueue);

    if (newSong.storage_key) playAudio(newSong);
    if (window.onSongChanged) window.onSongChanged(newSong);
}

// RESTORE ON PAGE LOAD
function restorePlaybackBar() {
    const playback = loadPlaybackState();
    if (playback?.song) {
        renderNowPlaying(playback.song);
        renderQueue(playback.queue || []);

        if (playback.song.storage_key) {
            const audio = getAudioElement();
            getSignedAudioUrl(playback.song.storage_key).then(
                (url) => (audio.src = url)
            );
        }
    }

    setupShuffleMenu();
    setupRepeatButton();
    setupPlayerControls();
}
