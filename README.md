# Pitfall! (edição browser)

Homenagem ao clássico Pitfall! da Activision (Atari 2600, 1982), rodando no navegador. Vite + TypeScript + Canvas 2D, sem dependências em runtime. O mapa é o do cartucho original: as 255 telas são geradas pelo mesmo registrador de deslocamento (LFSR) de 8 bits, a partir do valor $C4, com os 32 tesouros nas mesmas telas.

## Rodar

```bash
npm install
npm run dev      # abre em http://localhost:5173
```

Outros comandos:

```bash
npm test         # testes unitários + smoke test headless (Vitest)
npm run build    # typecheck + build em dist/
npm run preview  # serve o build
```

No celular na mesma rede, use o endereço "Network" que o Vite imprime (controles de toque aparecem automaticamente).

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Correr | ← → ou A / D | ◀ ▶ |
| Pular | Espaço ou X | PULAR |
| Descer / subir a escada | ↓ ↑ (no buraco com escada) | ▼ ▲ |
| Soltar o cipó | ↓ ou Espaço | ▼ / PULAR |
| Confirmar | Enter ou Espaço | PULAR |
| Pausa | P ou Esc | II |
| Som on/off | M | menu |
| Efeito CRT on/off | C | menu |
| Mostrar/ocultar controles de toque | T | — |

## Regras (como no original)

- Começa com 2000 pontos, 3 vidas e 20 minutos. O relógio dispara no primeiro movimento.
- 32 tesouros: saco de dinheiro (2000), barra de prata (3000), barra de ouro (4000) e anel (5000). Achar todos encerra o jogo com vitória.
- Toras rolantes tiram pontos enquanto encostam e derrubam Harry; toras paradas só tiram pontos. Pule por cima.
- Cair num buraco com escada custa 100 pontos e leva ao túnel. Alcatrão, pântano, areia movediça, fogo, cobra, escorpião e jacaré de boca aberta matam.
- Jacarés: só dá para pisar na cabeça com a boca fechada.
- Cipó: pule nele para agarrar; solte com ↓ ou Espaço.
- Túnel: cada tela equivale a três telas da superfície. Nas telas com escada há uma parede de tijolos (lado dado pelo bit 7 da tela); nas outras, o escorpião.
- Ao morrer, Harry volta pela esquerda da mesma tela (caindo das árvores na superfície).
- Ranking top 10 por pontos, salvo em `localStorage`.

## Geração do mundo

Cada tela é um byte. Andando para a direita: `b = (b << 1) | (b3 ^ b4 ^ b5 ^ b7)`. Para a esquerda, a operação inversa. Bits 0–2: objeto (1 tora rolante, 2 toras, 2 toras afastadas, 3 toras, 1 tora parada, 3 toras paradas, fogo, cobra). Bits 3–5: cenário (buraco com escada, três buracos com escada, alcatrão com cipó, pântano com cipó, jacarés, areia com tesouro, alcatrão móvel com cipó, areia móvel). Bits 6–7: desenho das árvores. Bit 7 também escolhe o lado da parede no túnel. Em telas de jacaré, o bit 1 do objeto decide se há cipó; em telas de tesouro, os bits 0–1 escolhem o tesouro.

## Estrutura

```
src/
  config.ts     geometria, velocidades, pontuação, tempo
  world.ts      LFSR das telas, decodificação dos bits, perigos do chão
  game.ts       máquina de estados, física do Harry, escada, cipó, colisões
  render.ts     selva, buracos, túnel, sprites, HUD e telas
  sprites.ts    pixel art 2600 (pixels largos 2:1)
  audio.ts      sons sintetizados (Web Audio)
  storage.ts    ranking e configurações (localStorage)
  input.ts      teclado + toque
  font.ts       fonte pixel 3x5
  rng.ts        gerador determinístico (reservado)
tests/          regras do mundo e do jogo, smoke test headless
```
