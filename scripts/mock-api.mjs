// Mock of /api/scores for local development (npm run dev:api): fake top lists, accepts any POST.
import { createServer } from 'node:http';
const games = ['riverraid','endurance','seaquest','pacman','freeway','pitfall','frostbite','hero','asteroids','keystone','missile','frogger','chopper','moonpatrol','donkeykong','goldenaxe','streetsofrage','virtuaracing','cometa','lume'];
createServer((req, res) => {
  // dev helper: POST /api/dump with a data URL saves a PNG to /tmp/shot.png (for looking at the canvas)
  if (req.method === 'POST' && req.url === '/api/dump') {
    let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => { import('node:fs').then((fs) => { fs.writeFileSync('/tmp/shot.png', Buffer.from(body.split(',')[1] ?? body, 'base64')); res.end('ok'); }); });
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'POST') { res.end(JSON.stringify({ ok: true, rank: 3 })); return; }
  const g = new URL(req.url, 'http://x').searchParams.get('game');
  const mk = (n) => Array.from({ length: n }, (_, i) => ({ initials: ['FAB','ZEK','ANA','LUA','RUI'][i % 5], score: 90000 - i * 12345, label: 'NIVEL ' + (9 - i) + ' J16 A', date: '' }));
  if (g === 'all') { const out = {}; games.forEach((id, i) => { out[id] = i % 4 === 3 ? [] : mk(5); }); res.end(JSON.stringify({ games: out })); return; }
  res.end(JSON.stringify({ entries: mk(10) }));
}).listen(5199, () => console.log('mock api on 5199'));
