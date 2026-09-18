// Initialize Supabase client with environment variables
const supabase = window.supabase.createClient(
    import.meta.env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY
);

// currentPid is globally tracked to know which playlist is open
let currentPid = null;
const $ = (sel) => document.querySelector(sel);

// modal helpers
function openAuthModal() {
    const o = $("#auth-overlay");
    const m = $("#auth-modal");
    if (o) o.style.display = "block";
    if (m) m.style.display = "block";
}

function closeAuthModal() {
    const o = $("#auth-overlay");
    const m = $("#auth-modal");
    if (o) o.style.display = "none";
    if (m) m.style.display = "none";
}

// show it on load
//openAuthModal();


// Database/Auth
async function ensureUsersRow(user) {
    await supabase.from("users").upsert({ id: user.id, email: user.email });
}

async function createPlaylist(name) {
    const user = await supabase.auth.getUser();
    if (!user?.data?.user) {
        if (typeof openAuthModal === "function") {
            openAuthModal();
        }
        console.warn("Cannot create playlist: no signed-in user");
        return null;
    }
    const { data, error } = await supabase
        .from("playlists")
        .insert({ user_id: user.data.user.id, name })
        .select("pid, name")
        .single();
    if (error) {
        console.error(error);
    }

    return data;
}

async function listSongs(pid) {
    let { data } = await supabase
        .from("songs")
        .select("sid, name, storage_key, duration")
        .eq("playlist_id", pid);
    if (!data) {
        ({ data } = await supabase
            .from("songs")
            .select("sid, name, storage_key")
            .eq("playlist_id", pid));
    }
    return data || [];
}

function getFileDurationSeconds(file) {
    return new Promise((resolve) => {
        const audio = new Audio();
        const url = URL.createObjectURL(file);
        audio.preload = "metadata";
        audio.addEventListener("loadedmetadata", () => {
            resolve(Math.round(audio.duration || 0));
            URL.revokeObjectURL(url);
        });
        audio.src = url;
    });
}

async function addSongToPlaylist(pid, file) {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const sid = crypto.randomUUID();
    const durationSeconds = await getFileDurationSeconds(file);
    const storageKey = `${user.id}/playlists/${pid}/${sid}-${file.name.replace(
        /[^\w.\-]+/g,
        "_"
    )}`;
    await supabase.storage.from("audio").upload(storageKey, file);
    const base = {
        sid,
        playlist_id: pid,
        name: file.name,
        storage_key: storageKey,
        last_listened_to: new Date(),
    };
    const { error } = await supabase.from("songs").insert({
        ...base,
        duration: durationSeconds,
    });
    if (error) {
        await supabase.from("songs").insert(base);
    }
}

async function removeSongFromPlaylist(file) {
    await supabase.storage.from("audio").remove([file.storage_key]);
    await supabase.from("songs").delete().eq("storage_key", file.storage_key);
}

async function getSignedAudioUrl(storage_key) {
    const { data, error } = await supabase.storage
        .from("audio")
        .createSignedUrl(storage_key, 1800);
    if (error) {
        console.error(error);

        return null;
    }
    return data.signedUrl;
}

// UI
function setSignedInUI(user) {
    const c = $("#create-playlist-card");
    const p = $("#playlists-card");
    const s = $("#songs-card");
    if (c) c.style.display = user ? "" : "none";
    if (p) p.style.display = user ? "" : "none";
    if (s) s.style.display = user && currentPid ? "" : "none";
}

async function openPlaylist(pid, name) {
    currentPid = pid;
    $("#songs-title").textContent = `Songs — ${name}`;
    $("#songs-card").style.display = "";
    renderSongs();
}

async function renderSongs() {
    $("#songs").innerHTML = "";
    const rows = await listSongs(currentPid);
    if (!rows.length) {
        $("#songs").textContent = "No songs yet.";
        return;
    }
    rows.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s.name + " ";
        const play = document.createElement("button");
        play.textContent = "Play";
        play.onclick = async () => {
            const audio = new Audio(await getSignedAudioUrl(s.storage_key));
            audio.controls = true;
            audio.play();
            li.appendChild(audio);
        };
        li.appendChild(play);
        const remove = document.createElement("button");
        remove.textContent = "Remove";
        remove.onclick = async () => {
            console.log(s);
            remove.disabled = true;
            await removeSongFromPlaylist(currentPid, s);
            await renderSongs();
            remove.disabled = false;
        };
        li.appendChild(remove);
        $("#songs").appendChild(li);
    });
}

//updated sign out handler
document.getElementById("signout")?.addEventListener("click", async (e) => {
    e.preventDefault();

    await supabase.auth.signOut();

    localStorage.removeItem("spoofify-playlists");
    localStorage.removeItem("spoofify-recent-playlists");
    localStorage.removeItem("spoofify-liked-songs");
    localStorage.removeItem("spoofify-current-playback");
    localStorage.removeItem("spoofify-shuffle-key");
    localStorage.removeItem("spoofify-repeat-enabled");

    currentPid = null;
    if (window.playlists) playlists.length = 0;

    if(typeof updateAccountUI == "function")
        updateAccountUI(null);

    window.location.href = "home.html";

});


$("#create-playlist")?.addEventListener("click", async () => {
    await createPlaylist($("#playlist-name").value.trim());
    await listPlaylists();
});

$("#upload")?.addEventListener("click", async () => {
    const file = $("#file").files[0];
    $("#upload").disabled = true;
    await addSongToPlaylist(currentPid, file);
    await renderSongs();
    $("#upload").disabled = false;
});

$("#remove")?.addEventListener("click", async () => {
    const file = await listSongs(currentPid);
    console.log("file " + file.name);
    $("#remove").disabled = true;
    await removeSongFromPlaylist(currentPid, file);
    await renderSongs();
    $("#remove").disabled = false;
});

// close modal
document.getElementById("auth-close")?.addEventListener("click", closeAuthModal);
document.getElementById("auth-overlay")?.addEventListener("click", closeAuthModal);
document.getElementById("auth-guest")?.addEventListener("click", closeAuthModal);

// tab switching
const loginTab = document.getElementById("auth-tab-login");
const signupTab = document.getElementById("auth-tab-signup");
const confirmWrap = document.getElementById("confirm-wrap");

loginTab?.addEventListener("click", () => {
    loginTab.classList.add("auth-tab--active");
    signupTab?.classList.remove("auth-tab--active");
    $("#signin").style.display = "";
    $("#signup").style.display = "none";
    if (confirmWrap) confirmWrap.style.display = "none";
    const err = $("#auth-error");
    if (err) err.style.display = "none";
});

signupTab?.addEventListener("click", () => {
    signupTab.classList.add("auth-tab--active");
    loginTab?.classList.remove("auth-tab--active");
    $("#signin").style.display = "none";
    $("#signup").style.display = "";
    if (confirmWrap) confirmWrap.style.display = "";
});
