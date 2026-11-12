# Space Invaders (edição browser)

Homenagem ao clássico de 1978, rodando no navegador. Arquitetura: Vite + TypeScript + Canvas 2D, sem dependências em runtime.

## Rodar

```bash
npm install                          # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/spaceinvaders   # só este jogo, em http://localhost:5173
npm run dev                          # ou o hub com todos os jogos
```

Outros comandos:

```bash
npm test         # testes unitários (Vitest)
npm run build -w games/spaceinvaders # build isolado em games/spaceinvaders/dist/
npm run preview -w games/spaceinvaders
```

No celular na mesma rede, use o endereço "Network" que o Vite imprime (controles de toque aparecem automaticamente).

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Mover | Setas ← → ou A / D | ◀ ▶ |
| Atirar | Espaço ou X | FOGO |
| Pausa | P ou Esc | II |
| Selecionar no menu | Enter ou Espaço | FOGO |
| Som on/off | M | menu |
| Efeito CRT on/off | C | menu |
| Mostrar/ocultar controles de toque | T | — |

## Regras

- 5 fileiras x 11 invasores. Pontos por fileira (de cima pra baixo): 30, 20, 20, 10, 10. Nave misteriosa: 50, 100, 150 ou 300.
- Só um tiro seu na tela por vez. Seu tiro destrói tiros inimigos.
- Invasores aceleram conforme são destruídos (marcha de 4 notas acompanha). Ao tocar a borda descem uma linha.
- 4 barricadas destrutíveis pixel a pixel: tiros dos dois lados e invasores passando corroem.
- Invasores chegando ao canhão = invasão, game over imediato.
- 3 vidas, uma vida extra em 1500 pontos (como o original). Ondas infinitas: cada onda começa mais baixa e mais rápida.
- Ranking global (top 10 com iniciais) compartilhado com o hub.

## Estrutura

```
src/
  config.ts      constantes (tamanhos, velocidades, pontos, timings)
  formation.ts   grade de invasores: marcha, borda/descida, velocidade, atiradores
  barricade.ts   barricadas pixel a pixel: impacto, explosão, corrosão
  scoring.ts     pontuação, vida extra, pontos do UFO
  collision.ts   AABB
  storage.ts     configurações (localStorage); ranking global via @arcade/shared
  audio.ts       sons sintetizados (Web Audio): marcha, tiros, UFO, explosões
  sprites.ts     pixel art (2 frames por invasor)
  game.ts        máquina de estados e lógica de jogo
  render.ts      desenho do mundo, HUD, telas e demo do menu
  main.ts        bootstrap, loop e escala do canvas
tests/           testes Vitest da lógica pura
```
