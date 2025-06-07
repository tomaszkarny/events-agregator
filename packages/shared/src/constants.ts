export const SUBSCRIPTION_PRICE_PLN = 9
export const COMMISSION_PERCENTAGE = 8
export const FREE_TRIAL_DAYS = 7

export { CITY_COORDINATES } from './constants/cities'

export const POLISH_CITIES = [
  'Warszawa',
  'Kraków',
  'Wrocław',
  'Poznań',
  'Gdańsk',
  'Szczecin',
  'Bydgoszcz',
  'Lublin',
  'Białystok',
  'Katowice',
  'Gdynia',
  'Częstochowa',
  'Radom',
  'Rzeszów',
  'Sosnowiec',
  'Toruń',
  'Kielce',
  'Gliwice',
  'Zabrze',
  'Olsztyn',
] as const

export type PolishCity = typeof POLISH_CITIES[number]

export const EVENT_CATEGORIES = {
  warsztaty: 'Warsztaty',
  spektakle: 'Spektakle',
  sport: 'Sport i rekreacja',
  edukacja: 'Edukacja',
  inne: 'Inne',
} as const

export const AGE_GROUPS = {
  baby: { min: 0, max: 2, label: 'Niemowlęta (0-2)' },
  toddler: { min: 2, max: 4, label: 'Maluchy (2-4)' },
  preschool: { min: 4, max: 6, label: 'Przedszkolaki (4-6)' },
  earlySchool: { min: 6, max: 9, label: 'Wczesnoszkolne (6-9)' },
  school: { min: 9, max: 12, label: 'Szkolne (9-12)' },
  teen: { min: 12, max: 18, label: 'Nastolatki (12+)' },
} as const