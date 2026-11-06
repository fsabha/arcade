# Frostbite (edição browser)

Homenagem ao clássico Frostbite da Activision (Atari 2600, 1983, Steve Cartwright). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo.

## Rodar

```bash
npm install                     # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/frostbite  # só este jogo
npm run dev                     # ou o hub com todos os jogos
npm test -w games/frostbite
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Andar | ← → ou A / D | ◀ ▶ |
| Pular para a fileira de cima / de baixo | ↑ ↓ ou W / S | ▲ ▼ |
| Inverter a fileira em que está | Espaço ou X | INVERTER |
| Confirmar | Enter ou Espaço | INVERTER |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do manual AX-031)

- Frostbite Bailey pula entre quatro fileiras de gelo. Cada fileira **branca** pisada vira azul e acrescenta um bloco ao iglu: 10 pontos × nível (fixo a partir do nível 9). Quando as quatro fileiras estão azuis, voltam a ficar brancas.
- Botão inverte a direção da fileira em que ele está, mas custa um bloco (a menos que o iglu já esteja completo).
- Com 16 blocos a porta aparece. Entrar no iglu vale 160 × nível, mais 10 × graus restantes × nível, e começa o próximo nível. Quatro iglus por turno: níveis 5–8 são à noite.
- A temperatura começa em 45° e cai 1° por segundo; em 0° Bailey congela.
- Gansos, caranguejos e mariscos empurram Bailey pela fileira; cair na água é fatal. Peixes valem 200.
- A partir do nível 4 o urso polar ronda a praia e expulsa Bailey da tela; o canto esquerdo da praia é seguro.
- 1 Bailey ativo + 3 reservas; vida extra a cada 5000 pontos (máx. 9). Jogo AVANÇADO começa no nível 5.
- O manual não dá os números da temperatura, do tamanho/velocidade dos blocos nem em que nível cada animal aparece; esses valores foram ajustados pelo jogo original.

## Estrutura

```
src/
  config.ts   geometria, velocidades por nível, fórmulas de pontuação
  sea.ts      fileiras de gelo, animais, peixes
  game.ts     máquina de estados, Bailey, iglu, temperatura, urso
  render.ts   cena dia/noite, iglu, HUD e telas
  sprites.ts  pixel art 2600 (pixels largos 2:1)
  audio.ts    sons sintetizados sobre SoundBase
  storage.ts  ranking deste jogo sobre o store genérico
tests/        regras do mar e do jogo, smoke test headless
```
