import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';

const root=process.cwd();
const allowedRoots=['src','public'].map(name=>resolve(root,name)+sep);
const entry=resolve(root,'index.html');
const types={
  '.html':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.ttf':'font/ttf',
  '.png':'image/png',
  '.webp':'image/webp',
  '.mp4':'video/mp4'
};
const server=http.createServer(async (request,response)=>{
  try {
    const path=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=path==='/'?entry:resolve(root,'.'+path);
    if(file!==entry&&!allowedRoots.some(dir=>file.startsWith(dir)))throw new Error('Unknown asset');
    const data=await readFile(file);
    const type=types[extname(file)]||'application/octet-stream';
    const headers={'Content-Type':type,'Content-Length':data.length};
    if(type==='video/mp4'){
      headers['Accept-Ranges']='bytes';
      const range=request.headers.range;
      if(range){
        const match=/^bytes=(\d*)-(\d*)$/.exec(range);
        const start=match?.[1]?Number(match[1]):Math.max(0,data.length-Number(match?.[2]));
        const end=match?.[1]&&match[2]?Math.min(data.length-1,Number(match[2])):data.length-1;
        if(!match||(!match[1]&&!match[2])||start>end||start>=data.length){
          response.writeHead(416,{'Content-Range':'bytes */'+data.length});
          response.end();
          return;
        }
        response.writeHead(206,{...headers,'Content-Length':end-start+1,'Content-Range':'bytes '+start+'-'+end+'/'+data.length});
        response.end(data.subarray(start,end+1));
        return;
      }
    }
    response.writeHead(200,headers);
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
server.listen(5173,'127.0.0.1',()=>console.log('http://127.0.0.1:5173'));
