# Streets of Rage (edição browser)

Homenagem ao Streets of Rage da Sega (Mega Drive, 1991; *Bare Knuckle* no Japão, trilha de Yuzo Koshiro). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` e o motor de beat'em up `@arcade/brawl` do monorepo (o mesmo do Golden Axe). Tela 320×224 como o Mega Drive.

## Rodar

```bash
npm install                         # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/streetsofrage  # só este jogo
npm run dev                         # ou o hub com todos os jogos
npm test -w games/streetsofrage
```

## Controles

| Ação | Teclado | Toque / gamepad |
|---|---|---|
| Andar (8 direções) | Setas ou W A S D | ◀ ▶ ▲ ▼ / d-pad |
| Atacar (3 toques = soco, soco, chute que derruba) | Espaço ou X | ATAQUE / A |
| Pular | Z ou K | PULO / B |
| Polícia (gasta uma chamada) | V ou L | POLICIA / X |
| Correr | duas vezes na direção | idem |
| Chute em corrida / voadora | correndo + ataque / pulo + ataque | idem |
| Agarrar | andar contra o inimigo | idem |
| Joelhada / arremesso (agarrado) | ataque / pulo | idem |
| Pegar arma do chão | passar por cima | idem |
| Pausa | P ou Esc | II / Start |

## Regras (da versão Mega Drive)

- Três heróis: **Axel Hunter** (equilibrado), **Blaze Fielding** (a mais rápida, golpes mais fracos) e **Adam Hunter** (o mais forte e mais lento). Barra de vida longa (12 segmentos), 3 vidas e 3 créditos para continuar.
- **Polícia**: cada vida começa com uma chamada. O carro da polícia entra pela rua e dispara o napalm que derruba todos os inimigos na tela; o item do carrinho dá mais uma (até 3). O contador fica no HUD, ao lado da barra.
- Inimigos (nomes do manual japonês): **Galsia** e **Donovan** (os brigões de rua, em três cores de força crescente), **Y. Signal** (moicano, chute deslizante), **Nora** e **Electra** (chicote de longo alcance), **Jack** (arremessa facas) e **Hakuyo** (caratê, chutes).
- Chefes por round: 1 City Street, **Antonio** (bumerangue que volta); 2 Inner City, **Souther** (garras, rápido); 3 Beach, **Abadede** (lutador que agarra e investe); 4 Bridge, **Bongo** (gordo que cospe fogo); 5 Ship, **Mona & Lisa** (gêmeas acrobatas de chicote); 6 Factory, Souther e Abadede; 7 Elevator, Bongo e Antonio (o elevador sobe sem rolagem, as ondas chegam uma atrás da outra); 8 Syndicate HQ, todos os chefes de novo e então **Mr. X** com a metralhadora.
- Itens: maçã (cura um terço), frango (cura tudo), saco de dinheiro (1000) e barra de ouro (5000), 1-UP e o carrinho da polícia. Armas no chão: cano, taco, faca, garrafa e o saleiro de pimenta (só atordoa). Com a arma na mão o combo vira dois golpes mais fortes e de maior alcance; a arma cai quando o herói é derrubado e pode ser recolhida de novo.
- Pontos por inimigo (500 a 20000) e 1000 por round. Dificuldade FACIL/NORMAL/DIFICIL muda a vida e o ritmo dos inimigos.

## Suposições

- Os personagens são bonecos articulados desenhados em pixel pelo motor, não os sprites da Sega; cenários, trilha e efeitos são originais, no clima do cartucho.
- A quantidade de inimigos por onda e os chefes dos rounds 6 e 7 seguem o original; as posições exatas não são um decalque.
- O jogo original tem continues configuráveis nas opções; aqui são 3 fixos. Só o final bom (sem a proposta do Mr. X) está implementado.
- Um jogador apenas; as armas não se quebram (a garrafa e a faca duram enquanto o herói ficar de pé).

## Estrutura

```
src/
  config.ts   tela, barra de vida, chamadas da polícia, dificuldade, pontos
  defs.ts     heróis (com os golpes de cada arma), inimigos e chefes (atributos, golpes, aparência)
  stages.ts   os oito rounds: ondas, travas de câmera, itens e armas
  game.ts     fluxo (intro, jogo, morte, continue, final), polícia, itens, HUD
  render.ts   cenários por tema, carro da polícia, projéteis, HUD e telas
  audio.ts    sons sintetizados e trilha original sobre SoundBase
  storage.ts  configurações e formato do ranking
tests/        dados dos rounds, polícia, armas, itens, vidas/continue, rounds, smoke test headless
```
