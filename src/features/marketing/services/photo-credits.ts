/**
 * Credits of the demo café photos (supabase/seed-media/ATTRIBUTION.md): CC BY and CC BY-SA
 * require them on every public page that shows the photos, so the footer links to /legal/credits.
 * Titles and authors are data from Wikimedia Commons, not interface text.
 */
export interface PhotoCredit {
  file: string;
  title: string;
  author: string;
  source: string;
  licence: string;
  licenceUrl: string;
}

const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';
const BY_4 = 'https://creativecommons.org/licenses/by/4.0/';
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/';
const BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0/';

export const DEMO_PHOTO_CREDITS: readonly PhotoCredit[] = [
  {
    file: 'cover-cafe-sidi-bou-said.jpg',
    title: 'Café SIDI CHABAANE Ou café des Terrasses sidi bousaid tunisie',
    author: 'Rania.tamboura',
    source:
      'https://commons.wikimedia.org/wiki/File:Caf%C3%A9_SIDI_CHABAANE_Ou_caf%C3%A9_des_Terrasses_sidi_bousaid_tunisie.JPG',
    licence: 'CC BY-SA 3.0',
    licenceUrl: BY_SA_3,
  },
  {
    file: 'citronnade.jpg',
    title: 'Lemonade 2',
    author: 'Shisma',
    source: 'https://commons.wikimedia.org/wiki/File:Lemonade_2.jpg',
    licence: 'CC BY 4.0',
    licenceUrl: BY_4,
  },
  {
    file: 'crepe-chocolat.jpg',
    title: 'Crêpe chocolat-caramel 01',
    author: 'Kev22',
    source: 'https://commons.wikimedia.org/wiki/File:Cr%C3%AApe_chocolat-caramel_01.jpg',
    licence: 'CC BY 4.0',
    licenceUrl: BY_4,
  },
  {
    file: 'croissant.jpg',
    title: 'Croissants au beurre (18953292873)',
    author: 'Herry Wibisono (herryway)',
    source: 'https://commons.wikimedia.org/wiki/File:Croissants_au_beurre_(18953292873).jpg',
    licence: 'CC0',
    licenceUrl: CC0,
  },
  {
    file: 'fricasse.jpg',
    title: 'Fricassé, Tunisie, 19 mars 2020',
    author: "Habib M'henni",
    source: 'https://commons.wikimedia.org/wiki/File:Fricass%C3%A9,_Tunisie,_19_mars_2020.jpg',
    licence: 'CC BY-SA 4.0',
    licenceUrl: BY_SA_4,
  },
  {
    file: 'makroud.jpg',
    title: 'Makroudh Pâtisserie tunisienne 01',
    author: 'Zeinebtakouti',
    source: 'https://commons.wikimedia.org/wiki/File:Makroudh_P%C3%A2tisserie_tunisienne_01.jpg',
    licence: 'CC BY-SA 4.0',
    licenceUrl: BY_SA_4,
  },
  {
    file: 'ojja.jpg',
    title: 'Tunisian Ojja',
    author: 'Una723',
    source: 'https://commons.wikimedia.org/wiki/File:Tunisian_Ojja.jpg',
    licence: 'CC BY 4.0',
    licenceUrl: BY_4,
  },
];
