# Donkey Kong (edição browser)

Homenagem ao Donkey Kong da Nintendo (arcade, 1981, Shigeru Miyamoto). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo. Tela vertical 224×256 como a placa original, com as quatro fases: 25 m (barris), 50 m (esteiras), 75 m (elevadores) e 100 m (rebites).

## Rodar

```bash
npm install                      # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/donkeykong  # só este jogo
npm run dev                      # ou o hub com todos os jogos
npm test -w games/donkeykong
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Andar | ← → ou A / D | ◀ ▶ |
| Subir / descer escadas | ↑ ↓ ou W / S | ▲ ▼ |
| Pular | Espaço ou X | PULAR |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do arcade)

- Suba até Pauline. Ordem das fases: nível 1 = 25 m e 100 m; nível 2 = 25, 50, 75 e 100 m; do nível 3 em diante, 25 m entre cada uma das outras (seis fases por nível).
- Bônus começa em 5000 no nível 1 (+1000 por nível, até 8000) e cai 100 a cada tique. O que sobrar ao terminar a fase vai para o placar; em zero, Mario morre.
- Pular um barril, torta ou mola: 100. Martelo (dura cerca de 10 s): barril 300, 500 ou 800 ao acaso; fogo ou torta 500. Com o martelo não se pula nem se sobe escada; o fogo fica azul e foge.
- Bolsa, chapéu e guarda-chuva da Pauline: 300, 500 ou 800 conforme o nível. Rebites: 100 cada; retirados os oito, Kong despenca.
- 25 m: Kong rola barris pelas vigas em zigue-zague; o primeiro é azul e desce até o tambor de óleo, acendendo a bola de fogo. Barris descem escadas de vez em quando, mais quando Mario está logo abaixo. Escadas quebradas só sobem um pedaço.
- 50 m: esteiras que invertem o sentido levam tortas de cimento; a de cima corre para longe de Kong. 75 m: um elevador sobe, o outro desce, e as molas de Kong quicam pela viga de cima e caem à direita. 100 m: cinco andares e bolas de fogo; cada rebite retirado abre um buraco que precisa ser pulado.
- Queda de mais de 28 px é fatal. 3 vidas; vida extra com 7000 pontos (uma só).
- Os traçados das fases e as velocidades são reconstruções: a geometria das vigas segue a inclinação e o zigue-zague do arcade, mas não é um decalque pixel a pixel.

## Estrutura

```
src/
  config.ts   física do Mario, pontos, bônus por nível, ordem das fases
  stages.ts   geometria das quatro fases (vigas, escadas, rebites, elevadores)
  actors.ts   barris, bolas de fogo, tortas, molas, elevadores
  game.ts     máquina de estados, Mario, martelo, pontuação, Kong
  render.ts   vigas, escadas, atores, HUD e telas
  sprites.ts  pixel art 1:1 (Mario 12x16, Kong 40x32)
  audio.ts    sons sintetizados sobre SoundBase
  storage.ts  ranking deste jogo sobre o store genérico
tests/        fases, regras do jogo, sprites, smoke test headless
```
