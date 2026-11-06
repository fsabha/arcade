# H.E.R.O. (edição browser)

Homenagem ao clássico H.E.R.O. da Activision (Atari 2600, 1984, John Van Ryzin). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo.

## Rodar

```bash
npm install                # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/hero  # só este jogo
npm run dev                # ou o hub com todos os jogos
npm test -w games/hero
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Andar / voar para os lados | ← → ou A / D | ◀ ▶ |
| Hélice (subir); solte para descer | ↑ ou W | VOAR |
| Dinamite (no chão) | ↓ ou S | DINAMITE |
| Laser | Espaço ou X (segure) | LASER |
| Confirmar | Enter ou Espaço | LASER |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do manual AX-038)

- Roderick Hero desce a mina de tela em tela até o mineiro. Bicho no laser: 50. Parede dinamitada: 75. Mineiro: 1000, mais 50 por dinamite restante e um bônus por unidade de energia que cresce com o nível.
- 6 dinamites por vida. A explosão derruba paredes de pedra clara (e você, se ficar perto). O laser também corta essas paredes, devagar.
- Lanterna tocada ou atingida apaga a tela; a dinamite acesa ilumina até explodir.
- Magma (pedra vermelha), rio de lava, tentáculo (não morre) e aranhas, morcegos, cobras e mariposas matam. Jangadas flutuam na lava.
- Energia começa a cair quando você se move; zerou, perde a vida. 1 vida ativa + 3 reservas (máx. 6). Vida extra a cada 20.000. Placar para em 1.000.000.
- Jogos 1–4 começam nos níveis 1, 5, 9 e 13; jogo 5 começa no 17 com níveis aleatórios e sem número. Após o nível 20 aparece PRO.
- Os mapas do cartucho não existem em nenhuma fonte textual: os 20 níveis aqui são desenhos próprios no mesmo espírito (poço vertical, paredes, lanternas, lava, jangada, tentáculo), com os níveis 11–20 espelhando os dez primeiros com mais bichos.

## Estrutura

```
src/
  config.ts   geometria, velocidades, pontuação
  levels.ts   mapas em texto (20x12 por tela), espelhamento e reforço
  world.ts    tiles, bichos, jangadas, tentáculos, lanternas, explosões
  game.ts     máquina de estados, hélice, laser, dinamite, energia, resgate
  render.ts   câmera por tela, cena, escuro, HUD e telas
  sprites.ts  pixel art 2600 (pixels largos 2:1)
  audio.ts    sons sintetizados sobre SoundBase
  storage.ts  ranking deste jogo sobre o store genérico
tests/        níveis (alcançabilidade), regras, smoke test headless
```
