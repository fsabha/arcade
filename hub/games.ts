export interface GameInfo {
  id: string;
  title: string;
  original: string;
  year: number;
  blurb: string;
  accent: string;
  /** Logical canvas size, used for the card preview. */
  w: number;
  h: number;
}

export type Platform = 'atari' | 'arcade';

export function platformOf(g: GameInfo): Platform {
  return /2600/.test(g.original) ? 'atari' : 'arcade';
}

export const GAMES: GameInfo[] = [
  { id: 'riverraid', title: 'RIVER RAID', original: 'Activision, Atari 2600', year: 1982, blurb: 'Voe pelo rio, abasteça e destrua pontes.', accent: '#3ddc84', w: 240, h: 320 },
  { id: 'endurance', title: 'ENDURANCE', original: 'Enduro - Activision, Atari 2600', year: 1983, blurb: 'Ultrapasse a cota de carros a cada dia.', accent: '#ff8c3a', w: 320, h: 240 },
  { id: 'seaquest', title: 'SEAQUEST', original: 'Activision, Atari 2600', year: 1983, blurb: 'Resgate mergulhadores e vigie o oxigênio.', accent: '#3aa0ff', w: 320, h: 240 },
  { id: 'pacman', title: 'PAC-MAN', original: 'Namco, arcade', year: 1980, blurb: 'Coma as pastilhas e fuja dos fantasmas.', accent: '#ffe14a', w: 224, h: 288 },
  { id: 'freeway', title: 'FREEWAY', original: 'Activision, Atari 2600', year: 1981, blurb: 'Atravesse a rodovia com a galinha.', accent: '#f4d03f', w: 320, h: 240 },
  { id: 'pitfall', title: 'PITFALL', original: 'Activision, Atari 2600', year: 1982, blurb: 'Ache os 32 tesouros em 20 minutos.', accent: '#48b038', w: 320, h: 200 },
  { id: 'frostbite', title: 'FROSTBITE', original: 'Activision, Atari 2600', year: 1983, blurb: 'Pule nos blocos de gelo e monte o iglu antes de congelar.', accent: '#9cc8f0', w: 320, h: 240 },
  { id: 'hero', title: 'H.E.R.O.', original: 'Activision, Atari 2600', year: 1984, blurb: 'Desça a mina com hélice, laser e dinamite para resgatar o mineiro.', accent: '#f0c040', w: 320, h: 240 },
  { id: 'asteroids', title: 'ASTEROIDS', original: 'Atari, Atari 2600', year: 1981, blurb: 'Gire, acelere e quebre as pedras; 33 variações do cartucho.', accent: '#d8a0ff', w: 320, h: 240 },
  { id: 'keystone', title: 'KEYSTONE KAPERS', original: 'Activision, Atari 2600', year: 1983, blurb: 'Persiga Harry Hooligan pela loja antes que o tempo acabe.', accent: '#f0c060', w: 320, h: 240 },
  { id: 'missile', title: 'MISSILE COMMAND', original: 'Atari, Atari 2600', year: 1981, blurb: 'Defenda as seis cidades com os ABMs; 17 variações do cartucho.', accent: '#ff7050', w: 320, h: 240 },
  { id: 'frogger', title: 'FROGGER', original: 'Konami / Sega, arcade', year: 1981, blurb: 'Atravesse a estrada e o rio e leve os cinco sapos para casa.', accent: '#40d040', w: 224, h: 256 },
  { id: 'chopper', title: 'CHOPPER COMMAND', original: 'Activision, Atari 2600', year: 1982, blurb: 'Proteja o comboio de caminhões de helicópteros e jatos no deserto.', accent: '#78b8f0', w: 320, h: 240 },
  { id: 'moonpatrol', title: 'MOON PATROL', original: 'Irem, arcade', year: 1982, blurb: 'Pule crateras, atire em pedras e OVNIs e complete o percurso de A a Z.', accent: '#e060e0', w: 256, h: 224 },
  { id: 'donkeykong', title: 'DONKEY KONG', original: 'Nintendo, arcade', year: 1981, blurb: 'Suba as vigas, desvie dos barris e salve Pauline nas quatro fases.', accent: '#e85050', w: 224, h: 256 },
];
