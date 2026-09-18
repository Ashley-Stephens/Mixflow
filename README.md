# Spoofify

A lightweight music playlist manager built with Supabase and vanilla JavaScript. Create playlists, upload audio files, and manage your music collection with intuitive shuffle modes.

## Features

- **User Authentication**: Sign up and sign in with email to manage personal playlists
- **Playlist Management**: Create, organize, and manage multiple playlists
- **Audio Upload**: Upload MP3s and other audio files directly to your playlists
- **Smart Shuffle**: Multiple shuffle algorithms
  - Random shuffle: Standard random playback order
  - Least played: Prioritize songs you haven't heard recently
  - Most played: Boost your favorites
  - No shuffle: Play in upload order
- **Audio Playback**: Built-in player with play and remove controls
- **Responsive Design**: Works across desktop and mobile browsers

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Storage**: Supabase Storage for audio files
- **No build step required**: Runs directly in the browser

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account

### Setup

1. Clone the repository
2. Create a Supabase project at https://supabase.com
3. Set up environment variables in your build process:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
   Or for Create React App:
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key
   ```

4. Configure Supabase tables:
   - `users` (id, email)
   - `playlists` (pid, user_id, name)
   - `songs` (sid, playlist_id, name, storage_key, duration, last_listened_to)

5. Open `index.html` in your browser or serve via a local server

## Project Structure

```
Spoofify/
├── frontend/
│   ├── css/         - Styling
│   ├── html/        - HTML templates
│   ├── js/          - JavaScript modules
│   │   ├── main.js          - UI rendering
│   │   ├── playlist.js      - Playlist logic
│   │   ├── shared-player.js - Audio player
│   │   ├── shared-playlists.js - Playlist management
│   │   └── shuffle.js       - Shuffle algorithms
│   └── img/         - Assets
├── backend/
│   ├── database.js  - Database and auth functions
│   └── script.js    - Shuffle utilities
├── docs/            - Architecture and design docs
├── index.html       - Main entry point
├── script.js        - Root-level auth handler
└── README.md        - This file
```

## Usage

1. **Sign Up**: Create an account with your email
2. **Create Playlist**: Click the "+" button to add a new playlist
3. **Upload Songs**: Select a playlist and upload audio files
4. **Shuffle**: Use the shuffle dropdown to choose your preferred play order
5. **Listen**: Click play on any song to start playback
6. **Sign Out**: Clear your session and saved preferences

## Environment Variables

Set these before running:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Or for development, add to a `.env` file and use your bundler of choice.

## Architecture

- **Stateless Frontend**: All state lives in Supabase
- **Client-Side Rendering**: No server-side templates
- **Real-time Sync**: Leverages Supabase real-time capabilities
- **Modular JS**: Separated concerns (UI, data, player, shuffle logic)

## License

MIT

## Notes

- Audio files are stored in Supabase Storage with automatic expiring signed URLs
- Shuffle algorithms consider play history for smarter recommendations
- Local storage caches user preferences for offline UX
