import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, EDITOR_EMAIL } from './lib/supabase'
import * as api from './lib/api'
import type {
  Currency,
  Day,
  Expense,
  ExpenseCategory,
  NumberedPlace,
  Place,
  Reservation,
  StopType,
  TripData,
  Trip,
} from './types'

export type View = 'plans' | 'planmap' | 'explore' | 'overview' | 'itinerary' | 'todo' | 'budget'
export type Mode = 'edit' | 'view'

// ── patch → DB column mappers ───────────────────────────────────────────────
function placeRow(p: Partial<Place>): Record<string, any> {
  const r: Record<string, any> = {}
  if ('dayId' in p) r.day_id = p.dayId
  if ('name' in p) r.name = p.name
  if ('type' in p) r.type = p.type
  if ('blurb' in p) r.blurb = p.blurb
  if ('about' in p) r.about = p.about
  if ('lat' in p) r.lat = p.lat
  if ('lng' in p) r.lng = p.lng
  if ('photo' in p) r.photo = p.photo
  if ('link' in p) r.link = p.link
  if ('time' in p) r.scheduled_time = p.time
  if ('budgetAmount' in p) r.budget_amount = p.budgetAmount
  if ('budgetCurrency' in p) r.budget_currency = p.budgetCurrency
  if ('visited' in p) r.visited = p.visited
  if ('sortOrder' in p) r.sort_order = p.sortOrder
  return r
}
function dayRow(d: Partial<Day>): Record<string, any> {
  const r: Record<string, any> = {}
  if ('date' in d) r.date = d.date
  if ('title' in d) r.title = d.title
  if ('note' in d) r.note = d.note
  if ('budgetAmount' in d) r.budget_amount = d.budgetAmount
  if ('budgetCurrency' in d) r.budget_currency = d.budgetCurrency
  if ('sortOrder' in d) r.sort_order = d.sortOrder
  return r
}
function tripRow(t: Partial<Trip>): Record<string, any> {
  const r: Record<string, any> = {}
  if ('title' in t) r.title = t.title
  if ('summary' in t) r.summary = t.summary
  if ('notes' in t) r.notes = t.notes
  if ('transport' in t) r.transport = t.transport
  if ('heroPhoto' in t) r.hero_photo = t.heroPhoto
  if ('eurToCzk' in t) r.eur_to_czk = t.eurToCzk
  if ('budgetTotalCzk' in t) r.budget_total_czk = t.budgetTotalCzk
  if ('dateStart' in t) r.date_start = t.dateStart
  if ('dateEnd' in t) r.date_end = t.dateEnd
  if ('mapCenter' in t && t.mapCenter) {
    r.map_center_lat = t.mapCenter[0]
    r.map_center_lng = t.mapCenter[1]
  }
  if ('mapZoom' in t) r.map_zoom = t.mapZoom
  return r
}
function expenseRow(e: Partial<Expense>): Record<string, any> {
  const r: Record<string, any> = {}
  if ('dayId' in e) r.day_id = e.dayId
  if ('placeId' in e) r.place_id = e.placeId
  if ('label' in e) r.label = e.label
  if ('amount' in e) r.amount = e.amount
  if ('currency' in e) r.currency = e.currency
  if ('category' in e) r.category = e.category
  if ('date' in e) r.date = e.date
  if ('paidBy' in e) r.paid_by = e.paidBy
  if ('splitAmong' in e) r.split_among = e.splitAmong
  if ('sortOrder' in e) r.sort_order = e.sortOrder
  return r
}

interface Store {
  data: TripData | null
  loading: boolean
  error: string | null
  reload: () => void

  user: User | null
  isEditor: boolean
  mode: Mode
  setMode: (m: Mode) => void
  canEdit: boolean
  authBusy: boolean
  signIn: (password: string) => Promise<string | null>
  signOut: () => void

  view: View
  setView: (v: View) => void
  activeVariantId: string | null
  setActiveVariantId: (id: string | null) => void
  planFocus: string
  setPlanFocus: (s: string) => void
  exploreState: Record<string, 'added' | 'rejected'>
  setExplore: (id: string, s: 'added' | 'rejected' | null) => void
  todoState: Record<string, boolean>
  setTodoDone: (id: string, done: boolean) => void
  activeId: string | null
  setActiveId: (id: string | null) => void
  mapMobileOpen: boolean
  setMapMobileOpen: (b: boolean) => void
  saving: boolean

  numbered: NumberedPlace[]
  numberOf: (placeId: string) => number | null
  placesOfDay: (dayId: string) => Place[]
  unscheduled: Place[]

  patchTrip: (patch: Partial<Trip>) => void
  addTraveler: (name: string) => void
  removeTraveler: (id: string) => void

  patchDay: (id: string, patch: Partial<Day>) => void

  addPlace: (
    dayId: string | null,
    fields: { name: string; lat?: number; lng?: number; blurb?: string; type?: StopType },
  ) => void
  patchPlace: (id: string, patch: Partial<Place>) => void
  deletePlace: (id: string) => Place | null
  restorePlace: (p: Place) => void
  movePlace: (id: string, dayId: string | null) => void
  reorderWithinDay: (dayId: string, fromIndex: number, toIndex: number) => void

  addExpense: (fields: {
    label: string
    amount: number
    currency: Currency
    category: ExpenseCategory
    date?: string | null
    dayId?: string | null
    placeId?: string | null
    paidBy?: string | null
  }) => void
  patchExpense: (id: string, patch: Partial<Expense>) => void
  deleteExpense: (id: string) => void

  addReservation: (kind: Reservation['kind']) => void
  patchReservation: (id: string, patch: Partial<Reservation>) => void
  deleteReservation: (id: string) => void
}

const Ctx = createContext<Store | null>(null)
export const useStore = () => {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside provider')
  return s
}

export function StoreProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [data, setData] = useState<TripData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [mode, setMode] = useState<Mode>('view')
  const [authBusy, setAuthBusy] = useState(false)

  const [view, setView] = useState<View>('plans')
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  const [planFocus, setPlanFocus] = useState<string>('all')
  const [exploreState, setExploreStateRaw] = useState<Record<string, 'added' | 'rejected'>>(() => {
    try {
      return JSON.parse(localStorage.getItem('explore:v1') || '{}')
    } catch {
      return {}
    }
  })
  const setExplore = (id: string, s: 'added' | 'rejected' | null) => {
    setExploreStateRaw((prev) => {
      const next = { ...prev }
      if (s === null) delete next[id]
      else next[id] = s
      try {
        localStorage.setItem('explore:v1', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }
  const [todoState, setTodoStateRaw] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('todo:v1') || '{}')
    } catch {
      return {}
    }
  })
  const setTodoDone = (id: string, done: boolean) => {
    setTodoStateRaw((prev) => {
      const next = { ...prev, [id]: done }
      try {
        localStorage.setItem('todo:v1', JSON.stringify(next))
      } catch {
        /* ignore */
      }
      return next
    })
  }
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mapMobileOpen, setMapMobileOpen] = useState(false)

  const savingCount = useRef(0)
  const [saving, setSaving] = useState(false)

  // Track inflight writes for the "Saving / Saved" indicator. On error, resync
  // from the server so local state never silently diverges (no data loss).
  const run = useCallback(async (fn: () => Promise<void>) => {
    savingCount.current += 1
    setSaving(true)
    try {
      await fn()
    } catch (e: any) {
      console.error('write failed, resyncing', e)
      setError(e?.message ?? 'Save failed, reloading from server.')
      try {
        setData(await api.loadTrip(slug))
      } catch {}
      setTimeout(() => setError(null), 4000)
    } finally {
      savingCount.current -= 1
      if (savingCount.current <= 0) {
        savingCount.current = 0
        setSaving(false)
      }
    }
  }, [slug])

  const reload = useCallback(() => {
    setLoading(true)
    api
      .loadTrip(slug)
      .then((d) => {
        setData(d)
        setError(null)
      })
      .catch((e) => setError(e?.message ?? 'Could not load the trip.'))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    reload()
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [reload])

  const isEditor = !!user && user.email === EDITOR_EMAIL
  const canEdit = isEditor && mode === 'edit'

  const signIn = useCallback(async (password: string): Promise<string | null> => {
    setAuthBusy(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: EDITOR_EMAIL,
        password,
      })
      if (error) return error.message
      setMode('edit')
      return null
    } finally {
      setAuthBusy(false)
    }
  }, [])

  const signOut = useCallback(() => {
    supabase.auth.signOut()
    setMode('view')
  }, [])

  // ── computed: numbering in itinerary order ────────────────────────────────
  const { numbered, numberMap } = useMemo(() => {
    const list: NumberedPlace[] = []
    const map = new Map<string, number>()
    if (data) {
      const days = [...data.days].sort((a, b) => a.sortOrder - b.sortOrder)
      let n = 0
      days.forEach((day, dayIndex) => {
        const ps = data.places
          .filter((p) => p.dayId === day.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
        for (const place of ps) {
          n += 1
          list.push({ place, n, dayId: day.id, dayIndex })
          map.set(place.id, n)
        }
      })
    }
    return { numbered: list, numberMap: map }
  }, [data])

  const numberOf = useCallback((id: string) => numberMap.get(id) ?? null, [numberMap])

  const placesOfDay = useCallback(
    (dayId: string) =>
      (data?.places ?? [])
        .filter((p) => p.dayId === dayId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data],
  )

  const unscheduled = useMemo(
    () =>
      (data?.places ?? [])
        .filter((p) => p.dayId === null)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [data],
  )

  // ── mutators (optimistic + persist) ───────────────────────────────────────
  const setPlaces = (fn: (ps: Place[]) => Place[]) =>
    setData((d) => (d ? { ...d, places: fn(d.places) } : d))
  const setExpenses = (fn: (xs: Expense[]) => Expense[]) =>
    setData((d) => (d ? { ...d, expenses: fn(d.expenses) } : d))
  const setReservations = (fn: (xs: Reservation[]) => Reservation[]) =>
    setData((d) => (d ? { ...d, reservations: fn(d.reservations) } : d))

  const patchTrip: Store['patchTrip'] = (patch) => {
    setData((d) => (d ? { ...d, trip: { ...d.trip, ...patch } } : d))
    const id = data?.trip.id
    if (id) run(() => api.patchTripRow(id, tripRow(patch)))
  }

  const patchDay: Store['patchDay'] = (id, patch) => {
    setData((d) => (d ? { ...d, days: d.days.map((x) => (x.id === id ? { ...x, ...patch } : x)) } : d))
    run(() => api.patchDayRow(id, dayRow(patch)))
  }

  const addPlace: Store['addPlace'] = (dayId, fields) => {
    if (!data) return
    const tripId = data.trip.id
    const siblings = data.places.filter((p) => p.dayId === dayId)
    const sortOrder = siblings.length
      ? Math.max(...siblings.map((p) => p.sortOrder)) + 1
      : 0
    const tmpId = `tmp-${Math.abs(sortOrder * 7 + data.places.length * 31)}-${fields.name.length}`
    const optimistic: Place = {
      id: tmpId,
      dayId,
      name: fields.name,
      type: fields.type ?? 'classic',
      blurb: fields.blurb ?? '',
      about: '',
      lat: fields.lat ?? null,
      lng: fields.lng ?? null,
      photo: null,
      link: null,
      time: null,
      budgetAmount: null,
      budgetCurrency: 'CZK',
      visited: false,
      sortOrder,
    }
    setPlaces((ps) => [...ps, optimistic])
    if (fields.lat != null && fields.lng != null) setActiveId(tmpId)
    run(async () => {
      const saved = await api.insertPlaceRow({
        trip_id: tripId,
        day_id: dayId,
        name: optimistic.name,
        type: optimistic.type,
        blurb: optimistic.blurb,
        lat: optimistic.lat,
        lng: optimistic.lng,
        sort_order: sortOrder,
      })
      setPlaces((ps) => ps.map((p) => (p.id === tmpId ? saved : p)))
      setActiveId((cur) => (cur === tmpId ? saved.id : cur))
    })
  }

  const patchPlace: Store['patchPlace'] = (id, patch) => {
    if (id.startsWith('tmp-')) return // not persisted yet; ignore stray edits
    setPlaces((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)))
    run(() => api.patchPlaceRow(id, placeRow(patch)))
  }

  const deletePlace: Store['deletePlace'] = (id) => {
    const removed = data?.places.find((p) => p.id === id) ?? null
    setPlaces((ps) => ps.filter((p) => p.id !== id))
    if (!id.startsWith('tmp-')) run(() => api.deletePlaceRow(id))
    return removed
  }

  const restorePlace: Store['restorePlace'] = (p) => {
    if (!data) return
    setPlaces((ps) => [...ps, p])
    run(async () => {
      const saved = await api.insertPlaceRow({
        trip_id: data.trip.id,
        day_id: p.dayId,
        name: p.name,
        type: p.type,
        blurb: p.blurb,
        about: p.about,
        lat: p.lat,
        lng: p.lng,
        photo: p.photo,
        link: p.link,
        scheduled_time: p.time,
        budget_amount: p.budgetAmount,
        budget_currency: p.budgetCurrency,
        visited: p.visited,
        sort_order: p.sortOrder,
      })
      setPlaces((ps) => ps.map((x) => (x.id === p.id ? saved : x)))
    })
  }

  const movePlace: Store['movePlace'] = (id, dayId) => {
    if (id.startsWith('tmp-') || !data) return
    const siblings = data.places.filter((p) => p.dayId === dayId && p.id !== id)
    const sortOrder = siblings.length ? Math.max(...siblings.map((p) => p.sortOrder)) + 1 : 0
    patchPlace(id, { dayId, sortOrder })
  }

  const reorderWithinDay: Store['reorderWithinDay'] = (dayId, fromIndex, toIndex) => {
    if (!data) return
    const ps = data.places
      .filter((p) => p.dayId === dayId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    if (fromIndex < 0 || fromIndex >= ps.length || toIndex < 0 || toIndex >= ps.length) return
    const reordered = [...ps]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    const idToOrder = new Map(reordered.map((p, i) => [p.id, i]))
    setPlaces((all) =>
      all.map((p) => (idToOrder.has(p.id) ? { ...p, sortOrder: idToOrder.get(p.id)! } : p)),
    )
    run(async () => {
      await Promise.all(
        reordered
          .filter((p) => !p.id.startsWith('tmp-'))
          .map((p, i) => api.patchPlaceRow(p.id, { sort_order: i })),
      )
    })
  }

  const addExpense: Store['addExpense'] = (fields) => {
    if (!data) return
    const tripId = data.trip.id
    const sortOrder = data.expenses.length
      ? Math.max(...data.expenses.map((e) => e.sortOrder)) + 1
      : 0
    const tmpId = `tmp-e-${sortOrder}-${fields.label.length}`
    const optimistic: Expense = {
      id: tmpId,
      dayId: fields.dayId ?? null,
      placeId: fields.placeId ?? null,
      label: fields.label,
      amount: fields.amount,
      currency: fields.currency,
      category: fields.category,
      date: fields.date ?? null,
      paidBy: fields.paidBy ?? data.travelers[0]?.id ?? null,
      splitAmong: null,
      sortOrder,
    }
    setExpenses((xs) => [...xs, optimistic])
    run(async () => {
      const saved = await api.insertExpenseRow({
        trip_id: tripId,
        day_id: optimistic.dayId,
        place_id: optimistic.placeId,
        label: optimistic.label,
        amount: optimistic.amount,
        currency: optimistic.currency,
        category: optimistic.category,
        date: optimistic.date,
        paid_by: optimistic.paidBy,
        sort_order: sortOrder,
      })
      setExpenses((xs) => xs.map((x) => (x.id === tmpId ? saved : x)))
    })
  }

  const patchExpense: Store['patchExpense'] = (id, patch) => {
    if (id.startsWith('tmp-')) return
    setExpenses((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    run(() => api.patchExpenseRow(id, expenseRow(patch)))
  }

  const deleteExpense: Store['deleteExpense'] = (id) => {
    setExpenses((xs) => xs.filter((x) => x.id !== id))
    if (!id.startsWith('tmp-')) run(() => api.deleteExpenseRow(id))
  }

  const addReservation: Store['addReservation'] = (kind) => {
    if (!data) return
    const tripId = data.trip.id
    const sortOrder = data.reservations.length
      ? Math.max(...data.reservations.map((r) => r.sortOrder)) + 1
      : 0
    const tmpId = `tmp-r-${sortOrder}`
    const optimistic: Reservation = {
      id: tmpId,
      kind,
      title: 'New reservation',
      detail: null,
      dates: null,
      price: null,
      link: null,
      sortOrder,
    }
    setReservations((xs) => [...xs, optimistic])
    run(async () => {
      const saved = await api.insertReservationRow({
        trip_id: tripId,
        kind,
        title: optimistic.title,
        sort_order: sortOrder,
      })
      setReservations((xs) => xs.map((x) => (x.id === tmpId ? saved : x)))
    })
  }

  const patchReservation: Store['patchReservation'] = (id, patch) => {
    if (id.startsWith('tmp-')) return
    setReservations((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const row: Record<string, any> = {}
    if ('title' in patch) row.title = patch.title
    if ('detail' in patch) row.detail = patch.detail
    if ('dates' in patch) row.dates = patch.dates
    if ('price' in patch) row.price = patch.price
    if ('link' in patch) row.link = patch.link
    if ('kind' in patch) row.kind = patch.kind
    run(() => api.patchReservationRow(id, row))
  }

  const deleteReservation: Store['deleteReservation'] = (id) => {
    setReservations((xs) => xs.filter((x) => x.id !== id))
    if (!id.startsWith('tmp-')) run(() => api.deleteReservationRow(id))
  }

  const addTraveler: Store['addTraveler'] = (name) => {
    if (!data) return
    const tripId = data.trip.id
    const initials = name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
    const sortOrder = data.travelers.length
    const tmpId = `tmp-t-${sortOrder}`
    setData((d) =>
      d ? { ...d, travelers: [...d.travelers, { id: tmpId, name, initials, sortOrder }] } : d,
    )
    run(async () => {
      const saved = await api.insertTravelerRow({
        trip_id: tripId,
        name,
        initials,
        sort_order: sortOrder,
      })
      setData((d) =>
        d
          ? { ...d, travelers: d.travelers.map((t) => (t.id === tmpId ? saved : t)) }
          : d,
      )
    })
  }

  const removeTraveler: Store['removeTraveler'] = (id) => {
    setData((d) => (d ? { ...d, travelers: d.travelers.filter((t) => t.id !== id) } : d))
    if (!id.startsWith('tmp-')) run(() => api.deleteTravelerRow(id))
  }

  const store: Store = {
    data,
    loading,
    error,
    reload,
    user,
    isEditor,
    mode,
    setMode,
    canEdit,
    authBusy,
    signIn,
    signOut,
    view,
    setView,
    activeVariantId,
    setActiveVariantId,
    planFocus,
    setPlanFocus,
    exploreState,
    setExplore,
    todoState,
    setTodoDone,
    activeId,
    setActiveId,
    mapMobileOpen,
    setMapMobileOpen,
    saving,
    numbered,
    numberOf,
    placesOfDay,
    unscheduled,
    patchTrip,
    addTraveler,
    removeTraveler,
    patchDay,
    addPlace,
    patchPlace,
    deletePlace,
    restorePlace,
    movePlace,
    reorderWithinDay,
    addExpense,
    patchExpense,
    deleteExpense,
    addReservation,
    patchReservation,
    deleteReservation,
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}
