import type { StopType } from '../types'

// VARIANTY CESTY
// Michael diktuje každou variantu. Na mapě je jen to, co zadal: přílet (letiště),
// základny a hotely. Cena se počítá z reálných položek níže (nejdražší ubytování
// v každé základně = worst case).

// Sdílené pro všechny varianty:
export const SHARED = {
  flight: 'Praha ↔ Tirana (zpáteční, všichni 4)',
  flightLink:
    'https://www.skyscanner.cz/doprava/lety/prg/tira/260814/260823/?adultsv2=4&cabinclass=economy&rtn=1',
  note: 'Termíny i ceny se u jednotlivých variant můžou lišit.',
  departTime: '06:00',
  arriveTime: '08:00',
  arriveNote:
    'Odlet z Prahy v 6:00, přílet do Tirany kolem 8:00 (stejné pásmo, žádný časový posun). Půjčovna auta vyzvedne přímo na letišti.',
}

// Výchozí ceny (dají se přepsat u konkrétní varianty).
export const FLIGHT_PP_CZK = 4500 // letenka na osobu, zpáteční
export const CAR_RENTAL_CZK = 9000 // půjčení auta na celý výlet (skupina)
export const FUEL_TOTAL_CZK = 3500 // benzín paušálně za celý výlet (skupina)

export interface HotStop {
  name: string
  type: StopType
  lat: number
  lng: number
  note?: string
}

export interface Lodging {
  name: string
  priceCzk: number
  breakfast?: boolean
  link: string
  note?: string // krátký štítek
  detail?: string // delší popis
  lat?: number // přibližně, na úroveň města (Booking skrývá přesnou adresu)
  lng?: number
}

export interface Stint {
  base: string
  dates: string
  nights: number
  lodging?: Lodging[]
}

export interface PlanVariant {
  id: string
  label: string
  name: string
  tagline: string
  dateRange: string
  stints: Stint[]
  hotStops: HotStop[]
  mapCenter: [number, number]
  mapZoom: number
  endNote?: string
  driveKm?: number
  // Přepis výchozích cen pro tuto variantu:
  flightPpCzk?: number
  flightTotalCzk?: number // reálná koupená cena letenek za všechny 4
  carRentalCzk?: number
  carOptions?: { name: string; priceCzk: number; link?: string }[]
  fuelCzk?: number
}

export const variantNights = (v: PlanVariant) => v.stints.reduce((n, s) => n + s.nights, 0)

// Celková cena varianty. Ubytování = nejdražší varianta v každé základně.
export function variantCost(v: PlanVariant) {
  const stay = v.stints.reduce((s, st) => {
    const prices = (st.lodging ?? []).map((l) => l.priceCzk)
    return s + (prices.length ? Math.max(...prices) : 0)
  }, 0)
  const missingLodging = v.stints.filter((st) => !st.lodging?.length).map((st) => st.base)
  const flight = v.flightTotalCzk ?? (v.flightPpCzk ?? FLIGHT_PP_CZK) * 4
  const flightPp = Math.round(flight / 4)
  const car = v.carOptions?.length
    ? Math.max(...v.carOptions.map((o) => o.priceCzk))
    : v.carRentalCzk ?? CAR_RENTAL_CZK
  const fuel = v.fuelCzk ?? FUEL_TOTAL_CZK
  const total = stay + flight + car + fuel
  return { stay, flight, flightPp, car, fuel, total, perPerson: Math.round(total / 4), missingLodging }
}

const AIRPORT: HotStop = {
  name: 'Letiště Tirana (přílet)',
  type: 'endpoint',
  lat: 41.4147,
  lng: 19.7206,
  note: 'Praha → Tirana, odsud autem.',
}

// Ubytování sdílené variantami B a C (vybrané):
const DURRES_LODGING: Lodging[] = [
  {
    name: 'Aquila D',
    priceCzk: 7081,
    breakfast: true,
    note: 'Rezervováno',
    detail: 'Rruga Egnatia. 2 pokoje, se snídaní. Rezervováno, zatím neplaceno.',
    lat: 41.323,
    lng: 19.443,
    link: 'https://www.booking.com/hotel/al/aquila-d.html?checkin=2026-08-14&checkout=2026-08-16&group_adults=4&no_rooms=2&req_adults=4',
  },
]

const VLORE_LODGING: Lodging[] = [
  {
    name: 'Villa Solis',
    priceCzk: 6114,
    breakfast: true,
    note: 'Rezervováno',
    detail: 'Vlorë, 16.–18. 8. Rezervováno, zatím neplaceno. Poloha přibližná.',
    lat: 40.458,
    lng: 19.49,
    link: 'https://www.booking.com/searchresults.html?ss=Villa%20Solis%20Vlor%C3%AB&checkin=2026-08-16&checkout=2026-08-18&group_adults=4&no_rooms=2&req_adults=4',
  },
]

const DURRES_STOP: HotStop = { name: 'Durrës', type: 'relaxed', lat: 41.3231, lng: 19.4414, note: '1. základna' }
const VLORE_STOP: HotStop = { name: 'Vlorë', type: 'relaxed', lat: 40.4686, lng: 19.4892, note: 'základna' }
const SARANDE_STOP: HotStop = { name: 'Sarandë', type: 'relaxed', lat: 39.8756, lng: 20.005, note: 'základna' }

export const VARIANTS: PlanVariant[] = [
  {
    id: 'c',
    label: 'C',
    name: 'Durrës, Vlorë, Sarandë',
    tagline: 'Durrës 2 noci, Vlorë 2 noci, Sarandë 4 noci (18.–22.), pak domů.',
    dateRange: '14.–22. 8.',
    flightTotalCzk: 19463,
    carOptions: [
      { name: 'Audi A6 (Alpha Rent)', priceCzk: 10000, link: 'https://alpha-rent.com/' },
      { name: 'Audi A6 (24-7 Rental)', priceCzk: 8500, link: 'https://24-7rentalcar.com/cars/audi-a6/' },
    ],
    stints: [
      { base: 'Durrës', dates: '14.–16. 8.', nights: 2, lodging: DURRES_LODGING },
      { base: 'Vlorë', dates: '16.–18. 8.', nights: 2, lodging: VLORE_LODGING },
      {
        base: 'Sarandë',
        dates: '18.–22. 8.',
        nights: 4,
        lodging: [
          {
            name: 'Apartmán 2 ložnice, kousek od pláže',
            priceCzk: 14770,
            note: 'Rezervováno',
            detail: 'Plnohodnotný byt u pláže, 4 noci (18.–22.). Rezervováno, zatím neplaceno.',
            lat: 39.873,
            lng: 20.007,
            link: 'https://www.booking.com/hotel/al/stunning-two-bedrooms-apartment-steps-from-the-beach.html?group_adults=4&no_rooms=2&req_adults=4&checkin=2026-08-18&checkout=2026-08-22',
          },
        ],
      },
    ],
    hotStops: [
      AIRPORT,
      { ...DURRES_STOP, note: '1. základna, 14.–16. 8.' },
      { ...VLORE_STOP, note: '2. základna, 16.–18. 8.' },
      { ...SARANDE_STOP, note: '3. základna, 18.–22. 8.' },
    ],
    endNote: '22. 8. přímá cesta na letiště (Tirana).',
    driveKm: 800,
    mapCenter: [40.5, 19.7],
    mapZoom: 8,
  },
]
