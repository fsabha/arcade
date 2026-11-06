# Missile Command (edição browser)

Homenagem ao Missile Command da Atari para o Atari 2600 (CX2638, 1981, Rob Fulop), a versão de uma base e seis cidades. Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo.

## Rodar

```bash
npm install                   # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/missile  # só este jogo
npm run dev                   # ou o hub com todos os jogos
npm test -w games/missile
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Mover a mira | Setas ou W A S D | ◀ ▶ ▲ ▼ |
| Disparar ABM na mira | Espaço ou X | FOGO |
| Mirar e disparar de uma vez | clique no céu | toque no céu |
| Confirmar | Enter ou Espaço | FOGO |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do manual CX2638)

- Seis cidades de Zardon e uma base de mísseis no centro. Cada onda dá 30 ABMs: 10 carregados na base e 20 no depósito subterrâneo; até 3 ABMs no ar ao mesmo tempo. O ABM explode exatamente onde está a mira.
- Míssil balístico destruído: 25 pontos. Míssil de cruzeiro: 125. No fim da onda, cada ABM não usado vale 5 e cada cidade salva 100.
- Multiplicador por onda (Tabela 1): ondas 1–2 ×1, 3–4 ×2, 5–6 ×3, 7–8 ×4, 9–10 ×5, 11 em diante ×6. A onda 13 é a mais difícil do cartucho; depois dela a velocidade não cresce.
- Cidade bônus a cada 10 000 pontos, usada no fim da onda para reconstruir uma ruína (com musiquinha). O jogo acaba quando as seis cidades caem no fim de uma onda; se houver bônus pendente, uma cidade volta e a próxima onda começa.
- Base atingida: os ABMs carregados são destruídos, o depósito sobrevive.
- Mísseis de cruzeiro (parecem satélites) a partir da 7ª onda: os burros voam em linha reta; os espertos detectam e desviam das explosões (mire bem em cima deles).
- 17 variações de um jogador (18–34 são as mesmas para dois jogadores): a Game Select Matrix alterna mira lenta/rápida, cruzeiro burro/esperto e onda inicial 1, 7, 11 ou 15. Jogo 17 é a versão para crianças: mais lento, menos mísseis, mira lenta, cruzeiro burro.
- Dificuldade A: os ABMs voam mais devagar. B: normal.
- O manual não diz quantos mísseis há por onda, nem velocidades; esses valores foram ajustados pelo jogo original. Mísseis que se dividem (MIRV) aparecem a partir da 3ª onda. Tocar no céu para mirar e disparar é uma concessão ao celular.

## Estrutura

```
src/
  config.ts   geometria, pontos, multiplicador, dificuldade por onda
  games.ts    Game Select Matrix (17 variações)
  field.ts    mísseis inimigos, cruzeiros, ABMs e explosões
  game.ts     máquina de estados, ondas, contagem final, cidades bônus
  render.ts   céu, cidades, trilhas, explosões, HUD e telas
  audio.ts    sons sintetizados sobre SoundBase
  storage.ts  ranking deste jogo sobre o store genérico
tests/        tabelas do manual, regras de jogo, smoke test headless
```
