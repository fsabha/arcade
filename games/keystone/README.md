# Keystone Kapers (edição browser)

Homenagem ao clássico Keystone Kapers da Activision (Atari 2600, 1983, Garry Kitchen). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo.

## Rodar

```bash
npm install                    # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/keystone  # só este jogo
npm run dev                    # ou o hub com todos os jogos
npm test -w games/keystone
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Correr | ← → ou A / D | ◀ ▶ |
| Pular (parado ou correndo) | Espaço ou X | PULAR |
| Abaixar | ↓ ou S | ▼ |
| Entrar no elevador (porta aberta) | ↑ ou W | ▲ |
| Sair do elevador (porta aberta) | ↓ ou S | ▼ |
| Confirmar | Enter ou Espaço | PULAR |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do manual AX-025)

- Harry Hooligan assalta a loja Southwick's e foge pelos três andares (cada um com três telas de largura), subindo as escadas rolantes nas pontas até o telhado. Se chegar ao telhado e sair pela esquerda, escapa: você perde um Kop.
- O Bonus Timer começa em 50 segundos e pisca nos últimos 10. Zerou, perdeu um Kop.
- Carrinhos de compras, bolas de praia e rádios (a partir do 3º krook) devem ser pulados; cada colisão custa 9 segundos. Bolas passam a quicar mais alto: aí é abaixar. Biplanos de brinquedo (a partir do 2º krook) exigem abaixar; colidir tira um Kop.
- Sacos de dinheiro e malas roubadas valem 50 pontos cada.
- Prender Harry vale o tempo restante × 100 (krooks 1 a 8), × 200 (9 a 16) e × 300 a partir do 17º.
- Elevador no centro da loja sobe e desce sozinho entre os três andares (nunca chega ao telhado); escada rolante é o único caminho para o telhado, e do telhado não se desce.
- Kelly pode pular em cima da escada rolante para começar na metade dela.
- 1 Kelly ativo + 3 Kops de reserva; Kop extra a cada 10 000 pontos, até 3 na reserva.
- A partir do 2º krook Harry fica esperto: se Kelly bloqueia o caminho, ele dá meia-volta por alguns segundos.
- O manual não dá velocidades, ritmo de obstáculos nem o layout exato da loja; esses valores foram ajustados pelo jogo original.

## Estrutura

```
src/
  config.ts   geometria da loja, velocidades por krook, multiplicadores
  store.ts    elevador, escadas, Harry, obstáculos e tesouros
  game.ts     máquina de estados, Kelly, timer, pontuação
  render.ts   loja, scanner de segurança, HUD e telas
  sprites.ts  pixel art 2600 (pixels largos 2:1)
  audio.ts    sons sintetizados sobre SoundBase
  storage.ts  ranking deste jogo sobre o store genérico
tests/        regras do jogo, sprites, smoke test headless
```
