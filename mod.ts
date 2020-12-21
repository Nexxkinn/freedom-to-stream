import { serve, ServerRequest } from "https://deno.land/std@0.81.0/http/server.ts";


let NUM_CHUNKS = 8;
const s = serve({ port: 8000 });
console.log(`listening at port 8000`);

const videopath = `test_dashinit.mp4`;
const StaticFile = async (req:ServerRequest,filename:string) => {
    const file = await Deno.readFile(`public/${filename}`);
    await req.respond({ body: file });
}

for await (const req of s) {
    //console.log(req.url);
    switch(req.url) {
        case "/" : {
            await StaticFile(req,'index.html'); 
            break;
        }
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
            const hasRange = req.headers.get("start") || req.headers.get("end");
            const start = Number(req.headers.get("start"))
            const end = req.headers.get("end") ? Number(req.headers.get("end")) : filestat.size-1;
            console.log({start,end});
            if (hasRange) {
                //console.log(part);
                const file = Deno.openSync(videopath);
                const chunk = new Uint8Array(end - start + 1);
                file.seekSync(start,Deno.SeekMode.Start);
                file.readSync(chunk);

                const head = new Headers(
                    {
                        'c-start':`${start}`,
                        'c-end':`${end}`,
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