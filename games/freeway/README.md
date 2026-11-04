# Freeway (edição browser)

Homenagem ao clássico Freeway da Activision (Atari 2600, 1981), rodando no navegador. Vite + TypeScript + Canvas 2D, sem dependências em runtime. As oito variações seguem o manual original (AG-009).

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
| Galinha sobe / desce | ↑ ↓ ou W / S | ▲ ▼ |
| Trocar jogo / dificuldade no menu | ← → | ◀ ▶ |
| Confirmar | Enter ou Espaço | OK |
| Pausa | P ou Esc | II |
| Som on/off | M | menu |
| Efeito CRT on/off | C | menu |
| Mostrar/ocultar controles de toque | T | — |

## Regras

- Atravesse as 10 faixas (5 em cada sentido). Cada travessia vale 1 ponto e a galinha volta ao início.
- Partida de 2 min 16 s. Nos últimos 8 segundos o placar pisca. No fim, o tráfego para e o placar final aparece.
- Dificuldade B: atropelada, a galinha volta uma faixa. Dificuldade A: volta ao meio-fio.
- Jogos (do manual):
  1. Lake Shore Drive, Chicago, 3 AM: só carros, tráfego leve e lento; mais lento junto ao meio-fio, mais rápido no centro.
  2. Interstate 5, Seattle, 6 AM: tráfego mais denso e rápido; caminhões na faixa superior junto ao centro.
  3. Santa Monica Freeway, Los Angeles, 10 AM: caminhões nas duas faixas centrais (os mais rápidos); tráfego denso nas duas faixas junto ao meio-fio.
  4. Bayshore Freeway, San Francisco, meia-noite: só caminhões; meio-fio e centro rápidos, faixas 2 e 4 na metade, faixa 3 em um quarto.
  5–8. Detroit, Washington, Dallas, Nova York: mesmos padrões de 1–4, mas as velocidades mudam aleatoriamente a qualquer momento.
- Ranking top 10 por travessias, salvo em `localStorage`.

## Estrutura

```
src/
  config.ts     geometria da rodovia, galinha, veículos, tempo
  games.ts      as oito variações do cartucho
  traffic.ts    faixas, cópias de veículos, loop e velocidades aleatórias
  game.ts       máquina de estados, cronômetro, colisões, dificuldade A/B
  render.ts     rodovia, veículos, galinha, HUD e telas
  sprites.ts    pixel art 2600 (galinha, carro, caminhão), cor por faixa
  audio.ts      sons sintetizados (Web Audio)
  storage.ts    ranking e configurações (localStorage)
  input.ts      teclado + toque
  font.ts       fonte pixel 3x5
  rng.ts        PRNG determinístico
  main.ts       bootstrap, loop e escala do canvas
```
