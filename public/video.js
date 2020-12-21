// basic MSE implementation
'use strict';

const mediaSource = new MediaSource();

const assetURL = "/video";
const chunk_total = 12;
let chunk_size = 0;
let chunk_dur  = 0;
let chunk_stat = [];
let sourceBuffer;
let video;

function initialize() {
    
    video = document.querySelector('video');
    video.src = window.URL.createObjectURL(mediaSource);
    video.ontimeupdate = checkBuffer;
    video.onplay  = () => chunk_dur = video.duration / chunk_total;
    video.onerror = () => console.log("Error " + video.error.code + "; details: " + video.error.message);

    for(let i = 0; i < chunk_total; i++) chunk_stat.push(false);
    mediaSource.addEventListener('sourceopen', onMediaSourceOpen);
}

async function onMediaSourceOpen() {
    // other variant : video/mp4; codecs="avc1.64001F,mp4a.40.2
    sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64001F"');

    const head = await fetch( assetURL, { method:'HEAD' } )
    const clen = head.headers.get("clen");
    
    console.log((clen / 1024 / 1024).toFixed(2), 'MB')

    chunk_size  = Math.ceil( clen / chunk_total );
    const chunk = await fetchChunk(assetURL, 0, chunk_size - 1);
    sourceBuffer.appendBuffer(chunk);
    chunk_stat[0] = true
}

async function checkBuffer () {
    const curr_chunk = Math.ceil(video.currentTime/chunk_dur);
    if(curr_chunk === chunk_total) {
        console.log("reach end of stream.")
        mediaSource.endOfStream();
        video.ontimeupdate -= checkBuffer;
        return;
    }
    const shouldfetch = video.currentTime > chunk_dur * curr_chunk * 0.4 && !chunk_stat[curr_chunk];

    if (!shouldfetch) return;
    chunk_stat[curr_chunk] = true;
    const start = chunk_size * curr_chunk;
    const end   = start + chunk_size - 1;
    const chunk = await fetchChunk(assetURL,start,end);
    sourceBuffer.appendBuffer(chunk);
};

async function fetchChunk(url,start,end) {
    const res = await fetch(
        url,
        {
            method: 'GET',
            headers: { start,end }
        }
    )

    console.log(`Downloaded range ${start}-${end}. Status ${res.status}`);
    return await res.arrayBuffer();
}

initialize()