# Pac-Man (edição browser)

Homenagem ao arcade da Namco de 1980, rodando no navegador. Vite + TypeScript + Canvas 2D, sem dependências em runtime. Regras, labirinto, velocidades e comportamento dos fantasmas seguem o Pac-Man Dossier.

## Rodar

```bash
npm install                 # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/pacman   # só este jogo, em http://localhost:5173
npm run dev                 # ou o hub com todos os jogos
```

Outros comandos:

```bash
npm test -w games/pacman      # testes deste jogo (na raiz: npm test roda todos)
npm run build -w games/pacman # build isolado em games/pacman/dist/
npm run preview -w games/pacman
```

No celular na mesma rede, use o endereço "Network" que o Vite imprime (controles de toque aparecem automaticamente).

## Controles

| Ação | Teclado | Toque |
|---|---|---|
| Mover | Setas ou WASD | ◀ ▶ ▲ ▼ |
| Confirmar | Enter ou Espaço | OK |
| Pausa | P ou Esc | II |
| Som on/off | M | menu |
| Efeito CRT on/off | C | menu |
| Mostrar/ocultar controles de toque | T | — |

## O que está reproduzido

- Labirinto original 28x31 com 240 pastilhas e 4 pastilhas de poder, túnel lateral, casa dos fantasmas.
- Os quatro fantasmas com seus alvos reais: Blinky (Pac-Man), Pinky (4 casas à frente, com o bug do "para cima"), Inky (vetor de Blinky dobrado), Clyde (foge quando a menos de 8 casas). Desempate cima/esquerda/baixo/direita, sem meia-volta, zonas sem subida.
- Ciclos scatter/chase por fase, com inversão de direção na troca.
- Tabelas de velocidade por fase (Pac-Man, fantasmas, túnel, modo azul), tempos do modo azul e piscadas, fases 17+/19+/21+ sem azul.
- Cruise Elroy (Blinky acelera com poucas pastilhas), suprimido com Clyde na casa.
- Saída da casa por contadores pessoais (fase 1: Inky 30, Clyde 60; fase 2: Clyde 50), contador global após perder vida (7/17/32) e timer de 4 s / 3 s.
- Pac-Man perde 1 frame por pastilha e 3 por pastilha de poder; "cornering" (curva antecipada).
- Frutas em 70 e 170 pastilhas: cereja 100, morango 300, laranja 500, maçã 700, melão 1000, galaxian 2000, sino 3000, chave 5000.
- Fantasmas azuis valem 200/400/800/1600 em sequência, com pausa e placar no lugar.
- Vida extra aos 10.000 pontos. Olhos voltam para a casa e renascem.
- Attract mode com "CHARACTER / NICKNAME", intermissões 1, 2 e 3 após as fases 2, 5, 9, 13 e 17.
- Sons sintetizados: sirene que sobe com as pastilhas, waka, modo azul, olhos, frutas, morte, jingle.
- Ranking top 10 em `localStorage`.

## Estrutura

```
src/
  config.ts     geometria, pontos, posições, zonas, alvos de scatter
  levels.ts     tabelas por fase (velocidades, azul, Elroy, scatter/chase, frutas, casa)
  maze.ts       mapa, pastilhas, consultas de parede/túnel/casa
  actors.ts     movimento em grade com parada em centro de casa e túnel
  ghostai.ts    alvos de perseguição/scatter e escolha de direção
  game.ts       máquina de estados, casa dos fantasmas, modos, frutas, mortes, fases
  render.ts     paredes com contorno arcade, pastilhas, atores, HUD, attract, intermissões
  sprites.ts    fantasmas, frutas e Pac-Man
  audio.ts      sons sintetizados (Web Audio), sobre SoundBase do @arcade/shared
  storage.ts    ranking e configurações deste jogo sobre o store genérico do @arcade/shared
  main.ts       bootstrap, loop e escala do canvas
```
