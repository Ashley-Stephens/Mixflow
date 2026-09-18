const runtimePlayback = {
    currentSongId: null,
    isPlaying: false,
};


const LIKED_STORAGE_KEY = "spoofify-liked-songs";



function loadLikedSongIds() {
    try {
        const raw = localStorage.getItem(LIKED_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.warn("Could not load liked songs from storage", e);
        return [];
    }
}

function saveLikedSongIds(ids) {
    try {
        localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(ids));
    } catch (e) {
        console.warn("Could not save liked songs to storage", e);
    }
}

let likedSongIds = loadLikedSongIds();

function updateVolumeButtonIcon() {
    const activeBtn = document.querySelector(".index-btn.index-btn--playing");
    if (!activeBtn) return;

    const iconSpan = activeBtn.querySelector(".index-btn__playing");
    if (!iconSpan) return;

    if (runtimePlayback.isPlaying) {
        iconSpan.innerHTML =
            '<img src="../img/volume.png" class="icon-btn__img" alt="Volume" />';
    } else {
        iconSpan.textContent = "⏸";
    }
}

const allPlaylists = {};

function getLikedPlaylistId() {
    const pl = playlists?.find(
        (p) => p.name && p.name.trim().toLowerCase() === "liked songs"
    );
    return pl ? pl.id : null;
}

function parseDurationToSeconds(durationStr) {
    if (typeof durationStr === "number") return Math.round(durationStr);
    if (typeof durationStr === "string" && durationStr.includes(":")) {
        const [m, s] = durationStr.split(":").map(Number);
        return (m || 0) * 60 + (s || 0);
    }
    return Math.round(Number(durationStr) || 0);
}

function formatSecondsToTrackDisplay(totalSeconds) {
    const secsTotal = Math.max(0, Math.round(totalSeconds || 0));
    const mins = Math.floor(secsTotal / 60);
    const secs = secsTotal % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatSecondsToDisplay(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);

    // convert to hours + minutes if >= 60 min
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) {
            return `${hours} hr`;
        }
        return `${hours} hr ${mins} min`;
    }

    return `${minutes} min`;
}

// stores all songs the user likes
const likedSongs = [];

//UI helpers

function renderSidebarPlaylists(playlists) {
    const sidebar = document.getElementById("sidebar-playlists");
    if (!sidebar) return;
    if (!Array.isArray(playlists)) return;
    sidebar.innerHTML = "";
    playlists.forEach((pl) => {
        const li = document.createElement("li");
        li.className = "playlist-nav__item";
        if (pl.id === currentPlaylistId) {
            li.classList.add("playlist-nav__item--active");
        }
        li.textContent = pl.name;
        li.dataset.playlistId = pl.id;
        li.addEventListener("click", () => {
            showView("playlist");
            handlePlaylistClick(pl.id);
        });
        sidebar.appendChild(li);
    });
}

function buildQueueForSong(song) {
    const allSongs = allPlaylists[currentPlaylistId] || [];
    const startIndex = allSongs.findIndex((s) => s.id === song.id);
    if (startIndex === -1) {
        return allSongs.map((s) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            storage_key: s.storage_key,
        }));
    }
    const ordered = allSongs
        .slice(startIndex)
        .concat(allSongs.slice(0, startIndex));

    return ordered.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        storage_key: s.storage_key,
    }));
}

// playlist + rows

let currentPlaylistId = null;

async function loadSongsFromDatabase(playlistId) {
    const dbSongs = await listSongs(playlistId);
    const songs = (dbSongs || []).map((s) => {
        const durationSeconds = parseDurationToSeconds(s.duration);
        const id = s.sid;
        const liked = likedSongIds.includes(id);
        return {
            id: s.sid,
            title: s.name.replace(/\.[^/.]+$/, ""),
            artist: "Unknown",
            duration: formatSecondsToTrackDisplay(durationSeconds),
            liked,
            storage_key: s.storage_key,
        };
    });
    allPlaylists[playlistId] = songs;
    songs.forEach((song) => {
        if (song.liked && !likedSongs.find((ls) => ls.id === song.id)) {
            likedSongs.push(song);
        }
    });
}

async function renderPlaylist(playlistId) {
    delete allPlaylists[playlistId];

    currentPlaylistId = playlistId;
    const playlist = playlists.find((p) => p.id === playlistId);

    const isLikedPlaylist = playlist && playlist.name && playlist.name.trim().toLowerCase() === "liked songs";
    let songs;
    if (isLikedPlaylist) {
        songs = likedSongs
            .filter((song, index, self) =>
                likedSongIds.includes(song.id) &&
                self.findIndex(s => s.id === song.id) === index
            );
        allPlaylists[playlistId] = songs;
    } else {
        await loadSongsFromDatabase(playlistId);
        songs = allPlaylists[playlistId] || [];
    }

    // header
    document.getElementById("pl-title").textContent = playlist?.name || "Playlist";
    document.getElementById("pl-count").textContent = `${songs.length} songs`;

    const coverEl = document.getElementById("pl-cover");
    if (coverEl) {
        if (playlist && playlist.cover) {
            coverEl.style.backgroundImage = `url('${playlist.cover}')`;
            coverEl.textContent = "";
        } else {
            coverEl.style.backgroundImage = "";
            coverEl.textContent = "";
        }
    }

    // close any open song 3-dot menus when clicking somewhere else
    document.addEventListener("click", () => {
        document
            .querySelectorAll(".song-more__list--open")
            .forEach((list) => list.classList.remove("song-more__list--open"));
    });

    // sum durations from songs instead of using playlist.totalMinutes
    const totalSeconds = songs.reduce((sum, song) => {
        return sum + parseDurationToSeconds(song.duration);
    }, 0);

    document.getElementById("pl-duration").textContent =
        formatSecondsToDisplay(totalSeconds);

    // table body
    const tbody = document.getElementById("playlist-body");
    tbody.innerHTML = "";
    songs.forEach((song, index) => {
        const tr = document.createElement("tr");
        tr.className = "playlist-row";
        tr.dataset.songId = song.id;
        tr.innerHTML = `
         <td class="playlist-row__index">
            <button class="index-btn" aria-label="Play ${song.title}">
               <span class="index-btn__number">${index + 1}</span>
               <span class="index-btn__play">▶</span>
               <span class="index-btn__playing"><img src="../img/volume.png" class="icon-btn__img" alt="Volume" /></span>
            </button>
         </td>
         <td class="playlist-row__title">${song.title}</td>
         <td class="playlist-row__artist">${song.artist}</td>
         <td class="playlist-row__duration">${song.duration}</td>
         <td class="playlist-row__like">
            <button class="like-btn ${song.liked ? "like-btn--liked" : ""}" aria-label="Like song">
               ${song.liked ? "♥" : "♡"}
            </button>
         </td>
         <td class="playlist-row__options">
            <div class="song-more">
                <button class="song-more__btn" aria-label="Song options">⋮</button>
                <ul class="song-more__list">
                    <li class="song-delete">Delete song</li>
                </ul>
            </div>
         </td>
      `;

        tr.addEventListener("click", () => {
            setActiveRow(tr);
            const indexBtn = tr.querySelector(".index-btn");
            if (indexBtn) setPlayingIndexButton(indexBtn);
            handlePlaySong(song);
        });

        // clicking the index button plays + marks as "playing"
        const indexBtn = tr.querySelector(".index-btn");
        indexBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            setActiveRow(tr);
            setPlayingIndexButton(indexBtn);
            handlePlaySong(song);
        });

        // clicking the heart toggles like
        const likeBtn = tr.querySelector(".like-btn");
        likeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleLike(song, likeBtn);
        });

        const moreBtn = tr.querySelector(".song-more__btn");
        const moreList = tr.querySelector(".song-more__list");
        const deleteItem = tr.querySelector(".song-delete");

        if (moreBtn && moreList && deleteItem) {
            moreBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                document
                    .querySelectorAll(".song-more__list--open")
                    .forEach((list) => {
                        if (list !== moreList) list.classList.remove("song-more__list--open");
                    });

                moreList.classList.toggle("song-more__list--open");
            });

            deleteItem.addEventListener("click", async (e) => {
                e.stopPropagation();
                moreList.classList.remove("song-more__list--open");
                try {
                    await removeSongFromPlaylist(song);
                    delete allPlaylists[currentPlaylistId];
                    await renderPlaylist(currentPlaylistId);
                } catch (err) {
                    console.error("Failed to delete song", err);
                }
            });
        }

        tbody.appendChild(tr);
    });
}

function setActiveRow(rowEl) {
    document
        .querySelectorAll(".playlist-row")
        .forEach((r) => r.classList.remove("playlist-row--active"));
    rowEl.classList.add("playlist-row--active");
}

function setPlayingIndexButton(activeBtn) {
    document
        .querySelectorAll(".index-btn")
        .forEach((btn) => btn.classList.remove("index-btn--playing"));
    activeBtn.classList.add("index-btn--playing");
}
window.onSongChanged = function (song) {
    const row = document.querySelector(`.playlist-row[data-song-id="${song.id}"]`);
    if (!row) return;

    setActiveRow(row);
    const indexBtn = row.querySelector(".index-btn");
    if (indexBtn) {
        setPlayingIndexButton(indexBtn);
    }

    runtimePlayback.currentSongId = song.id;
    runtimePlayback.isPlaying = true;
    updateVolumeButtonIcon();
};

function toggleLike(song, btnEl) {
    song.liked = !song.liked;

    btnEl.textContent = song.liked ? "♥" : "♡";
    btnEl.classList.toggle("like-btn--liked", song.liked);

    const existingIndex = likedSongs.findIndex((s) => s.id === song.id);

    if (song.liked) {
        if (existingIndex === -1) {
            likedSongs.push(song);
        }
        if (!likedSongIds.includes(song.id)) {
            likedSongIds.push(song.id);
        }
    } else {
        if (existingIndex !== -1) {
            likedSongs.splice(existingIndex, 1);
        }
        likedSongIds = likedSongIds.filter((id) => id !== song.id);
    }
    saveLikedSongIds(likedSongIds);
    const likedId = getLikedPlaylistId();
    if (likedId) {
        allPlaylists[likedId] = likedSongs;
        if (currentPlaylistId === likedId) {
            renderPlaylist(likedId);
        }
    }
}

function handlePlaylistClick(playlistId) {
    document
        .querySelectorAll(".playlist-nav__item")
        .forEach((li) => {
            li.classList.toggle(
                "playlist-nav__item--active",
                li.dataset.playlistId === playlistId
            );
        });

    renderPlaylist(playlistId);
}

function toggleRowVolumeIcon(songId) {
    const row = document.querySelector(`.playlist-row[data-song-id="${songId}"]`);
    if (!row) return;
    const iconSpan = row.querySelector(".index-btn__playing");
    if (!iconSpan) return;
    if (runtimePlayback.isPlaying) {
        iconSpan.innerHTML =
            '<img src="../img/volume.png" class="icon-btn__img" alt="Volume" />';
    } else {
        iconSpan.textContent = "⏸";
    }
}


function handlePlaySong(song) {
    if (runtimePlayback.currentSongId === song.id) {
        const audio = getAudioElement();
        if (!audio) return;

        if (runtimePlayback.isPlaying) {
            audio.pause();
            runtimePlayback.isPlaying = false;
        } else {
            audio.play();
            runtimePlayback.isPlaying = true;
        }
        toggleRowVolumeIcon(song.id);
        updateVolumeButtonIcon();
        return;
    }
    recordRecentPlaylist(currentPlaylistId);

    const pl = playlists.find((p) => p.id === currentPlaylistId);
    const cover = pl && pl.cover ? pl.cover : undefined;

    const fullSong = {
        id: song.id,
        title: song.title,
        artist: song.artist,
        cover,
        storage_key: song.storage_key,
    };

    const rawQueue = buildQueueForSong(song);
    const queue = rawQueue.map((s) => ({
        ...s,
        cover,
    }));

    savePlaybackState(fullSong, queue);
    renderNowPlaying(fullSong);
    renderQueue(queue);

    if (fullSong.storage_key) {
        playAudio(fullSong);
    }

    runtimePlayback.currentSongId = song.id;
    runtimePlayback.isPlaying = true;
    //hook real audio play here later
    updateVolumeButtonIcon();
}

function handlePlayPlaylist() {
    const songs = allPlaylists[currentPlaylistId] || [];
    const playlistBeforeShuffle = [...songs];

    const shuffle = getShuffleCallback();
    shuffle(songs);

    if (!songs.length) {
        console.log("No songs in this playlist yet.");
        return;
    }
    const firstSong = songs[0];
    // Update UI- mark first row as active/playing
    const rows = document.querySelectorAll(".playlist-row");
    if (rows.length) {
        const firstRow = rows[playlistBeforeShuffle.indexOf(firstSong)];
        setActiveRow(firstRow);
        const indexBtn = firstRow.querySelector(".index-btn");
        if (indexBtn) {
            setPlayingIndexButton(indexBtn);
        }
    }
    // Reuse existing single-song playback logic
    // backend/audio: later replace this with real audio engine hook for the playlist
    handlePlaySong(firstSong);
}

function setupAddSongMenu() {
    const btn = document.getElementById("btn-add-song");
    const menu = document.getElementById("add-song-menu");
    const addLocalItem = document.getElementById("add-song-local");
    const fileInput = document.getElementById("song-file-input");

    if (!btn || !menu || !addLocalItem || !fileInput) return;

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("add-menu__list--open");
    });

    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
            menu.classList.remove("add-menu__list--open");
        }
    });

    addLocalItem.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.remove("add-menu__list--open");
        fileInput.click();
    });

    fileInput.addEventListener("change", async () => {
        const files = Array.from(fileInput.files || []);
        if (files.length === 0) return;

        console.log("Selected audio files for playlist", currentPlaylistId, files);
        // backend: upload files, create song rows, then refresh this playlist
        try {
            if (typeof addSongToPlaylist === "function") {
                for (const file of files) {
                    await addSongToPlaylist(currentPlaylistId, file);
                }
                delete allPlaylists[currentPlaylistId];
                await renderPlaylist(currentPlaylistId);
            } else {
                console.error("addSongToPlaylist function not found");
            }
        } catch (e) {
            console.error("Failed to add song", e);
        } finally {
            fileInput.value = "";
        }
    });
}

function setupPlaylistCoverUpload() {
    const cover = document.getElementById("pl-cover");
    const fileInput = document.getElementById("pl-cover-input");
    if (!cover || !fileInput) return;
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            cover.style.backgroundImage = `url('${dataUrl}')`;
            cover.textContent = "";
            const pl = playlists.find((p) => p.id === currentPlaylistId);
            if (pl) {
                pl.cover = dataUrl;
                savePlaylists(playlists);
            }
            const playback = loadPlaybackState();
            if (playback && playback.song) {
                const updatedSong = {
                    ...playback.song,
                    cover: dataUrl,
                };
                const updatedQueue = (playback.queue || []).map((s) => ({
                    ...s,
                    cover: dataUrl,
                }));

                savePlaybackState(updatedSong, updatedQueue);
                renderNowPlaying(updatedSong);
                renderQueue(updatedQueue);
            }
            // backend: save cover for this playlist (e.g., upload to storage and store URL)
            console.log("New cover chosen for playlist", currentPlaylistId, file);
        };
        reader.readAsDataURL(file);
    });
    window.openPlaylistCoverPicker = function () {
        fileInput.click();
    };
}

// 3-dot menu
function setupMoreMenu() {
    const btn = document.getElementById("btn-more");
    const list = document.getElementById("more-menu-list");
    if (!btn || !list) return;

    const renameItem = document.getElementById("more-rename");
    const changeCoverItem = document.getElementById("more-change-cover");
    const deleteItem = document.getElementById("more-delete");

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        list.classList.toggle("more-menu__list--open");
    });

    document.addEventListener("click", (e) => {
        if (!list.contains(e.target) && e.target !== btn) {
            list.classList.remove("more-menu__list--open");
        }
    });

    // rename playlist
    renameItem.addEventListener("click", () => {
        const pl = playlists.find((p) => p.id === currentPlaylistId);
        if (!pl) return;
        const titleEl = document.getElementById("pl-title");
        if (!titleEl) return;
        const input = document.createElement("input");
        input.type = "text";
        input.value = pl.name;
        input.className = "playlist-hero__title-input";
        input.id = "pl-title-input";

        titleEl.replaceWith(input);
        input.focus();
        input.select();

        const finish = async (save) => {
            const newNameRaw = input.value.trim();
            const finalName = save && newNameRaw !== "" ? newNameRaw : pl.name;
            if (save && newNameRaw !== "" && finalName !== pl.name) {
                try {
                    const { error } = await supabase
                        .from("playlists")
                        .update({ name: finalName })
                        .eq("pid", currentPlaylistId);

                    if (error) {
                        console.error("Failed to rename playlist in Supabase", error);
                    }
                } catch (e) {
                    console.error("Failed to rename playlist", e);
                }
            }
            pl.name = finalName;
            savePlaylists(playlists);

            const newTitleEl = document.createElement("h2");
            newTitleEl.className = "playlist-hero__title";
            newTitleEl.id = "pl-title";
            newTitleEl.textContent = finalName;
            input.replaceWith(newTitleEl);
            document.querySelectorAll(".playlist-nav__item").forEach((li) => {
                if (li.dataset.playlistId === currentPlaylistId) {
                    li.textContent = finalName;
                }
            });
        };

        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                finish(true);
                list.classList.remove("more-menu__list--open");
            } else if (e.key === "Escape") {
                finish(false);
                list.classList.remove("more-menu__list--open");
            }
        });

        input.addEventListener("blur", () => {
            finish(true);
            list.classList.remove("more-menu__list--open");
        });

    });

    if (changeCoverItem) {
        changeCoverItem.addEventListener("click", () => {
            if (window.openPlaylistCoverPicker) {
                window.openPlaylistCoverPicker();
            }
            list.classList.remove("more-menu__list--open");
        });
    }

    // delete playlist
    deleteItem.addEventListener("click", async () => {
        const pl = playlists.find((p) => p.id === currentPlaylistId);
        if (!pl) return;

        // doesnt allow deleting Liked Songs
        /*if (pl.name && pl.name.trim().toLowerCase() === "liked songs") {
            alert("You can't delete the Liked Songs playlist.");
            list.classList.remove("more-menu__list--open");
            return;
        }*/

        const confirmed = confirm(`Are you sure you want to delete "${pl.name}"?`);
        if (!confirmed) return;

        // Delete from Supabase
        try {
            const { error } = await supabase
                .from("playlists")
                .delete()
                .eq("pid", currentPlaylistId);

            if (error) {
                console.error(error);
                alert("Delete failed");
                return;
            }
        } catch (e) {
            console.error(error);
            alert("Delete failed");
            return;
        }

        const idx = playlists.findIndex((p) => p.id === currentPlaylistId);
        if (idx !== -1) playlists.splice(idx, 1);
        delete allPlaylists[currentPlaylistId];
        savePlaylists(playlists);
        renderSidebarPlaylists(playlists);
        const next = playlists[0];
        if (next) {
            handlePlaylistClick(next.id);
        } else {
            document.getElementById("pl-title").textContent = "No Playlist";
            document.getElementById("pl-count").textContent = "0 songs";
            document.getElementById("pl-duration").textContent = "0 minutes";
            document.getElementById("playlist-body").innerHTML = "";
        }

        list.classList.remove("more-menu__list--open");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadPlaylistsFromDatabase();
    renderSidebarPlaylists(playlists);
    if (playlists.length > 0) {
        const nonLiked = playlists.find(
            (p) => p.name && p.name.trim().toLowerCase() !== "liked songs"
        );
        if (nonLiked) {
            currentPlaylistId = nonLiked.id;
        } else {
            currentPlaylistId = playlists[0].id;
        }

        await renderPlaylist(currentPlaylistId);
    }
    setupMoreMenu();
    setupPlaylistCoverUpload();
    setupAddSongMenu();

    const playback = loadPlaybackState();
    if (playback && playback.song) {
        renderNowPlaying(playback.song);
        if (playback.queue) {
            renderQueue(playback.queue);
        }
        runtimePlayback.currentSongId = playback.song.id;
        runtimePlayback.isPlaying = true;
    } else {
        runtimePlayback.currentSongId = null;
        runtimePlayback.isPlaying = false;
    }
    updateVolumeButtonIcon();

    const playlistPlayBtn = document.getElementById("btn-play-playlist");
    if (playlistPlayBtn) {
        playlistPlayBtn.addEventListener("click", (e) => {
            e.preventDefault();
            handlePlayPlaylist();
        });
    }
});
