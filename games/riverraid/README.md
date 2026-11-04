# River Raid (edição browser)

Homenagem ao clássico River Raid do Atari 2600, rodando no navegador. Vite + TypeScript + Canvas 2D, sem dependências em runtime.

## Rodar

```bash
npm install                 # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/riverraid   # só este jogo, em http://localhost:5173
npm run dev                 # ou o hub com todos os jogos
```

Outros comandos:

```bash
npm test         # testes unitários (Vitest)
npm run build -w games/riverraid # build isolado em games/riverraid/dist/
npm run preview -w games/riverraid
```

No celular na mesma rede, use o endereço "Network" que o Vite imprime (controles de toque aparecem automaticamente).

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Mover | Setas ← → ou A / D | ◀ ▶ |
| Acelerar / frear | ↑ / ↓ ou W / S | ▲ ▼ |
| Atirar | Espaço ou X | FOGO |
| Pausa | P ou Esc | II |
| Selecionar no menu | Enter ou Espaço | FOGO |
| Som on/off | M | menu |
| Efeito CRT on/off | C | menu |
| Mostrar/ocultar controles de toque | T | — |

## Regras

- Combustível esvazia com o tempo (mais rápido acelerando). Passe sobre os depósitos FUEL para abastecer. Atirar no depósito vale pontos, mas o destrói.
- Bater na margem, em ilha ou em inimigo custa uma vida. 3 vidas, +1 a cada 10.000 pontos.
- Cada seção termina em uma ponte: destrua-a para avançar. Ao morrer, volta ao início da seção atual.
- Pontos (tabela original): navio 30, helicóptero 60, depósito 80, jato 100, ponte 500.
- Rio procedural infinito (seed por partida); dificuldade cresce por seção: rio mais estreito, mais ilhas, mais inimigos em movimento.
- Top 10 com iniciais salvo em `localStorage`.

## Estrutura

```
src/
  config.ts     constantes de jogo (tamanhos, velocidades, pontos)
  river.ts      geração procedural do rio, seções, pontes e spawns
  collision.ts  AABB, colisão com margem/ilha, bounce no canal
  scoring.ts    pontuação e vidas extras
  audio.ts      sons sintetizados (Web Audio), sobre SoundBase do @arcade/shared
  storage.ts    ranking e configurações deste jogo sobre o store genérico do @arcade/shared
  sprites.ts    pixel art dos sprites
  game.ts       máquina de estados e lógica de jogo
  render.ts     desenho do rio, entidades, HUD e telas
  main.ts       bootstrap, loop e escala do canvas
tests/          testes Vitest da lógica pura
```
