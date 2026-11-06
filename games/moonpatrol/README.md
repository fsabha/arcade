# Moon Patrol (edição browser)

Homenagem ao Moon Patrol da Irem (arcade, 1982; distribuído pela Williams nos EUA). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo. Tela 256×224 e as três camadas de paralaxe que o jogo tornou famosas.

## Rodar

```bash
npm install                      # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/moonpatrol  # só este jogo
npm run dev                      # ou o hub com todos os jogos
npm test -w games/moonpatrol
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Acelerar / frear | → ← ou D / A | GAS / FREIO |
| Pular | ↑ ou W (ou Enter) | PULO |
| Atirar (para cima e para frente ao mesmo tempo) | Espaço ou X | FOGO |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do arcade)

- O jipe lunar anda sozinho; você acelera, freia, pula e atira. O tiro sai em duas direções de uma vez: para cima (OVNIs e bombas) e para a frente (pedras, minas, tanques).
- O percurso Iniciante vai de A a Z com pontos de controle em E, J, O, T e Z. Cada ponto de controle vale 1000 (500 se a seção de cinco letras passou de 40 segundos). Percurso completo: 5000, e em seguida começa o percurso Campeão, mais rápido e com mais obstáculos.
- Crateras pequenas se pulam de qualquer jeito; as grandes só acelerando. Pedra 50, pedra grande 100 (dois tiros), mina 100, tanque 400 (atira em você). OVNIs: 200, 300 e 500 conforme o tipo; as bombas deles abrem crateras novas no chão à sua frente.
- Morreu: volta ao começo da seção atual. 3 vidas; vida extra em 10 000, 30 000 e 50 000.
- Os valores de pontos de cada alvo, o tempo-base das seções e a distribuição dos obstáculos por letra são aproximações do arcade (a placa original não tem tabela publicada), ajustadas pelo jogo.

## Estrutura

```
src/
  config.ts   geometria, velocidades, percurso A-Z, pontos
  course.ts   geração dos obstáculos por letra e das ondas de OVNIs
  game.ts     máquina de estados, jipe, tiros, OVNIs, bombas, checkpoints
  render.ts   paralaxe (montanhas, cidade, colinas), solo, HUD e telas
  sprites.ts  pixel art 1:1
  audio.ts    sons sintetizados sobre SoundBase (motor contínuo)
  storage.ts  ranking deste jogo sobre o store genérico
tests/        percurso, regras do jogo, sprites, smoke test headless
```
