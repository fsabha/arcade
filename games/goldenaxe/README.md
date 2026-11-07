# Golden Axe (edição browser)

Homenagem ao Golden Axe da Sega (Mega Drive, 1989; arcade de 1989, Makoto Uchida). Vite + TypeScript + Canvas 2D, sem dependências em runtime, sobre o `@arcade/shared` e o motor de beat'em up `@arcade/brawl` do monorepo. Tela 320×224 como o Mega Drive.

## Rodar

```bash
npm install                     # uma vez, na raiz do monorepo (arcade/)
npm run dev -w games/goldenaxe  # só este jogo
npm run dev                     # ou o hub com todos os jogos
npm test -w games/goldenaxe
```

## Controles

| Ação | Teclado | Toque / gamepad |
|---|---|---|
| Andar (8 direções) | Setas ou W A S D | ◀ ▶ ▲ ▼ / d-pad |
| Atacar (3 toques = combo que derruba) | Espaço ou X | ATAQUE / A |
| Pular | Z ou K | PULO / B |
| Magia (gasta todos os potes) | V ou L | MAGIA / X |
| Correr | duas vezes na direção | idem |
| Investida / voadora | correndo + ataque / pulo + ataque | idem |
| Agarrar | andar contra o inimigo | idem |
| Joelhada / arremesso (agarrado) | ataque / pulo | idem |
| Montar / desmontar | pulo sobre a criatura / pulo | idem |
| Pausa | P ou Esc | II / Start |

## Regras (da versão Mega Drive)

- Três heróis: **Ax Battler** (espada, magia de terra, até 4 potes), **Tyris Flare** (espada curta, magia de fogo, até 6 potes), **Gilius Thunderhead** (machado, magia de raio, até 3 potes). A magia gasta todos os potes de uma vez; quanto mais potes, mais forte (o raio é o mais forte por pote, o fogo o mais fraco, mas Tyris carrega mais).
- Vida em barras (3 no normal, 5 no fácil); 3 vidas e 3 créditos para continuar.
- Inimigos: Heningers (espada) e Longmoans (porrete) em quatro cores de força crescente (azul, verde, bronze, prata), amazonas Storchinaya, esqueletos do castelo, os gigantes de martelo (Bad Brothers, Sgt. Malt, Gen. Heartland), os cavaleiros Lt. Bitter e Lt. Scrooge, **Death Adder** e, exclusivo do Mega Drive, **Death Bringer** como chefe final.
- Ladrões aparecem no acampamento entre fases (e correm pelo cenário): bata neles; os azuis soltam potes de magia, os verdes soltam carne (cura uma barra).
- Montarias: Bizarrian (a "perna de galinha", chicoteia com a cauda), dragão azul (baforada) e dragão vermelho (bola de fogo). Pule sobre a criatura para montar; um golpe derruba o cavaleiro.
- Oito fases: Wilderness, Turtle Village, nas costas da tartaruga, Eagle's Head, Fiend's Path, portão do castelo, castelo de Death Adder e a masmorra de Death Bringer.
- Pontos por inimigo (200 a 20000), 100 por pote além do limite, 1000 por fase.
- Os personagens são bonecos articulados desenhados em pixel pelo motor, não os sprites da Sega; a geometria das fases, a quantidade de inimigos por onda e as velocidades são reconstruções fiéis ao ritmo do original, não um decalque.

## Estrutura

```
src/
  config.ts   tela, barras de vida, potes por herói, dano das magias, dificuldade
  defs.ts     heróis, inimigos, chefes, ladrões e montarias (atributos, golpes, aparência)
  stages.ts   as oito fases: ondas, travas de câmera, itens, montarias
  game.ts     fluxo (intro, jogo, acampamento, morte, continue, final), magia, HUD
  render.ts   cenários por tema, efeitos de magia, HUD e telas
  audio.ts    sons sintetizados e trilha original sobre SoundBase
  storage.ts  configurações e formato do ranking
tests/        dados das fases, regras do jogo, smoke test headless
```
