// js/shared-playlists.js: central storage + playlist management

const PLAYLISTS_STORAGE_KEY = "spoofify-playlists";
const RECENT_PLAYLISTS_KEY = "spoofify-recent-playlists";
const MAX_RECENT_PLAYLISTS = 5;
const DEFAULT_PLAYLIST_COVER = "../img/default_cover.jpg";

const LIKED_PLAYLIST_NAME = "Liked Songs";

/*const defaultPlaylists = [
  { id: "pl-liked", name: "Liked Songs", cover: DEFAULT_PLAYLIST_COVER },
];*/

function loadRecentPlaylists() {
  try {
    const raw = localStorage.getItem(RECENT_PLAYLISTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Could not load recent playlists", e);
    return [];
  }
}

function saveRecentPlaylists(list) {
  try {
    localStorage.setItem(RECENT_PLAYLISTS_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not save recent playlists", e);
  }
}

function recordRecentPlaylist(playlistId) {
  if (!playlistId) return;

  const existing = loadRecentPlaylists();
  const without = existing.filter((id) => id !== playlistId);
  without.unshift(playlistId);
  const limited = without.slice(0, MAX_RECENT_PLAYLISTS);
  saveRecentPlaylists(limited);
}

function loadPlaylists() {
  try {
    const raw = localStorage.getItem(PLAYLISTS_STORAGE_KEY);
    if(!raw)
      return [];
    return JSON.parse(raw);
    /*if (!raw) {
      return [...defaultPlaylists];
    }
    const parsed = JSON.parse(raw);

    return parsed.map((pl) => ({
      ...pl,
      cover: pl.cover || DEFAULT_PLAYLIST_COVER,
    }));
  } catch (e) {
    console.error("Could not load playlists :(", e);
  }*/
  } catch (e) {
    console.error("Could not load playlists", e);
    return [];
  }
}

function savePlaylists(list) {
  try {
    localStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Could not save playlists", e);
  }
}

async function ensureLikedPlaylistExists() {
  const {data: {user} } = await supabase.auth.getUser();

  if(!user)
    return;

  const {data: dbPlaylists, error} = await supabase
    .from("playlists")
    .select("pid, name")
    .eq("user_id", user.id);

  if(error){
    console.error(error);
    return;
  }

  const existsInDB = dbPlaylists.some( 
    p => p.name.trim().toLowerCase() === "liked songs"
  );

  if(existsInDB)
    return;

  const newPlaylist = await createPlaylist(LIKED_PLAYLIST_NAME);

  if(newPlaylist?.pid){
    playlists.push({
      id: newPlaylist.pid,
      name: newPlaylist.name,
      cover: DEFAULT_PLAYLIST_COVER,
    });
  }
  savePlaylists(playlists);
  renderSidebarPlaylists(playlists);
}

// this is the shared in-memory list everyone uses
let playlists = loadPlaylists();

async function loadPlaylistsFromDatabase() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("playlists")
    .select("pid, name")
    .eq("user_id", user.id);

  if (error) {
    console.error(error);
  }

  const local = JSON.parse(localStorage.getItem(PLAYLISTS_STORAGE_KEY)) || [];
  playlists = data.map((p) => {
    const localMatch = local.find((lp) => lp.id === p.pid);
    return {
      id: p.pid,
      name: p.name,
      cover: localMatch?.cover || DEFAULT_PLAYLIST_COVER,
    };
  });
  await ensureLikedPlaylistExists();
  savePlaylists(playlists);
  
}

async function handleAddPlaylist(options = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    if (typeof openAuthModal === "function") {
      openAuthModal();
    }
    alert("Please sign in to create a playlist.");
    return;
  }

  const name = prompt("New playlist name:");
  if (!name || !name.trim()) return;

  const trimmed = name.trim();

  if (trimmed.toLowerCase() === "liked songs") {
    alert(
      'The "Liked Songs" playlist is reserved. Please choose a different name.'
    );
    return;
  }
  const newPlaylist = await createPlaylist(trimmed);
  if (newPlaylist && newPlaylist.pid) {
    playlists.push({
      id: newPlaylist.pid,
      name: newPlaylist.name,
      cover: DEFAULT_PLAYLIST_COVER,
    });
    savePlaylists(playlists);
    renderSidebarPlaylists?.(playlists);
    refreshHomeSections?.();
    updateHomeEmptyState();
  }
}

function initBrandBounce() {
  const logo = document.querySelector(".avatar--logo");
  const brandLink = document.querySelector(".brand");
  if (!logo || !brandLink) return;

  const bounceAndGoHome = (e) => {
    e.preventDefault();

    logo.classList.remove("logo-bounce");
    void logo.offsetWidth;
    logo.classList.add("logo-bounce");

    setTimeout(() => {
      showView("home");
    }, 350);
  };

  logo.addEventListener("click", bounceAndGoHome);
  brandLink.addEventListener("click", bounceAndGoHome);
}

function initVolumeIcon() {
  const volumeBtn = document.getElementById("btn-volume");
  const volumeImg = volumeBtn?.querySelector("img");
  const volumeSlider = document.getElementById("volume-slider");
  if (!volumeImg || !volumeSlider) return;

  const updateVolumeIcon = () => {
    if (volumeSlider.value === "0") {
      volumeImg.src = "../img/volume_mute.png";
    } else {
      volumeImg.src = "../img/volume.png";
    }
  };

  volumeSlider.addEventListener("input", updateVolumeIcon);
  updateVolumeIcon();
}

document.addEventListener("DOMContentLoaded", () => {
  initBrandBounce();
  initVolumeIcon();
  const accountLink = document.getElementById("account-link");
  if (!accountLink) return;

  accountLink.addEventListener("click", (e) => {
    e.preventDefault();
    const isHome =
      window.location.pathname.endsWith("home.html") ||
      window.location.pathname === "/" ||
      window.location.pathname === "";

    if (isHome) {
      const overlay = document.getElementById("auth-overlay");
      const modal = document.getElementById("auth-modal");
      if (overlay && modal) {
        overlay.style.display = "block";
        modal.style.display = "block";
      }
    } else {
      window.location.href = "home.html#auth";
    }
  });
});
