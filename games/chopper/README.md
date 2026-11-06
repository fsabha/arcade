# Chopper Command (edição browser)

Homenagem ao Chopper Command da Activision (Atari 2600, 1982, Bob Whitehead). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` do monorepo.

## Rodar

```bash
npm install                   # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/chopper  # só este jogo
npm run dev                   # ou o hub com todos os jogos
npm test -w games/chopper
```

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Voar | Setas ou W A S D | ◀ ▶ ▲ ▼ |
| Atirar (segure) | Espaço ou X | FOGO |
| Confirmar | Enter ou Espaço | FOGO |
| Pausa | P ou Esc | II |
| Som / CRT / controles de toque | M / C / T | menu |

## Regras (do manual AX-015)

- Cada onda começa com 12 aeronaves inimigas e um comboio de 12 caminhões. Dez ondas, cada uma mais rápida; a partir da décima a velocidade não cresce.
- Helicóptero inimigo abatido: 100 pontos. Jato: 200. Munição ilimitada.
- Os inimigos disparam mísseis de múltiplas ogivas que se dividem em dois depois do lançamento; não dá para abatê-los, só desviar. Eles destroem o helicóptero e os caminhões. Os pilotos são kamikazes: colidem com você se não conseguirem te acertar.
- Bater no comboio destrói o helicóptero e um caminhão.
- Onda inteira abatida: bônus = caminhões restantes × número da onda (1 a 10) × 100.
- 3 helicópteros; um extra a cada 10 000 pontos, até 6 na frota.
- Jogo 1 Cadete / jogo 3 Comandante (2 e 4 são as versões para dois jogadores, não incluídas). Dificuldade B: tiro contínuo rápido; A: lento.
- O scanner de longo alcance mostra cerca de 5 milhas; a tela, 1 milha. Caminhões são pontos brancos na borda de baixo, aeronaves acima; você é o ponto preto. O deserto é um circuito que dá a volta.
- A ação começa quando você move o joystick ou aperta o botão. 10 000 pontos no nível Cadete davam direito ao emblema dos "Commandos".
- O manual não dá velocidades nem a frequência de tiro; esses valores foram ajustados pelo jogo original. O manual também não diz o que acontece sem caminhões: aqui a onda continua e a próxima traz um comboio novo.

## Estrutura

```
src/
  config.ts   geometria, circuito de 5 telas, velocidades por onda
  field.ts    comboio, formação inimiga, mísseis que se dividem, tiros
  game.ts     máquina de estados, helicóptero, câmera, ondas e bônus
  render.ts   deserto, scanner, HUD e telas
  sprites.ts  pixel art 1:1
  audio.ts    sons sintetizados sobre SoundBase (rotor contínuo)
  storage.ts  ranking deste jogo sobre o store genérico
tests/        regras do jogo, sprites, smoke test headless
```
