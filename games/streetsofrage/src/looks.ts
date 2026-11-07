import type { Look } from '@arcade/brawl';

/**
 * 16-bit looks for the Streets of Rage cast: build, clothes and a hand-drawn head (facing right).
 * Head letters: a-d skin (light to dark), h-k hair, m-p metal, q-t clothes, u-w gold,
 * x dark line, y white, e eye, z red.
 */

const SHORT = [ // short hair (Axel, Galsia, Jack)
  '....jiiiij....',
  '..jiihhhhiij..',
  '.jihhhiiiiiij.',
  '.jiiiiiiibbbij',
  '.jiiiiibbbbbbb',
  '.jiijicxxbbxxb',
  '.jijbicebbbyeb',
  '..jbbcbbbbbbba',
  '..jdbcbbbbbbbc',
  '...ddcbbbbxxb.',
  '....dccbbbbbb.',
  '.....dcccccc..',
  '.......dcc....',
];

const SPIKY = [ // Axel's swept blond hair
  '...h.hhhh.....',
  '..hihhiiihh...',
  '.jihhhiiiiiihh',
  '.jiiiiiiiibbii',
  '.jiiiiibbbbbbb',
  '.jiijicxxbbxxb',
  '.jijbicebbbyeb',
  '..jbbcbbbbbbba',
  '..jdbcbbbbbbbc',
  '...ddcbbbbxxb.',
  '....dccbbbbbb.',
  '.....dcccccc..',
  '.......dcc....',
];

const FLAT = [ // Adam's flat top
  '..jjjjjjjjjj..',
  '..jiiiiiiiiij.',
  '..jiiiiiiiiij.',
  '..jjjjjjjbbbj.',
  '..jbbbbbbbbbbb',
  '..jbbcxxbbbxxb',
  '..jbbcebbbbyeb',
  '..dbbcbbbbbbba',
  '..dbdcbbbbbbbc',
  '...ddcbbbbxxb.',
  '....dccbbbbbb.',
  '.....dcccccc..',
  '.......dcc....',
];

const BALD_SHADES = [ // Donovan
  '..............',
  '.....cbbbb....',
  '...cbbbaabbb..',
  '..cbbbbaaabbb.',
  '..cbbbbbbbbbbb',
  '..cbbcxxxxxxxb',
  '..dbbbxxxxbxxb',
  '..dbbcbbbbbbba',
  '..dbdcbbbbbbbc',
  '...ddcbbbbxxb.',
  '....dccbbbbbb.',
  '.....dcccccc..',
  '.......dcc....',
];

const MOHAWK = [ // Signal
  '.....hhh......',
  '....hhiih.....',
  '...cbhiibbb...',
  '..cbbhiibbbb..',
  '..cbbbbbbbbbbb',
  '..cbbcxxxxxxxb',
  '..dbbbxxxxbxxb',
  '..dbbcbbbbbbba',
  '..dbdcbbbbbbbc',
  '...ddcbbbbxxb.',
  '....dccbbbbbb.',
  '.....dcccccc..',
  '.......dcc....',
];

const TOPKNOT = [ // Hakuyo
  '....jij.......',
  '...jiiij......',
  '..jjjjjjjjj...',
  '..jiiiiiiiijj.',
  '..jjjjjbbbbbb.',
  '..jbbcxxbbbxxb',
  '..jbbcebbbbyeb',
  '..dbbcbbbbbbba',
  '..dbdcbbbbbbbc',
  '...ddcbbbbxxb.',
  '....dccbbbbbb.',
  '.....dcccccc..',
  '.......dcc....',
];

const CAP = [ // Antonio
  '...qqqqqq.....',
  '..qqrrrrrqq...',
  '.qqrrrrrrrrq..',
  '.rrrrrrrrrrrss',
  '.ssssssssttttt',
  '.jbbbcxxbbbxxb',
  '.jbbbcebbbbyeb',
  '..dbbcbbbbbbba',
  '..dbdcbbbbbbbc',
  '...ddcbbbbxxb.',
  '....dccbbbbbb.',
  '.....dcccccc..',
  '.......dcc....',
];

const LONG_MALE = [ // Souther (black) and Abadede (blond, moustache)
  '....jiiiij....',
  '..jiihhhhiij..',
  '.jihhiiiiiiij.',
  '.jiiiiiiibbbij',
  'jiiiiiibbbbbbi',
  'jiijiicxxbbxxb',
  'jiijiicebbbyeb',
  'jiijicbbbbbbba',
  'jiijicbbbbbbbc',
  'jiij.dcbbiiiib',
  'jij..dccbbbbb.',
  'jj....dccccc..',
  'j......dcc....',
];

const BONGO = [
  '.......cbbbb......',
  '.....cbbbaabbb....',
  '....cbbbbaaabbb...',
  '...cbbbbbbbbbbbb..',
  '...cbbbbcxxxbbxxx.',
  '...dbbbbcbebbbbye.',
  '...dbbbbcbbbbbbbba',
  '..dbbbbbcbbbbbbbbb',
  '..dbbbbbbbbbbbbbbc',
  '..ddbbbbcbbbxxxxb.',
  '...ddbbbbcbzzzzbb.',
  '...dddbbbbbbbbbb..',
  '....dddccbbbbbc...',
  '......dddcccc.....',
  '........dcc.......',
];

const MRX = [
  '....kkkkk.....',
  '..kjjhhhhjj...',
  '.kjhhjjjjjjj..',
  '.kjjjjjjjbbbj.',
  '.kjjjjibbbbbbb',
  '.kjjjicxxbbxxb',
  '.kjjbicebbbyeb',
  '..jbbcbbbbbbba',
  '..jdbcbbbbbbbc',
  '...ddcbbiiiib.',
  '....dccbbbbbbu',
  '.....dcccccc..',
  '.......dcc....',
];

const WOMAN = [ // Blaze, Nora, Electra, Mona & Lisa
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

const BOB = [ // short-haired whip women
  '....hhhhhh....',
  '..hhhiiiiihh..',
  '.hhiiiiiiiiii.',
  'hhiiiiiiiiiiii',
  'hiiiiiiiiiiiii',
  'hiijiicbxbbbxb',
  'hiijiicebbbyeb',
  'hiijicbbbbbbba',
  'iiijicbbbbbbbc',
  'jiij.icbbbzzb.',
  '.jj..idcbbbbb.',
  '......dcccc...',
  '.......dcc....',
];

const W: [number, number] = [8, 13];

export const LOOKS: Record<string, Look> = {
  axel: { build: 'hero', top: 'shirt', sleeves: 0.55, lower: 'pants', boots: 0.16, belt: true, gloves: true, head: SPIKY, reach: 20,
    colors: { glove: ['#e04040', '#a02020'], belt: ['#6a4a2a', '#3e2a14'] } },
  blaze: { build: 'slim', height: 62, top: 'tank', lower: 'skirt', boots: 0.2, head: WOMAN, neck: W, reach: 18 },
  adam: { build: 'heavy', height: 66, top: 'tank', lower: 'pants', boots: 0.16, belt: true, head: FLAT, reach: 20, colors: { boots: ['#f0f0f0', '#a8b0b8'] } },
  galsia: { build: 'lean', top: 'jacket', sleeves: 2, lower: 'pants', boots: 0.18, head: SHORT, reach: 18 },
  donovan: { build: 'heavy', height: 66, top: 'vest', lower: 'pants', boots: 0.2, belt: true, head: BALD_SHADES, reach: 18 },
  signal: { build: 'lean', top: 'jacket', sleeves: 2, lower: 'pants', boots: 0.2, head: MOHAWK, reach: 18, colors: { top2: '#202028' } },
  jack: { build: 'lean', top: 'shirt', sleeves: 2, lower: 'pants', boots: 0.18, belt: true, head: SHORT, reach: 18 },
  hakuyo: { build: 'lean', top: 'tunic', sleeves: 1.5, lower: 'pants', boots: 0.12, belt: true, head: TOPKNOT, reach: 18, colors: { belt: ['#303030', '#101010'], boots: ['#303030', '#101010'] } },
  antonio: { build: 'heavy', top: 'shirt', sleeves: 2, lower: 'pants', boots: 0.2, belt: true, head: CAP, reach: 18 },
  souther: { build: 'lean', top: 'bare', lower: 'pants', boots: 0.45, belt: true, head: LONG_MALE, reach: 18, colors: { hair: ['#383038', '#181018'] } },
  abadede: { build: 'heavy', top: 'bare', lower: 'trunks', boots: 0.6, gloves: false, head: LONG_MALE, reach: 22, colors: { boots: ['#f0f0f0', '#a8b0b8'] } },
  bongo: { build: 'fat', top: 'bare', lower: 'pants', boots: 0.2, belt: true, head: BONGO, neck: [9, 14], reach: 22 },
  whip: { build: 'slim', height: 62, top: 'tank', lower: 'bikini', boots: 0.95, gloves: true, head: BOB, neck: [8, 12], reach: 20, colors: { glove: ['#303038', '#101018'], boots: ['#303038', '#101018'] } },
  twin: { build: 'slim', height: 62, top: 'tank', lower: 'bikini', boots: 0.9, head: WOMAN, neck: W, reach: 20 },
  mrx: { build: 'hero', top: 'jacket', sleeves: 2, lower: 'pants', boots: 0.15, belt: false, head: MRX, reach: 22, colors: { top2: ['#f0f0f0', '#a0a8b0'], boots: ['#202020', '#080808'] } },
};
