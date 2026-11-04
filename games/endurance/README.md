# Endurance (edição browser)

Homenagem ao clássico Enduro do Atari 2600, rodando no navegador. Vite + TypeScript + Canvas 2D, sem dependências em runtime.

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
| Dirigir | Setas ← → ou A / D | ◀ ▶ |
| Acelerar | ↑, W, Espaço ou X | GAS |
| Frear | ↓ ou S | FREIO |
| Pausa | P ou Esc | II |
| Selecionar no menu | Enter ou Espaço | GAS |
| Som on/off | M | menu |
| Efeito CRT on/off | C | menu |
| Mostrar/ocultar controles de toque | T | — |

## Regras

- Corrida de resistência: ultrapasse 200 carros no dia 1 e 300 em cada dia seguinte. Ao bater a meta aparecem as bandeiras; se o dia acabar antes, fim de jogo.
- Carros que te ultrapassam somam de volta no contador.
- Bater em um carro joga você para o lado e derruba a velocidade. Sair da pista também freia.
- Curvas empurram o carro para fora, proporcional à velocidade.
- O dia muda: amanhecer, dia, entardecer, noite (só as lanternas dos carros são visíveis), neblina (a partir do dia 2, visão curta) e gelo (a partir do dia 3, direção escorrega).
- Dificuldade cresce por dia: tráfego mais denso e rápido, mais carros lado a lado, curvas mais fechadas com a distância.
- Pista procedural infinita (seed por partida). Ranking top 10 por dias alcançados e km rodados, salvo em `localStorage`.

## Estrutura

```
src/
  config.ts     constantes (câmera, dinâmica, tráfego, regras)
  rng.ts        PRNG determinístico (mulberry32)
  road.ts       geração procedural da pista (retas e curvas suavizadas)
  projection.ts projeção pseudo-3D (pista plana)
  daycycle.ts   fases do dia, paleta, neblina e gelo
  traffic.ts    spawn, movimento, contagem de ultrapassagens e colisão
  scoring.ts    meta por dia e curva de dificuldade
  storage.ts    ranking e configurações (localStorage)
  input.ts      teclado + botões de toque
  audio.ts      sons sintetizados (Web Audio)
  font.ts       fonte pixel 3x5
  sprites.ts    pixel art dos carros e ícones
  game.ts       máquina de estados e lógica de jogo
  render.ts     céu, montanhas, pista, carros, HUD e telas
  main.ts       bootstrap, loop e escala do canvas
```
