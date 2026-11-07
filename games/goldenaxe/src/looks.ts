import type { Look } from '@arcade/brawl';

/**
 * 16-bit looks for every Golden Axe character: build, costume and a hand-drawn head (facing
 * right). Head letters: a-d skin (light to dark), h-k hair, m-p helmet metal, q-t costume,
 * u-w gold, x dark line, y white, e eye, z red.
 */

const AX_HEAD = [
  '....jiiiij....',
  '..jiihhhhiij..',
  '.jihhiiiiiiij.',
  '.jiiiiiiibbbij',
  'jiiiiiibbbbbbi',
  'jiijiicxxbbxxb',
  'jiijiicebbbyeb',
  'jiijicbbbbbbba',
  'jiijicbbbbbbbc',
  'jiij.dcbbbxxb.',
  'jij..dccbbbbb.',
  'jj....dccccc..',
  'j......dcc....',
];

const TYRIS_HEAD = [
  '....hhhhhh....',
  '..hhhiiiiihh..',
  '.hhiiiiiiiiii.',
  'hhiiiiiibbbbii',
  'hiiiiiibbbbbbi',
  'hiijiicbxbbbxb',
  'hiijiicebbbyei',
  'hiijicbbbbbbba',
  'iiijicbbbbbbbc',
  'iiij.icbbbzzb.',
  'iiij.idcbbbbb.',
  'iiij..idcccc..',
  '.iij...dcc....',
  '..ij...dcc....',
  '...j..........',
];

const GILIUS_HEAD = [
  'm..............n',
  'mn....mmmm....no',
  '.mn.mmmmmmmm.no.',
  '..nmmmmmmmmmmno.',
  '..onnnnnnnnnnoo.',
  '..poooopoooooop.',
  '...hiibxxbbbxxb.',
  '...hiibebbbbyeb.',
  '...hhibbbbbbbba.',
  '..hhhhhhbbbbbbc.',
  '.hhhhhhhhhhhhhh.',
  '.ihhhhhhhhhhhhi.',
  '.iihhhhhhhhhhii.',
  '..iihhhhhhhhii..',
  '...iiihhhhiii...',
  '.....iiiiii.....',
];

const HENINGER_HEAD = [
  '....mmmmmm....',
  '..mmmmmmmmmm..',
  '.mmmnnmmmmmmm.',
  '.nnnnnnnnnnnnn',
  '.oooooooooooop',
  '.pnncxxbbbxxb.',
  '.pnncebbbbyeb.',
  '.pnnbbbbbbbbba',
  '.pnncbbbbbbbbc',
  '.pnndcbbbxxbb.',
  '..pn.dcbbbbb..',
  '......dcccc...',
  '.......dcc....',
];

const LONGMOAN_HEAD = [
  '.....mm.......',
  '....mmmm......',
  '..mmmmmmmmm...',
  '.mmmmmnnmmmmm.',
  '.mnnnnnnnnnnm.',
  '.nnnoxxonnxxn.',
  '.nnnoxxonnxxo.',
  '.nnoooooooooo.',
  '.onoooooooooo.',
  '.oopopopopopo.',
  '..ppppppppppp.',
  '....dcccc.....',
  '.....dcc......',
];

const AMAZON_HEAD = [
  '....jjjjjj....',
  '..jjjiiiiijj..',
  '.jjiiiiiiiiii.',
  'jjiiuuuuvvvvii',
  'jiiiiiibbbbbbi',
  'jiijiicbxbbbxb',
  'jiijiicebbbyei',
  'jiijicbbbbbbba',
  'jjijicbbbbbbbc',
  'jjij.icbbbzzb.',
  'jjij.idcbbbbb.',
  'jjij..idcccc..',
  '.jjj...dcc....',
  '..jj...dcc....',
  '...j..........',
];

const SKULL_HEAD = [
  '....aabbbb....',
  '..abbbbbbbbc..',
  '.abbbbbbbbbbc.',
  '.bbbbbbbbbbbbc',
  '.cbbbbbbbbbbbb',
  '.cbbbbxxxbbxxx',
  '.cbbbbxxxbbxxx',
  '.ccbbbbxbbbbxb',
  '..ccbbbbbbbbbb',
  '...cdbybybybyb',
  '....dxyxyxyxx.',
  '.....dbbbbbc..',
  '......dd......',
];

const GIANT_HEAD = [
  '.......mmmmmm.....',
  '.....mmmmmmmmmm...',
  '....mmmnnmmmmmmm..',
  '...mmmnnnmmmmmmmm.',
  '...nnnnnnnnnnnnnn.',
  '..onnnnnnnnnnnnnno',
  '..ooooooooooooooop',
  '..ppnncxxxbbbbxxxb',
  '..ppnccbbbbbbbbbbb',
  '...pnccebbbbbbyeeb',
  '...pnccbbbbbbbbbbba',
  '...pncbbbbbbbbbbbbb',
  '...pncbbbbbbbbbbbbc',
  '....pdcbbbbxxxxxbb.',
  '....pddcbbbbbbbbb..',
  '.......ddccbbbbc...',
  '.........dddccc....',
  '..........dcc......',
].map((r) => r.padEnd(19, '.').slice(0, 19));

const KNIGHT_HEAD = [
  '.....mmmmm.....',
  '...mmmmmmmmm...',
  '..mmmmnnmmmmm..',
  '.mmmmnnnnmmmmm.',
  '.nnnnnnnnnnnnnm',
  '.nnnnnnnnnnnnnn',
  '.nnnooxxxxxxxxn',
  '.ooooonnnnnnnno',
  '.ooooooxooxooxo',
  '.oooooooooooooo',
  '..ppoooooooooop',
  '...pppoooooopp.',
  '.....pppppp....',
  '......pnnp.....',
];

const ADDER_HEAD = [
  'u................u',
  'uv..............vw',
  '.uv....mmmm....vw.',
  '..vv.mmmmmmmm.ww..',
  '...vmmmmmmmmmmmw..',
  '...mmmmnnmmmmmmm..',
  '...nnnnnnnnnnnnnn.',
  '...nnnooxxxooxxxn.',
  '...nnooxyxxooxyxo.',
  '...oooooooooooooo.',
  '...ooopoooooooooo.',
  '....oopopopopopop.',
  '....pppppppppppp..',
  '......pdccccccp...',
  '........dcccc.....',
  '.........dcc......',
];

const BRINGER_HEAD = [
  '.......qqqq.......',
  '.....qqrrrrqq.....',
  '....qrrrrrrrrq....',
  '...qrrrrrrrrrrq...',
  '...rrrssssssrrr...',
  '..rrrsaabbbbbsrr..',
  '..rrsabbbbbbbbbs..',
  '..rrsbbxxxbbxxxb..',
  '..rssbbxzxbbxzxb..',
  '..rssbbbbbbbbbbba.',
  '..sssbbbbbbbbbbbb.',
  '...sscbybybybybb..',
  '...ssdxyxyxyxyx...',
  '....s.dbbbbbbc....',
  '.......ddccc......',
  '........dcc.......',
];

const HOOD_HEAD = [
  '....qqqq....',
  '..qqrrrrqq..',
  '.qrrrrrrrrq.',
  'qrrrrrrrrrrq',
  'qrrsabbbbrrs',
  'qrrsbxbbxbrs',
  'rrsbbebbebas',
  'rrsbbbbbbbbs',
  '.rsscbbxxbs.',
  '.ss..dcccc..',
  '......dc....',
];

export const LOOKS: Record<string, Look> = {
  ax: { build: 'hero', top: 'bare', lower: 'trunks', boots: 0.42, bracers: true, belt: true, head: AX_HEAD, reach: 23, colors: { belt: ['#a06a30', '#6a4018'] } },
  tyris: { build: 'slim', height: 62, top: 'bikini', lower: 'bikini', boots: 0.6, bracers: true, head: TYRIS_HEAD, neck: [8, 13], reach: 20 },
  gilius: { build: 'dwarf', height: 50, top: 'shirt', sleeves: 0.6, lower: 'pants', boots: 0.55, belt: true, bracers: true, head: GILIUS_HEAD, neck: [9, 14], reach: 22,
    colors: { hair: ['#f4f4ec', '#b8b8b0'], helm: ['#d8dce4', '#8a94a4'] } },
  thief: { build: 'small', height: 38, top: 'shirt', sleeves: 1, lower: 'pants', boots: 0.3, head: HOOD_HEAD, neck: [6, 10] },
};

export const heningerLook = (c: string): Look => ({ build: 'hero', top: 'tunic', sleeves: 0.5, lower: 'pants', boots: 0.55, belt: true, pauldrons: true, head: HENINGER_HEAD, reach: 19, colors: { helm: c } });
export const longmoanLook = (c: string): Look => ({ build: 'heavy', height: 66, top: 'tunic', sleeves: 0.3, lower: 'pants', boots: 0.5, belt: true, pauldrons: true, bracers: true, head: LONGMOAN_HEAD, reach: 18, colors: { helm: c } });
export const amazonLook = (c: string): Look => ({ build: 'slim', height: 62, top: 'bikini', lower: 'loin', boots: 0.65, bracers: true, head: AMAZON_HEAD, neck: [8, 13], reach: 19, colors: { top: c } });
export const skeletonLook: Look = { build: 'bony', top: 'ribs', lower: 'trunks', boots: 0, head: SKULL_HEAD, reach: 20, colors: { legs: ['#ece6cc', '#b0a888'] } };
export const giantLook = (c: string): Look => ({ build: 'heavy', height: 100, top: 'bare', lower: 'pants', boots: 0.5, belt: true, pauldrons: true, greaves: true, bracers: true, head: GIANT_HEAD, neck: [11, 17], reach: 26, colors: { helm: c, top: c, skin: ['#d89a6a', '#a06a40'] } });
export const knightLook = (c: string): Look => ({ build: 'hero', height: 76, top: 'armor', lower: 'pants', boots: 0.6, belt: true, pauldrons: true, greaves: true, head: KNIGHT_HEAD, neck: [7, 13], reach: 24, colors: { helm: c, metal: c } });
export const adderLook: Look = { build: 'heavy', height: 108, top: 'armor', lower: 'skirt', boots: 0.6, belt: true, pauldrons: true, greaves: true, bracers: true, head: ADDER_HEAD, neck: [10, 15], reach: 30,
  colors: { metal: ['#e8c048', '#9a7420'], helm: ['#c8ccd4', '#6a7484'], legs: ['#8a4a20', '#5a2c10'] } };
export const bringerLook: Look = { build: 'heavy', height: 108, top: 'robe', sleeves: 2, lower: 'robe', boots: 0.3, belt: true, pauldrons: true, head: BRINGER_HEAD, neck: [10, 15], reach: 30,
  colors: { skin: ['#d8d0c0', '#9a9080'], metal: ['#e0b0ff', '#8040c0'] } };
