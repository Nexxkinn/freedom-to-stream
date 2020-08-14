import { serve, ServerRequest } from "https://deno.land/std@0.64.0/http/server.ts";
//import { } from "https://deno.land/std@0.64.0/fs/mod.ts";


let NUM_CHUNKS = 8;
const s = serve({ port: 8000 });
console.log(`listening at 8000`);

const videopath = `video_fragment.mp4`;
const StaticFile = async (req:ServerRequest,filename:string) => {
    const file = await Deno.readFile(`client/${filename}`);
    await req.respond({ body: file });
}

for await (const req of s) {
    console.log(req.url);
    switch(req.url) {
        case "/" : await StaticFile(req,'index.html'); break;
        // case "/favicon.ico" : await StaticFile(req,'favicon.ico'); break;
        case "/video.js": await StaticFile(req,'video.js'); break;
        case "/video" : {
            const filestat = await Deno.stat(videopath);
            if(req.method === 'HEAD') {

                await req.respond( { 
                    status:200,
                    headers: new Headers({ 'clen':String(filestat.size) })
                });
                break;
            }
            const range = req.headers.get("Range") || "";
            const parts = range.replace(/bytes=/, "").split("-")
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10): filestat.size-1
            console.log({range,start,end});
            if (range) {
                //console.log(part);
                const file = Deno.openSync(videopath);
                const chunk = new Uint8Array(end - start + 1);
                file.seekSync(start,Deno.SeekMode.Start);
                file.readSync(chunk);

                const head = new Headers(
                    {
                        'Content-Range': `bytes ${start}-${end}/${filestat.size}`,
                        'Content-Length': `${chunk.byteLength}`,
                        'Content-Type': 'video/mp4',
                    }
                )
                await req.respond({
                    headers: head,
                    status: 200,
                    body:chunk
                })
            }
            else {
                console.log("403 forbidden");
                await req.respond( { status:403 })
            }
            break;
        }
        default:
            await req.respond({status:404});
    }
}