# Asteroids (edição browser, versão Atari 2600)

Homenagem ao Asteroids do Atari 2600 (Atari, 1981, Brad Stewart), com as pedras coloridas e as variações do cartucho CX2649. Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo.

## Rodar

```bash
npm install                     # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/asteroids  # só este jogo
npm run dev                     # ou o hub com todos os jogos
npm test -w games/asteroids
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Girar | ← → ou A / D | ◀ ▶ |
| Propulsão | ↑ ou W | IMPULSO |
| Hiperespaço / escudo / flip (conforme o jogo) | ↓ ou S | ESPECIAL |
| Atirar | Espaço ou X | FOGO |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do manual CX2649)

- Pedra grande 20, média 50, pequena 100. Grande vira duas médias, média vira duas pequenas.
- Quatro naves por partida. Vida extra a cada 5000, 10000, 20000 pontos ou nenhuma, conforme o jogo.
- Jogos 1–8: hiperespaço. 9–16: escudo (mais de 2 segundos explode a nave). 17–24: flip (vira 180°). 25–32: sem extra. Ímpares lentos, pares rápidos. Jogo 65: crianças (lento, hiperespaço, pedras médias são pulverizadas).
- Dificuldade B: só pedras. Dificuldade A: satélites (200, grandes e fáceis) e OVNIs (1000, pequenos e certeiros), que atiram na nave; OVNIs às vezes a partir de 7500 pontos e sempre depois de 15000.
- Tudo dá a volta na tela. A nave volta ao centro quando a área está livre.
- Como no cartucho, a cor de cada pedra depende da altura em que ela está na tela.
- O manual não diz quantas pedras abrem cada onda nem as velocidades; aqui são 6 grandes (+2 por onda, máx. 12).

## Estrutura

```
src/
  config.ts   geometria, velocidades, pontuação
  games.ts    a matriz de variações do cartucho (1–32 e 65)
  field.ts    pedras, tiros, satélite/OVNI, destroços, toro
  game.ts     máquina de estados, nave, especiais, ondas, colisões
  render.ts   cena (cor por faixa), HUD e telas
  sprites.ts  bitmaps das pedras e nave rasterizada em 16 direções
  audio.ts    sons sintetizados sobre SoundBase
  storage.ts  ranking deste jogo sobre o store genérico
tests/        matriz de jogos, campo, regras, smoke test headless
```
