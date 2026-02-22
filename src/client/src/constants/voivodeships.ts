export const VOIVODESHIPS = [
  'dolnoslaskie',
  'kujawsko-pomorskie',
  'lubelskie',
  'lubuskie',
  'lodzkie',
  'malopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'slaskie',
  'swietokrzyskie',
  'warminsko-mazurskie',
  'wielkopolskie',
  'zachodniopomorskie',
] as const

export type Voivodeship = (typeof VOIVODESHIPS)[number]

export const VOIVODESHIP_LABELS: Record<Voivodeship, string> = {
  dolnoslaskie: 'Dolnośląskie',
  'kujawsko-pomorskie': 'Kujawsko-Pomorskie',
  lubelskie: 'Lubelskie',
  lubuskie: 'Lubuskie',
  lodzkie: 'Łódzkie',
  malopolskie: 'Małopolskie',
  mazowieckie: 'Mazowieckie',
  opolskie: 'Opolskie',
  podkarpackie: 'Podkarpackie',
  podlaskie: 'Podlaskie',
  pomorskie: 'Pomorskie',
  slaskie: 'Śląskie',
  swietokrzyskie: 'Świętokrzyskie',
  'warminsko-mazurskie': 'Warmińsko-Mazurskie',
  wielkopolskie: 'Wielkopolskie',
  zachodniopomorskie: 'Zachodniopomorskie',
}
