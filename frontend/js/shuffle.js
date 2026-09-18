function renderSidebarPlaylists(playlists) {
    const sidebar = document.getElementById("sidebar-playlists");
    if (!sidebar) return;
    sidebar.innerHTML = "";
    playlists.forEach((pl, index) => {
        const li = document.createElement("li");
        li.className = "playlist-nav__item";
        li.textContent = pl.name;
        li.dataset.playlistId = pl.id;
        li.addEventListener("click", () => {
            window.location.href = `playlist.html?pid=${pl.id}`;
        });
        sidebar.appendChild(li);
    });
}

function updateShuffleUI(mode) {
    document.querySelectorAll(".shuffle-card").forEach((card) => {
        const btn = card.querySelector(".shuffle-card__btn");
        const isActive = card.dataset.mode === mode;
        if (!btn) return;
        btn.textContent = isActive ? "Selected" : "Select";
        btn.classList.toggle("shuffle-card__btn--active", isActive);
    });
    highlightShuffle(mode);
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadPlaylistsFromDatabase();
    renderSidebarPlaylists(playlists);
    const addBtn = document.getElementById("btn-add-playlist");
    if (addBtn) addBtn.addEventListener("click", () => handleAddPlaylist());
    const current = localStorage.getItem(SHUFFLE_STORAGE_KEY);
    updateShuffleUI(current);
    document.querySelectorAll(".shuffle-card").forEach((card) => {
        const mode = card.dataset.mode;
        const btn = card.querySelector(".shuffle-card__btn");
        btn.addEventListener("click", () => {
            setShuffleMode(mode);
            updateShuffleUI(mode);
        });
    });
});
