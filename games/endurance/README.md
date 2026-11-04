# Endurance (edição browser)

Homenagem ao clássico Enduro do Atari 2600, rodando no navegador. Vite + TypeScript + Canvas 2D, sem dependências em runtime.

## Rodar

```bash
npm install                 # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/endurance   # só este jogo, em http://localhost:5173
npm run dev                 # ou o hub com todos os jogos
```

Outros comandos:

```bash
npm test -w games/endurance      # testes deste jogo (na raiz: npm test roda todos)
npm run build -w games/endurance # build isolado em games/endurance/dist/
npm run preview -w games/endurance
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
  road.ts       geração procedural da pista (retas e curvas suavizadas)
  projection.ts projeção pseudo-3D (pista plana)
  daycycle.ts   fases do dia, paleta, neblina e gelo
  traffic.ts    spawn, movimento, contagem de ultrapassagens e colisão
  scoring.ts    meta por dia e curva de dificuldade
  audio.ts      sons sintetizados (Web Audio), sobre SoundBase do @arcade/shared
  storage.ts    ranking e configurações deste jogo sobre o store genérico do @arcade/shared
  sprites.ts    pixel art dos carros e ícones
  game.ts       máquina de estados e lógica de jogo
  render.ts     céu, montanhas, pista, carros, HUD e telas
  main.ts       bootstrap, loop e escala do canvas
```
