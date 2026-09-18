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
openAuthModal();


// Database/Auth
async function ensureUsersRow(user) {
  await supabase.from("users").upsert({ id: user.id, email: user.email });
}

async function createPlaylist(name) {
  const user = await supabase.auth.getUser();
  const { data } = await supabase
    .from("playlists")
    .insert({ user_id: user.data.user.id, name })
    .select("pid, name")
    .single();
  return data;
}

async function listSongs(pid) {
  const { data } = await supabase
    .from("songs")
    .select("sid, name, storage_key")
    .eq("playlist_id", pid);
  return data || [];
}

async function addSongToPlaylist(pid, file) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sid = crypto.randomUUID();
  const storageKey = `${user.id}/playlists/${pid}/${sid}-${file.name.replace(
    /[^\w.\-]+/g,
    "_"
  )}`;
  await supabase.storage.from("audio").upload(storageKey, file);
  await supabase.from("songs").insert({
    sid,
    playlist_id: pid,
    name: file.name,
    storage_key: storageKey,
  });
}

async function getSignedAudioUrl(storage_key) {
  const { data } = await supabase.storage
    .from("audio")
    .createSignedUrl(storage_key, 1800);
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

async function listPlaylists() {
  const { data } = await supabase.from("playlists").select("pid, name");
  $("#playlists").innerHTML = "";
  if (!data?.length) {
    $("#playlists").textContent = "No playlists yet.";
    return;
  }
  data.forEach((p) => {
    const btn = document.createElement("button");
    btn.textContent = p.name;
    btn.onclick = () => openPlaylist(p.pid, p.name);
    $("#playlists").appendChild(btn);
  });
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
    $("#songs").appendChild(li);
  });
}

// Event handlers
$("#signup")?.addEventListener("click", async () => {
  const email = $("#email").value.trim();
  const pw = $("#password").value;
  const pw2 = $("#password-confirm")?.value;

  if (pw2 !== undefined && pw !== pw2) {
    const err = $("#auth-error");
    if (err) err.style.display = "block";
    return;
  } else {
    const err = $("#auth-error");
    if (err) err.style.display = "none";
  }
  await supabase.auth.signUp({ email, password: pw });
  alert("Sign-up successful. Please check your email for confirmation.");
});

$("#signin")?.addEventListener("click", async () => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#password").value,
  });
  if (error) {
    alert(error.message);
    return;
  }
  await ensureUsersRow(data.user);
  setSignedInUI(data.user);
  listPlaylists();
  closeAuthModal();
});

$("#signout")?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  currentPid = null;
  setSignedInUI(null);
  $("#playlists").innerHTML = "";
  $("#songs").innerHTML = "";
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


//ADDED:
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
