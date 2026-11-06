# Arcade

Clássicos do Atari 2600 e do fliperama recriados para o navegador, em um só lugar. Vite + TypeScript + Canvas 2D, sem dependências em runtime, controles por teclado, toque e gamepad, som e músicas sintetizados, ranking local, efeito CRT. Instalável como app (PWA) e funciona offline depois da primeira visita. No ar em https://arcade.fabianosabha.com.br.

| Jogo | Original | Pasta |
|---|---|---|
| River Raid | Activision, Atari 2600, 1982 | `games/riverraid` |
| Endurance | Enduro, Activision, Atari 2600, 1983 | `games/endurance` |
| Seaquest | Activision, Atari 2600, 1983 | `games/seaquest` |
| Pac-Man | Namco, arcade, 1980 | `games/pacman` |
| Freeway | Activision, Atari 2600, 1981 | `games/freeway` |
| Pitfall | Activision, Atari 2600, 1982 | `games/pitfall` |
| Frostbite | Activision, Atari 2600, 1983 | `games/frostbite` |
| H.E.R.O. | Activision, Atari 2600, 1984 | `games/hero` |
| Asteroids | Atari, Atari 2600, 1981 | `games/asteroids` |
| Keystone Kapers | Activision, Atari 2600, 1983 | `games/keystone` |
| Missile Command | Atari, Atari 2600, 1981 | `games/missile` |
| Frogger | Konami / Sega, arcade, 1981 | `games/frogger` |
| Chopper Command | Activision, Atari 2600, 1982 | `games/chopper` |
| Moon Patrol | Irem, arcade, 1982 | `games/moonpatrol` |
| Donkey Kong | Nintendo, arcade, 1981 | `games/donkeykong` |

## Rodar

```bash
npm install          # uma vez, na raiz
npm run dev          # hub com todos os jogos em http://localhost:5173
npm test             # todos os testes (jogos + shared)
npm run build        # typecheck de tudo + site completo em dist/
npm run preview      # serve o build
npm run images       # regenera ícones e imagem Open Graph em public/
```

Cada jogo continua um projeto independente:

```bash
npm run dev -w games/pacman      # só o Pac-Man
npm test -w games/pacman
npm run build -w games/pacman    # build isolado em games/pacman/dist/
```

No celular na mesma rede, use o endereço "Network" que o Vite imprime.

## Como funciona

```
arcade/
  index.html, hub/      menu: cards com a fonte pixel, abre o jogo em um iframe (botão MENU volta)
  packages/shared/      código comum: @arcade/shared
    font.ts             fonte pixel 3x5 (drawText, drawTextCentered, textWidth, normalizeText)
    input.ts            teclado, botões de toque (com vibração), gestos de deslizar e gamepad
    shell.ts            Shell: menu, como jogar, ranking, pausa, fim de jogo e iniciais de todo jogo
    screens.ts          desenho padrão dessas telas (cada jogo só passa seus textos)
    rng.ts              mulberry32 determinístico
    storage.ts          createScoreStore / createSettingsStore sobre localStorage
    audio.ts            SoundBase: AudioContext, mute, tone(), noise(), music (MusicLoop)
    music.ts            loops chiptune por nome de nota (melodia, baixo, bateria)
    bootstrap.ts        escala do canvas, loop rAF, toque, controles laterais em paisagem, CRT
    analytics.ts        Vercel Web Analytics sem dependência + eventos
    testing.ts          canvas/input/áudio falsos para testes headless
    style.css           layout da página e dos botões de toque
  public/               manifest PWA, service worker, ícones e imagem Open Graph (gerados por scripts/make-images.mjs)
  .github/workflows/    CI: testes + build a cada push e pull request
  games/<jogo>/         projeto Vite completo: index.html, src/, tests/, README.md
```

- A raiz é um site multi-página do Vite: o hub em `/` e cada jogo em `/games/<jogo>/`. O mesmo `index.html` do jogo serve para rodar sozinho ou dentro do hub.
- Cada jogo mantém só o que é dele: `config.ts`, `game.ts`, `render.ts`, `sprites.ts`, um `audio.ts` que estende `SoundBase` e um `storage.ts` de poucas linhas que define o formato do seu ranking.
- Ranking e configurações ficam no `localStorage` do navegador, com prefixo por jogo (`pacman.highscores` etc.).

## Histórico

Os jogos nasceram em repositórios separados e foram trazidos com `git subtree`, então o histórico de cada um está preservado aqui.
