# Seaquest (edição browser)

Homenagem ao clássico Seaquest do Atari 2600, rodando no navegador. Vite + TypeScript + Canvas 2D, sem dependências em runtime.

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
| Mover | Setas ou WASD | ◀ ▶ ▲ ▼ |
| Atirar | Espaço ou X | FOGO |
| Pausa | P ou Esc | II |
| Selecionar no menu | Enter ou Espaço | FOGO |
| Som on/off | M | menu |
| Efeito CRT on/off | C | menu |
| Mostrar/ocultar controles de toque | T | — |

## Regras

- Resgate mergulhadores passando por cima deles (máximo 6). Atirar em mergulhador o mata.
- Tubarões e submarinos inimigos cruzam 4 faixas; submarinos atiram torpedos. Cada inimigo vale 20 pontos no nível 1, +10 por nível (máx. 90).
- O oxigênio esgota em ~55 s. Suba à superfície para encher. Enquanto enche, o submarino fica travado (como no original).
- Subir sem mergulhadores custa uma vida. Subir com 1 a 5: um mergulhador desembarca. Subir com 6: bônus (50 por mergulhador por nível + oxigênio restante) e próximo nível.
- Depois da primeira subida, um submarino de patrulha cruza a superfície.
- 3 vidas, +1 a cada 10.000 pontos. Perder uma vida zera os mergulhadores a bordo.
- Dificuldade cresce por nível: inimigos mais rápidos, mais tubarões por grupo, mais submarinos, patrulha mais rápida.
- Top 10 com iniciais salvo em `localStorage`.

## Estrutura

```
src/
  config.ts     constantes (tela, faixas, velocidades, oxigênio, regras)
  rng.ts        PRNG determinístico (mulberry32)
  sea.ts        faixas: spawn de tubarões, submarinos, mergulhadores, torpedos e patrulha
  collision.ts  AABB
  scoring.ts    valor dos inimigos, bônus de resgate, vidas extras, dificuldade
  storage.ts    ranking e configurações (localStorage)
  input.ts      teclado + botões de toque
  audio.ts      sons sintetizados (Web Audio)
  font.ts       fonte pixel 3x5
  sprites.ts    pixel art (submarinos, tubarões, mergulhadores, patrulha)
  game.ts       máquina de estados e lógica de jogo
  render.ts     céu, mar, entidades, HUD e telas
  main.ts       bootstrap, loop e escala do canvas
```
