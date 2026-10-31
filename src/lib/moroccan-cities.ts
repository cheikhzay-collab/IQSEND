// Standardized Moroccan Cities & Regions for COD Logistics & Confirmation

export interface MoroccanCityInfo {
  nameFr: string;
  nameAr: string;
  region: string;
  hub: 'Casablanca' | 'Fes' | 'Marrakech' | 'Tanger' | 'Autre';
}

export const MOROCCAN_CITIES: string[] = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Tanger',
  'Agadir',
  'Salé',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Temara',
  'Safi',
  'Mohammedia',
  'Khouribga',
  'El Jadida',
  'Béni Mellal',
  'Nador',
  'Taza',
  'Settat',
  'Berrechid',
  'Khemisset',
  'Guelmim',
  'Larache',
  'Ksar El Kebir',
  'Taourirt',
  'Berkane',
  'Sidi Slimane',
  'Sidi Kacem',
  'Taroudant',
  'Essaouira',
  'Tiznit',
  'Ouarzazate',
  'Al Hoceima',
  'Errachidia',
  'Tan-Tan',
  'Dakhla',
  'Laâyoune',
  'Youssoufia',
  'Oued Zem',
  'Sidi Bennour',
  'Bouskoura',
  'Dar Bouazza',
  'Nouaceur',
  'Ain Harrouda',
  'Skhirat',
];

const CITY_SYNONYMS: Record<string, string> = {
  casa: 'Casablanca',
  casablanca: 'Casablanca',
  دارالبيضاء: 'Casablanca',
  'الدار البيضاء': 'Casablanca',
  كازا: 'Casablanca',
  rabat: 'Rabat',
  الرباط: 'Rabat',
  kech: 'Marrakech',
  marrakech: 'Marrakech',
  مراكش: 'Marrakech',
  fes: 'Fès',
  fès: 'Fès',
  فاس: 'Fès',
  tanger: 'Tanger',
  tangier: 'Tanger',
  طنجة: 'Tanger',
  agadir: 'Agadir',
  أكادير: 'Agadir',
  اكادير: 'Agadir',
  sale: 'Salé',
  salé: 'Salé',
  سلا: 'Salé',
  meknes: 'Meknès',
  meknès: 'Meknès',
  مكناس: 'Meknès',
  oujda: 'Oujda',
  وجدة: 'Oujda',
  kenitra: 'Kénitra',
  kénitra: 'Kénitra',
  القنيطرة: 'Kénitra',
  قنيطرة: 'Kénitra',
  tetouan: 'Tétouan',
  tétouan: 'Tétouan',
  تطوان: 'Tétouan',
  temara: 'Temara',
  تمارة: 'Temara',
  safi: 'Safi',
  اسفي: 'Safi',
  آسفي: 'Safi',
  mohammedia: 'Mohammedia',
  المحمدية: 'Mohammedia',
  محمدية: 'Mohammedia',
  khouribga: 'Khouribga',
  خريبكة: 'Khouribga',
  eljadida: 'El Jadida',
  'el jadida': 'El Jadida',
  الجديدة: 'El Jadida',
  benimellal: 'Béni Mellal',
  'béni mellal': 'Béni Mellal',
  'beni mellal': 'Béni Mellal',
  'بني ملال': 'Béni Mellal',
  nador: 'Nador',
  الناظور: 'Nador',
  taza: 'Taza',
  تازة: 'Taza',
  settat: 'Settat',
  سطات: 'Settat',
  berrechid: 'Berrechid',
  برشيد: 'Berrechid',
  khemisset: 'Khemisset',
  الخميسات: 'Khemisset',
  guelmim: 'Guelmim',
  كلميم: 'Guelmim',
  larache: 'Larache',
  العرائش: 'Larache',
  bouskoura: 'Bouskoura',
  بوسكورة: 'Bouskoura',
  darbouazza: 'Dar Bouazza',
  'dar bouazza': 'Dar Bouazza',
  'دار بوعزة': 'Dar Bouazza',
  nouaceur: 'Nouaceur',
  النواصر: 'Nouaceur',
  dakhla: 'Dakhla',
  الداخلة: 'Dakhla',
  laayoune: 'Laâyoune',
  laâyoune: 'Laâyoune',
  العيون: 'Laâyoune',
};

/**
 * Normalizes city string to its canonical French name used by Sendit courier
 */
export function normalizeMoroccanCity(rawCity: string): string {
  if (!rawCity) return 'Casablanca';
  const clean = rawCity.trim().toLowerCase().replace(/['"_-]/g, ' ').replace(/\s+/g, ' ');
  if (CITY_SYNONYMS[clean]) return CITY_SYNONYMS[clean];

  // Fuzzy check
  for (const [key, val] of Object.entries(CITY_SYNONYMS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }

  // Capitalize original if not found
  return rawCity.trim().charAt(0).toUpperCase() + rawCity.trim().slice(1);
}

