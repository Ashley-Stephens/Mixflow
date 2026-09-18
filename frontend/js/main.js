// --- fake data for now (backend will replace) ---
const mockPlaylists = [
   { id: "pl1", name: "Gym Playlist", songCount: 12 },
   { id: "pl2", name: "Rock", songCount: 8 },
   { id: "pl3", name: "This Should Be Alphabetical", songCount: 20 },
   { id: "pl4", name: "Your Liked Playlist", songCount: 15 },
   { id: "pl5", name: "Morning", songCount: 6 },
];

const mockRecentPlaylists = [
   { id: "pl1", name: "Gym Playlist" },
   { id: "pl2", name: "Rock" },
   { id: "pl4", name: "Your Liked Playlist" },
];

const mockRecentArtists = [
   { id: "ar1", name: "Cool Guy" },
   { id: "ar2", name: "Person" },
   { id: "ar3", name: "Another Artist" },
];

const mockSuggested = [
   { id: "s1", title: "A Songer Name", artist: "Cool Guy", duration: "4:58" },
   { id: "s2", title: "Could Be A Song", artist: "Person", duration: "3:40" },
   { id: "s3", title: "Super Long Song Name", artist: "Person", duration: "3:12" },
];

const mockQueue = [
   { id: "s1", title: "Song Name", artist: "Artist Name" },
   { id: "s2", title: "Another Song", artist: "Artist B" },
   { id: "s3", title: "Third Song", artist: "Artist C" },
];

// render helpers (frontend)
function renderSidebarPlaylists(playlists) {
   const sidebar = document.getElementById("sidebar-playlists");
   sidebar.innerHTML = "";
   for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];
      const item = document.createElement("li");
      item.classList.add("playlist-nav__item");
      if (i === 0) {
         item.classList.add("playlist-nav__item--active");
      }
      item.textContent = playlist.name;
      item.dataset.playlistId = playlist.id;
      item.addEventListener("click", function () {
         handlePlaylistClick(playlist.id);
      });
      sidebar.appendChild(item);
   }
}


function renderCards(containerId, items, isArtist = false) {
   const container = document.getElementById(containerId);
   container.innerHTML = "";
   items.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
         <div class="card__cover"></div>
         <div class="card__label">${item.name || item.title}</div>
      `;
      card.addEventListener("click", () => {
         if (!isArtist) {
            handlePlaySong(item);
         } else {
            console.log("Artist clicked:", item);
         }
      });
      container.appendChild(card);
   });
}

function renderQueue(queue) {
   const container = document.getElementById("queue-list");
   container.innerHTML = "";
   queue.forEach(song => {
      const li = document.createElement("li");
      li.className = "queue__item";
      li.innerHTML = `
         <span class="thumb"></span>
         <div><b>${song.title}</b><br><small>${song.artist}</small></div>
      `;
      li.addEventListener("click", () => handlePlaySong(song));
      container.appendChild(li);
   });
}

function renderNowPlaying(song) {
   const card = document.getElementById("now-playing-card");
   if (!song) {
      card.innerHTML = "";
      card.style.display = "none";
      return;
   }
   card.style.display = "block";
   card.innerHTML = `
      <div class="np-cover"></div>
      <p class="np-label">Now Playing</p>
      <h4 class="np-title">${song.title || song.name}</h4>
      <p class="np-artist">${song.artist || "Unknown Artist"}</p>
   `;
}

// stub handlers (backend will replace)
function handlePlaylistClick(playlistId) {
   console.log("Fetch songs for playlist:", playlistId);
   // backend: fetch playlist songs and queue
}

function handlePlaySong(songObj) {
   console.log("Play song:", songObj);
   renderNowPlaying(songObj);
   // backend: call audio playback API here
}

function handleAddPlaylist() {
   console.log("Add new playlist");
   // backend: create playlist in db, then re-fetch playlists
}

// when page is one loading, display all the fake data
document.addEventListener("DOMContentLoaded", () => {
   renderSidebarPlaylists(mockPlaylists);
   renderCards("recent-playlists", mockRecentPlaylists);
   renderCards("recent-artists", mockRecentArtists, true);
   renderCards("suggested-songs", mockSuggested);
   renderQueue(mockQueue);

   const addBtn = document.getElementById("btn-add-playlist");
   addBtn.addEventListener("click", handleAddPlaylist);
});
