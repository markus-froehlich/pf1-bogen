import { useState } from 'react'
import { Plus, X, ArrowsLeftRight, Package } from '@phosphor-icons/react'
import { Sheet } from '../shell/Sheet.jsx'
import { useToast } from '../shell/toastContext.js'
import { EditSheet, TextField, NumField, Field } from '../combat/EditSheet.jsx'
import { Switch } from '../combat/ui.jsx'
import { COINS, TO_GP, carriedWeight, carryTier, coinValueGp } from './carry.js'
import './inventory.css'

const COIN_LABEL = { de: { pp: 'PM', gp: 'GM', sp: 'SM', cp: 'KM' }, en: { pp: 'PP', gp: 'GP', sp: 'SP', cp: 'CP' } }
const COIN_NAME = { pp: ['Platin', 'Platinum'], gp: ['Gold', 'Gold'], sp: ['Silber', 'Silver'], cp: ['Kupfer', 'Copper'] }
const MAGIC_SLOTS = [
  ['kopf', 'Kopf', 'Head'], ['stirn', 'Stirn', 'Headband'], ['hals', 'Hals', 'Neck'], ['schultern', 'Schultern', 'Shoulders'],
  ['brust', 'Brust', 'Chest'], ['koerper', 'Körper', 'Body'], ['guertel', 'Gürtel', 'Belt'], ['handgelenke', 'Handgelenke', 'Wrists'],
  ['haende', 'Hände', 'Hands'], ['ring1', 'Ring 1', 'Ring 1'], ['ring2', 'Ring 2', 'Ring 2'], ['fuesse', 'Füße', 'Feet'],
]
const BAGS = ['Rucksack', 'Gürtel', 'Beutel', 'Satteltasche', 'Kiste']
const fmt = (n, d = 2) => (Number(n) || 0).toLocaleString('de-DE', { maximumFractionDigits: d })
const genId = () => 'itm_' + Math.random().toString(36).slice(2, 10)

function ItemEditor({ item, onSave, onDelete, onClose, lang }) {
  const L = lang === 'de'
  const [d, setD] = useState(() => item ? { ...item } : { id: genId(), name: '', qty: 1, weight: 0, gp: 0, notes: '', bag: '' })
  const set = p => setD(prev => ({ ...prev, ...p }))
  return (
    <EditSheet lang={lang} title={item ? (L ? 'Gegenstand bearbeiten' : 'Edit item') : (L ? 'Gegenstand anlegen' : 'Add item')}
      onDelete={item ? () => onDelete(item.id) : null} onCancel={onClose} saveDisabled={!d.name.trim()}
      onSave={() => onSave({ ...d, name: d.name.trim(), qty: Math.max(1, Number(d.qty) || 1), weight: Math.max(0, Number(d.weight) || 0), gp: Math.max(0, Number(d.gp) || 0) })}>
      <TextField label="Name" value={d.name} onChange={v => set({ name: v })} placeholder={L ? 'z. B. Seil (15 m)' : 'e.g. Rope'} />
      <NumField label={L ? 'Menge' : 'Quantity'} value={d.qty} onChange={v => set({ qty: v })} min={1} max={999} />
      <TextField label={L ? 'Gewicht je Stück (Pfd.)' : 'Weight each (lb)'} value={String(d.weight ?? '')} onChange={v => set({ weight: v.replace(',', '.') })} placeholder="0" />
      <TextField label={L ? 'Preis je Stück (GM)' : 'Price each (gp)'} value={String(d.gp ?? '')} onChange={v => set({ gp: v.replace(',', '.') })} placeholder="0" />
      <Field label={L ? 'Behälter' : 'Container'} hint={L ? 'Leer = am Körper getragen' : 'Empty = worn'}>
        <div className="nc-chips">
          {['', ...BAGS].map(b => <button key={b || 'worn'} className={`nc-chip ${(d.bag ?? '') === b ? 'is-on' : ''}`} onClick={() => set({ bag: b })}>{b || (L ? 'Getragen' : 'Worn')}</button>)}
        </div>
        <input className="nc-input" value={d.bag ?? ''} onChange={e => set({ bag: e.target.value })} placeholder={L ? 'Anderer Behälter' : 'Other container'} />
      </Field>
      <TextField label={L ? 'Notiz' : 'Note'} value={d.notes} onChange={v => set({ notes: v })} placeholder={L ? 'Fundort, Wirkung …' : 'Note'} />
    </EditSheet>
  )
}

function Converter({ lang }) {
  const L = lang === 'de'
  const lbl = COIN_LABEL[L ? 'de' : 'en']
  const [amt, setAmt] = useState('')
  const [from, setFrom] = useState('gp')
  const v = parseFloat(String(amt).replace(',', '.')) || 0
  return (
    <div className="nc-edit">
      <div className="nc-edit-head"><span className="nc-sheet-title">{L ? 'Münzen umrechnen' : 'Convert coins'}</span></div>
      <input className="nc-input" inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value)} placeholder="0" aria-label={L ? 'Betrag' : 'Amount'} />
      <div className="nc-seg is-full">{COINS.map(k => <button key={k} className={`nc-seg-opt ${from === k ? 'is-on' : ''}`} onClick={() => setFrom(k)}>{lbl[k]}</button>)}</div>
      <div className="nc-coin-grid">
        {COINS.map(k => <div key={k} className={`nc-coin is-${k}`}><span className="nc-coin-label">{lbl[k]}</span><span className="nc-coin-conv">{fmt((v * TO_GP[from]) / TO_GP[k], 4)}</span></div>)}
      </div>
      <span className="nc-hint">{L ? '1 PM = 10 GM · 1 GM = 10 SM · 1 SM = 10 KM' : '1 pp = 10 gp · 1 gp = 10 sp · 1 sp = 10 cp'}</span>
    </div>
  )
}

export function InventoryView({ char, setInventory, setMagicSlots, carryThresholds, lang, layout }) {
  const L = lang === 'de'
  const toast = useToast()
  const lbl = COIN_LABEL[L ? 'de' : 'en']
  const [sheet, setSheet] = useState(null)
  const [quick, setQuick] = useState({ name: '', weight: '' })
  const inv = char.inventory ?? {}
  const coins = inv.coins ?? {}
  const items = inv.items ?? []
  const w = carriedWeight(inv)
  const t = carryThresholds ?? { light: 0, medium: 0, heavy: 0 }
  const tier = carryTier(w.total, t)
  const overloaded = w.total > t.heavy
  const itemsGp = items.reduce((s, it) => s + (Number(it.gp) || 0) * (Number(it.qty) || 1), 0)
  const close = () => setSheet(null)

  const setCoin = (k, raw) => setInventory(prev => ({ ...prev, coins: { ...(prev.coins ?? {}), [k]: Math.max(0, parseInt(String(raw).replace(/\D/g, ''), 10) || 0) } }))
  const saveItem = it => { setInventory(prev => { const list = prev.items ?? []; return { ...prev, items: list.some(x => x.id === it.id) ? list.map(x => (x.id === it.id ? it : x)) : [...list, it] } }); close() }
  const removeItem = id => {
    const prev = items
    const it = items.find(x => x.id === id)
    setInventory(p => ({ ...p, items: (p.items ?? []).filter(x => x.id !== id) })); close()
    toast(L ? `${it?.name ?? 'Gegenstand'} entfernt` : 'Item removed', { undo: () => setInventory(p => ({ ...p, items: prev })) })
  }
  const quickAdd = () => {
    const name = quick.name.trim()
    if (!name) return
    saveItem({ id: genId(), name, qty: 1, weight: Math.max(0, parseFloat(quick.weight.replace(',', '.')) || 0), gp: 0, notes: '', bag: '' })
    setQuick({ name: '', weight: '' })
  }

  // Segmentbalken: je Stufe Anteil innerhalb ihres Bereichs
  const seg = (lo, hi) => Math.max(0, Math.min(1, (w.total - lo) / Math.max(1, hi - lo)))
  const segs = [['light', 0, t.light], ['medium', t.light, t.medium], ['heavy', t.medium, t.heavy]]
  const tierLabel = overloaded ? (L ? 'Überladen' : 'Overloaded') : { light: L ? 'Leicht' : 'Light', medium: L ? 'Mittel' : 'Medium', heavy: L ? 'Schwer' : 'Heavy' }[tier]

  const groups = {}
  for (const it of items) (groups[it.bag?.trim() || ''] ??= []).push(it)
  const groupKeys = Object.keys(groups).sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b, 'de')))

  return (
    <div className="nc-inv">
      <section className="nc-inv-block">
        <span className="nc-spell-block-title">{L ? 'Münzen' : 'Coins'}</span>
        <div className="nc-coin-grid">
          {COINS.map(k => (
            <label key={k} className={`nc-coin is-${k}`}>
              <span className="nc-coin-label" title={COIN_NAME[k][L ? 0 : 1]}>{lbl[k]}</span>
              <input className="nc-coin-input" inputMode="numeric" value={String(coins[k] ?? 0)} onChange={e => setCoin(k, e.target.value)}
                onFocus={e => e.target.select()} aria-label={COIN_NAME[k][L ? 0 : 1]} />
            </label>
          ))}
        </div>
        <div className="nc-inv-coin-foot">
          <span className="nc-hint">≈ {fmt(coinValueGp(coins))} {lbl.gp}{itemsGp ? ` · ${L ? 'mit Gegenständen' : 'with items'} ${fmt(coinValueGp(coins) + itemsGp)} ${lbl.gp}` : ''} · {L ? 'Münzgewicht' : 'Coin weight'} {fmt(w.coinWeight, 1)} Pfd.</span>
          <button className="nc-btn nc-btn-ghost" onClick={() => setSheet({ type: 'conv' })}><ArrowsLeftRight />{L ? 'Umrechnen' : 'Convert'}</button>
        </div>
      </section>

      <section className="nc-card nc-card-pad nc-carry">
        <div className="nc-carry-top">
          <span className="nc-row-text"><span className="nc-muted">{L ? 'Traglast' : 'Load'}</span>
            <span className="nc-carry-total">{fmt(w.total, 1)} Pfd.</span></span>
          <span className={`nc-tag nc-carry-tag is-${overloaded ? 'over' : tier}`}>{tierLabel}</span>
        </div>
        <div className="nc-carry-bars">
          {segs.map(([k, lo, hi]) => (
            <div key={k} className={`nc-carry-seg is-${k}`}>
              <div className="nc-carry-bar"><div style={{ width: `${seg(lo, hi) * 100}%` }} /></div>
              <span className="nc-carry-lim">{{ light: L ? 'Leicht' : 'Light', medium: L ? 'Mittel' : 'Medium', heavy: L ? 'Schwer' : 'Heavy' }[k]} ≤ {fmt(hi, 1)}</span>
            </div>
          ))}
        </div>
        <button className="nc-set-row nc-switch-row" onClick={() => setInventory(p => ({ ...p, count_coin_weight: !w.countCoins }))} aria-pressed={w.countCoins}>
          <span className="nc-set-label">{L ? 'Münzgewicht mitzählen' : 'Count coin weight'}</span><Switch on={w.countCoins} />
        </button>
        <button className="nc-set-row nc-switch-row" onClick={() => setInventory(p => ({ ...p, apply_carry_movement: !(p.apply_carry_movement === true) }))} aria-pressed={inv.apply_carry_movement === true}>
          <span className="nc-set-text"><span className="nc-set-label">{L ? 'Traglast senkt Bewegung' : 'Load reduces speed'}</span>
            <span className="nc-set-hint">{L ? 'Mittlere/schwere Last wie Rüstung (GRW); aus = wie Excel' : 'Medium/heavy load like armor'}</span></span>
          <Switch on={inv.apply_carry_movement === true} />
        </button>
      </section>

      <section className="nc-inv-block">
        <span className="nc-spell-block-title">{L ? `Gegenstände (${items.length})` : `Items (${items.length})`} · {fmt(w.items, 1)} Pfd.</span>
        <div className="nc-card nc-card-list">
          {groupKeys.map(key => (
            <div key={key || '__worn'} className="nc-inv-group">
              {key && <span className="nc-inv-bag"><Package />{key}</span>}
              {groups[key].map(it => (
                <div key={it.id} className="nc-inv-row">
                  <button className="nc-spell-main" onClick={() => setSheet({ type: 'item', id: it.id })}>
                    <span className="nc-spell-name">{it.name}{Number(it.qty) > 1 && <span className="nc-muted">×{it.qty}</span>}</span>
                    {(it.notes || it.gp > 0) && <span className="nc-row-sub nc-ellipsis">{[it.gp > 0 ? `${fmt(it.gp)} ${lbl.gp}` : null, it.notes].filter(Boolean).join(' · ')}</span>}
                  </button>
                  <span className="nc-inv-weight">{Number(it.weight) ? `${fmt((Number(it.weight) || 0) * (Number(it.qty) || 1), 1)} Pfd.` : '—'}</span>
                  <button className="nc-icon-btn nc-muted" onClick={() => removeItem(it.id)} aria-label={L ? 'Entfernen' : 'Remove'}><X /></button>
                </div>
              ))}
            </div>
          ))}
          {!items.length && <span className="nc-empty">{L ? 'Noch keine Gegenstände.' : 'No items yet.'}</span>}
          <form className="nc-inv-quick" onSubmit={e => { e.preventDefault(); quickAdd() }}>
            <input className="nc-input" value={quick.name} onChange={e => setQuick(q => ({ ...q, name: e.target.value }))} placeholder={L ? 'Schnell hinzufügen: Name' : 'Quick add: name'} aria-label="Name" />
            <input className="nc-input nc-inv-quick-w" inputMode="decimal" value={quick.weight} onChange={e => setQuick(q => ({ ...q, weight: e.target.value }))} placeholder="Pfd." aria-label={L ? 'Gewicht (Pfd.)' : 'Weight (lb)'} />
            <button type="submit" className="nc-icon-btn nc-accent" disabled={!quick.name.trim()} aria-label={L ? 'Hinzufügen' : 'Add'}><Plus /></button>
          </form>
          <button className="nc-add-row" onClick={() => setSheet({ type: 'item', id: null })}><Plus />{L ? 'Gegenstand mit Details anlegen' : 'Add item with details'}</button>
        </div>
      </section>

      <section className="nc-inv-block">
        <span className="nc-spell-block-title">{L ? 'Magische Plätze' : 'Magic slots'}</span>
        <div className="nc-slot-grid">
          {MAGIC_SLOTS.map(([id, de, en]) => (
            <label key={id} className="nc-magic-slot">
              <span className="nc-magic-label">{L ? de : en}</span>
              <input className="nc-magic-input" value={char.magic_slots?.[id] ?? ''} placeholder="—" onChange={e => setMagicSlots(id, e.target.value)} />
            </label>
          ))}
        </div>
      </section>

      <Sheet open={!!sheet} onClose={close} layout={layout} label={L ? 'Inventar' : 'Inventory'}>
        {sheet?.type === 'item' && <ItemEditor key={sheet.id ?? 'new'} item={items.find(x => x.id === sheet.id) ?? null} onSave={saveItem} onDelete={removeItem} onClose={close} lang={lang} />}
        {sheet?.type === 'conv' && <Converter lang={lang} />}
      </Sheet>
    </div>
  )
}
