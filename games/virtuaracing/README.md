# Virtua Racing (edição browser)

Homenagem ao Virtua Racing da Sega (arcade Model 1, 1992; Mega Drive com chip SVP, 1994). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo. Renderizador 3D próprio de polígonos chapados (projeção, recorte no plano próximo e pintor por profundidade), como o original, sem texturas. Tela 320×224.

## Rodar

```bash
npm install                        # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/virtuaracing  # só este jogo
npm run dev                        # ou o hub com todos os jogos
npm test -w games/virtuaracing
```

## Controles

| Ação | Teclado | Toque / gamepad |
|---|---|---|
| Acelerar | Espaço, X ou ↑ | GAS / A |
| Frear | Z, K ou ↓ | FREIO / B |
| Virar | ← → ou A / D | ◀ ▶ / d-pad |
| Trocar a câmera (botão VR) | V ou L | VR / X |
| Pausa | P ou Esc | II / Start |

## Regras (do arcade e do Mega Drive)

- Três pistas: **Big Forest** (iniciante), **Bay Bridge** (médio, com as rampas da ponte) e **Acropolis** (expert, subidas e descidas). Cinco voltas, 15 carros adversários.
- **Arcade**: corrida contra o relógio; cada ponto de controle (dois por volta, mais a linha de chegada) acrescenta tempo. **Grand Prix**: cinco voltas, vale a posição. **Treino**: pista livre, sem adversários nem relógio.
- Botão **VR** alterna as quatro câmeras: para-choque, perseguição próxima, perseguição alta e helicóptero.
- Câmbio automático de 7 marchas, velocidade máxima de cerca de 290 km/h; grama freia, muro tira velocidade, bater em outro carro também.
- Pontuação (para o ranking): 1000 por volta completada; ao terminar, 1500 por posição ganha e bônus pelo tempo abaixo da referência da pista.
- Os traçados são reconstruções dos circuitos (a forma e o ritmo dos trechos), não cópias exatas; velocidades, tempos de checkpoint e a IA são ajustes nossos.

## Estrutura

```
src/
  config.ts    tela, física do carro, pistas, modos, tempos de checkpoint, pontuação
  track.ts     splines das três pistas, amostragem a cada 8 m, cenário (árvores, arquibancadas, torres, colunas)
  render3d.ts  projeção, recorte no plano próximo, pintor por profundidade, caixas para carros e prédios
  race.ts      carros, física, IA dos adversários, voltas, checkpoints, colisões
  game.ts      modos, contagem regressiva, relógio, chegada, câmeras
  render.ts    céu e montanhas, pista com zebras, cenário, carros, HUD com mapa e telas
  audio.ts     motor contínuo, bipes, trilha original
  storage.ts   configurações e formato do ranking
tests/         pistas, renderizador, física e fluxo do jogo
```
