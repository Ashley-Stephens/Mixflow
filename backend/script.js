const SHUFFLE_STORAGE_KEY = "spoofify-shuffle-key";

const randomShuffle = (songs) => {
    for (let i = songs.length - 1; i >= 0; i--) {
        const rand_index = Math.floor(Math.random() * (i + 1));
        const temp = songs[i];
        songs[i] = songs[rand_index];
        songs[rand_index] = temp;
    }
};

const leastPlayedShuffle = (songs) => {
    songs.sort((a, b) => {
        const lastA = a.last_listened_to ? new Date(a.last_listened_to).getTime() : 0;
        const lastB = b.last_listened_to ? new Date(b.last_listened_to).getTime() : 0;

        return lastA - lastB;
    });
};

const mostPlayedShuffle = (songs) => {
    songs.sort((a, b) => {
        const lastA = a.last_listened_to ? new Date(a.last_listened_to).getTime() : 0;
        const lastB = b.last_listened_to ? new Date(b.last_listened_to).getTime() : 0;

        return lastB - lastA;
    });
};

const noShuffle = (songs) => { /* no-op */ };

const SHUFFLE_DICT = {
    "default": randomShuffle,
    "most": mostPlayedShuffle,
    "least": leastPlayedShuffle,
    "none": noShuffle,
};

const setShuffleMode = (mode) => {
    localStorage.setItem(SHUFFLE_STORAGE_KEY, mode);
};

const getShuffleMode = () => {
    return localStorage.getItem(SHUFFLE_STORAGE_KEY);
}

const getShuffleCallback = () => {
    const mode = getShuffleMode();
    const shuffleFn = SHUFFLE_DICT[mode];

    if(typeof shuffleFn !== "function"){
        //default if user never selects shuffle mode
        return randomShuffle;
    }
    return shuffleFn;
};
