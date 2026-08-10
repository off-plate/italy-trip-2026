export interface TodoItem {
  id: string
  label: string
  note?: string
  link?: string
  linkLabel?: string
}

export interface TodoGroup {
  id: string
  title: string
  items: TodoItem[]
}

export const TODO_GROUPS: TodoGroup[] = [
  {
    id: 'before',
    title: 'Před odletem',
    items: [
      {
        id: 'esim',
        label: 'Zařídit eSIM (Saily)',
        note: 'Český roaming v Albánii nefunguje, potřeba eSIM přes appku Saily.',
      },
      { id: 'docs', label: 'Pasy a občanky pro všechny čtyři' },
      { id: 'cash', label: 'Vybrat hotovost', note: 'V Albánii dost míst preferuje cash před kartou.' },
    ],
  },
  {
    id: 'pack',
    title: 'Vzít s sebou',
    items: [
      { id: 'powerbank', label: 'Powerbanka', note: 'Plně nabitá.' },
      { id: 'powerbank2', label: 'Druhá (záložní) powerbanka', note: 'Plně nabitá.' },
      { id: 'sunglasses', label: 'Sluneční brýle' },
      { id: 'cap', label: 'Kšiltovka / klobouk' },
      { id: 'watch', label: 'Nabít Amazfit Helio Strap', note: 'Ať měří časy po celou cestu.' },
    ],
  },
  {
    id: 'scout',
    title: 'Najít předem',
    items: [
      { id: 'gyms', label: 'Posilovny poblíž základen' },
      { id: 'beaches', label: 'Pláže poblíž základen' },
    ],
  },
  {
    id: 'fun',
    title: 'Zábava',
    items: [{ id: 'music', label: 'Playlist albánské hudby do auta' }],
  },
  {
    id: 'experiences',
    title: 'Zážitky k rezervaci',
    items: [
      {
        id: 'osumi-packrafting',
        label: 'Zarezervovat packrafting v kaňonu Osumi',
        note: 'Exclusive Packrafting Osumi Canyons, Albrafting.',
        link: 'https://www.albrafting.org/tour/exclusive-packrafting-osumi-canyons',
        linkLabel: 'Otevřít nabídku →',
      },
    ],
  },
]
