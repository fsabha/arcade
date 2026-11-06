# Frogger (edição browser)

Homenagem ao Frogger de arcade (Konami, distribuído pela Sega, 1981). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo. Tela vertical 224×256 como a placa original.

## Rodar

```bash
npm install                   # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/frogger  # só este jogo
npm run dev                   # ou o hub com todos os jogos
npm test -w games/frogger
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Pular | Setas ou W A S D | ◀ ▶ ▲ ▼ |
| Confirmar | Enter ou Espaço | OK |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do arcade)

- Leve cinco sapos, um de cada vez, até as cinco casas no alto. Cinco faixas de estrada (carros, tratores, carros de corrida, caminhões) e cinco de rio (troncos de três tamanhos, grupos de tartarugas de 2 e 3).
- Pontos: 10 por pulo para frente (uma vez por fileira), 50 por casa alcançada, mais 10 por cada meio segundo que sobrou no relógio de 30 segundos. Mosca na casa: 200. Sapa carregada de um tronco até a casa: 200. Cinco em casa: 1000 e próximo nível.
- No rio só pise em troncos e tartarugas; a água afoga. Algumas tartarugas mergulham: em baixo d'água, afogam. Sair da tela sobre um tronco também afoga.
- Casa ocupada, parede entre casas ou jacaré de boca aberta na casa: morte. Tempo esgotado: morte.
- A partir do nível 2: cobra na mediana e jacaré no rio (a cabeça mata quando abre a boca; o resto do corpo é um tronco). A partir do nível 3: lontras no rio. A velocidade do trânsito sobe a cada nível.
- 3 sapos; um sapo extra com 20 000 pontos (só um).
- O arcade tem um tema musical e variações por placa (bonus por 10 000 ou 20 000); aqui ficam os efeitos sonoros sintetizados e o bônus único em 20 000.

## Estrutura

```
src/
  config.ts   grade 14x16, linhas, pontos, níveis dos perigos
  lanes.ts    faixas de estrada e rio, tartarugas que mergulham, cobra, lontra, jacaré
  game.ts     máquina de estados, sapo, casas, mosca, sapa, relógio
  render.ts   campo, sprites, HUD e telas
  sprites.ts  pixel art 2x (16x16 por célula)
  audio.ts    sons sintetizados sobre SoundBase
  storage.ts  ranking deste jogo sobre o store genérico
tests/        faixas, regras do jogo, sprites, smoke test headless
```
