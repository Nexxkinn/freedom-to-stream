// basic MSE implementation
'use strict';

const mediaSource = new MediaSource();

const assetURL = "/video";
const chunk_total = 8;
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

function onMediaSourceOpen() {
    sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.4D401E, mp4a.40.2"');

    getFileStat(assetURL,(clen)=> {
        console.log((clen / 1024 / 1024).toFixed(2), 'MB')
        chunk_size = Math.ceil(clen / chunk_total);
        fetchChunk(assetURL, 0, chunk_size - 1, appendChunk);
        chunk_stat[0]=true
    })
}

function appendChunk(buff) {
    sourceBuffer.appendBuffer(new Uint8Array(buff));
}

function checkBuffer () {
    const curr_chunk = Math.ceil(video.currentTime/chunk_dur);
    if(curr_chunk === chunk_total) {
        console.log("reach end of stream.")
        mediaSource.endOfStream();
        video.ontimeupdate -= checkBuffer;
        return;
    }
    const shouldfetch = video.currentTime > chunk_dur * curr_chunk * 0.6 && !chunk_stat[curr_chunk];

    if (!shouldfetch) return;
    chunk_stat[curr_chunk] = true;
    const start = chunk_size * curr_chunk;
    const end   = start + chunk_size - 1;
    fetchChunk(assetURL,start,end,appendChunk);
  };

function getFileStat(url,callback){
    const xhr = new XMLHttpRequest();
    xhr.open('HEAD', url);
    xhr.onload = () => callback(xhr.getResponseHeader("clen"));
    xhr.send();
}

function fetchChunk(url,start,end, callback) {

    const xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'arraybuffer';
    xhr.setRequestHeader("Range",`bytes=${start}-${end}`);
    xhr.onload = (e) => {
        console.log(`Downloaded range ${start}-${end}. Status ${xhr.status}`);
        callback(e.target.response);
    };
    xhr.send();
}

initialize()