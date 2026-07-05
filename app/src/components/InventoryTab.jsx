import { useState } from 'react'
import './InventoryTab.css'

function genId() { return 'itm_' + Math.random().toString(36).slice(2, 10) }

const EMPTY_ITEM = { id: '', name: '', qty: 1, weight: 0, gp: 0, notes: '', bag: '' }

const COIN_ORDER = ['pp', 'gp', 'sp', 'cp']
const COIN_LABEL_DE = { pp: 'PM', gp: 'GM', sp: 'SM', cp: 'KM' }
const COIN_LABEL_EN = { pp: 'PP', gp: 'GP', sp: 'SP', cp: 'CP' }
const COIN_COLOR = { pp: '#b0c4de', gp: '#c9a96e', sp: '#aaaaaa', cp: '#c87941' }
// Gold-Umrechnungskurs: 1 PP=10 GP, 1 GP=1 GP, 1 SP=0.1 GP, 1 CP=0.01 GP
const TO_GP = { pp: 10, gp: 1, sp: 0.1, cp: 0.01 }

const MAGIC_SLOTS = [
  { id: 'kopf',       de: 'Kopf',        en: 'Head'       },
  { id: 'stirn',      de: 'Stirn',       en: 'Headband'   },
  { id: 'hals',       de: 'Hals',        en: 'Neck'       },
  { id: 'schultern',  de: 'Schultern',   en: 'Shoulders'  },
  { id: 'brust',      de: 'Brust',       en: 'Chest'      },
  { id: 'koerper',    de: 'Körper',      en: 'Body'       },
  { id: 'guertel',    de: 'Gürtel',      en: 'Belt'       },
  { id: 'handgelenke',de: 'Handgelenke', en: 'Wrists'     },
  { id: 'haende',     de: 'Hände',       en: 'Hands'      },
  { id: 'ring1',      de: 'Ring 1',      en: 'Ring 1'     },
  { id: 'ring2',      de: 'Ring 2',      en: 'Ring 2'     },
  { id: 'fuesse',     de: 'Füße',        en: 'Feet'       },
]

export function InventoryTab({ char, setInventory, setMagicSlots, lang, carryThresholds }) {
  const L = lang === 'de'
  const COIN_LABEL = L ? COIN_LABEL_DE : COIN_LABEL_EN
  const [editId, setEditId] = useState(null)
  const [draft, setDraft]   = useState(EMPTY_ITEM)
  const [convOpen, setConvOpen] = useState(false)
  const [convFrom, setConvFrom] = useState('gp')
  const [convAmt, setConvAmt]   = useState('')
  const [slotsOpen, setSlotsOpen] = useState(false)

  const inv   = char.inventory ?? { coins: { pp:0,gp:0,sp:0,cp:0 }, items: [] }
  const coins = inv.coins ?? { pp:0,gp:0,sp:0,cp:0 }
  const items = inv.items ?? []
  const countCoins = inv.count_coin_weight !== false
  const applyCarryMov = inv.apply_carry_movement === true

  // Total weight
  const totalItemWeight = items.reduce((s, it) => s + (Number(it.weight) || 0) * (Number(it.qty) || 1), 0)
  const coinCount = (Number(coins.pp)||0)+(Number(coins.gp)||0)+(Number(coins.sp)||0)+(Number(coins.cp)||0)
  const carriedKg = Math.round((totalItemWeight + (countCoins ? coinCount * 1.5 / 1000 : 0)) * 10) / 10
  const totalItemGp = items.reduce((s, it) => s + (Number(it.gp) || 0) * (Number(it.qty) || 1), 0)

  // Carry tier
  function carryTier() {
    if (!carryThresholds) return ''
    if (carriedKg <= carryThresholds.light)  return 'light'
    if (carriedKg <= carryThresholds.medium) return 'medium'
    return 'heavy'
  }

  // Gold value (coins + item market value)
  const totalGp = COIN_ORDER.reduce((s, k) => s + (Number(coins[k]) || 0) * TO_GP[k], 0)
  const grandTotalGp = totalGp + totalItemGp

  function setCoin(key, val) {
    setInventory(prev => ({
      ...prev,
      coins: { ...(prev.coins ?? {}), [key]: Math.max(0, Number(val) || 0) }
    }))
  }

  function openNew() {
    setDraft({ ...EMPTY_ITEM, id: genId() })
    setEditId('__new__')
  }

  function openEdit(item) {
    setDraft({ ...item })
    setEditId(item.id)
  }

  function saveDraft() {
    if (!draft.name.trim()) return
    setInventory(prev => {
      const items = prev.items ?? []
      if (editId === '__new__') return { ...prev, items: [...items, draft] }
      return { ...prev, items: items.map(it => it.id === editId ? draft : it) }
    })
    setEditId(null)
  }

  function deleteItem(id) {
    setInventory(prev => ({ ...prev, items: (prev.items ?? []).filter(it => it.id !== id) }))
    if (editId === id) setEditId(null)
  }

  const wc = carryTier()

  return (
    <div className="inventory-tab">

      {/* Coins */}
      <div className="inv-coins">
        <span className="inv-section-label">{L ? 'Münzen' : 'Coins'}</span>
        <div className="coins-row">
          {COIN_ORDER.map(k => (
            <div key={k} className="coin-cell">
              <label className="coin-label" style={{ color: COIN_COLOR[k] }}>{COIN_LABEL[k]}</label>
              <input
                className="coin-input"
                type="number" min={0}
                value={coins[k] ?? 0}
                onChange={e => setCoin(k, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="coins-total">
          {L ? 'Münzwert' : 'Coin value'}: {totalGp % 1 === 0 ? totalGp : totalGp.toFixed(2)} {COIN_LABEL.gp}
          {totalItemGp > 0 && (
            <span className="coins-grand-total">
              · {L ? 'Gesamt' : 'Total'}: {grandTotalGp % 1 === 0 ? grandTotalGp : grandTotalGp.toFixed(2)} {COIN_LABEL.gp}
            </span>
          )}
        </div>
      </div>

      {/* Coin converter */}
      <div className="inv-conv-wrap">
        <button className="inv-conv-toggle" onClick={() => setConvOpen(o => !o)}>
          ⇄ {L ? 'Wechselkurs-Rechner' : 'Currency converter'} {convOpen ? '▲' : '▼'}
        </button>
        {convOpen && (
          <div className="inv-conv-panel">
            <div className="conv-input-row">
              <input
                className="conv-amt-input"
                type="number" min={0} step={0.01}
                placeholder="0"
                value={convAmt}
                onChange={e => setConvAmt(e.target.value)}
              />
              <select className="conv-from-sel" value={convFrom} onChange={e => setConvFrom(e.target.value)}>
                {COIN_ORDER.map(k => <option key={k} value={k}>{COIN_LABEL[k]}</option>)}
              </select>
              <span className="conv-eq">=</span>
            </div>
            <div className="conv-results">
              {COIN_ORDER.map(k => {
                const amt = parseFloat(convAmt) || 0
                const res = (amt * TO_GP[convFrom]) / TO_GP[k]
                const display = res % 1 === 0 ? res : parseFloat(res.toFixed(4))
                return (
                  <div key={k} className={`conv-result-cell ${k === convFrom ? 'active-denom' : ''}`}>
                    <span className="conv-result-val" style={{ color: COIN_COLOR[k] }}>{display}</span>
                    <span className="conv-result-label">{COIN_LABEL[k]}</span>
                  </div>
                )
              })}
            </div>
            <div className="conv-rates">{L ? `Kurs: 1PM=10GM · 1GM=10SM · 1SM=10KM` : 'Rate: 1PP=10GP · 1GP=10SP · 1SP=10CP'}</div>
          </div>
        )}
      </div>

      {/* Magic equipment slots */}
      <div className="inv-magic-wrap">
        <button className="inv-magic-toggle" onClick={() => setSlotsOpen(o => !o)}>
          ✦ {L ? 'Magische Ausrüstungsslots' : 'Magic Equipment Slots'} {slotsOpen ? '▲' : '▼'}
        </button>
        {slotsOpen && (
          <div className="inv-magic-grid">
            {MAGIC_SLOTS.map(slot => (
              <label key={slot.id} className="inv-magic-cell">
                <span className="inv-magic-label">{L ? slot.de : slot.en}</span>
                <input
                  className="inv-magic-input"
                  type="text"
                  placeholder="—"
                  value={(char.magic_slots ?? {})[slot.id] ?? ''}
                  onChange={e => setMagicSlots?.(slot.id, e.target.value)}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Tragegrenze + Gewicht */}
      {carryThresholds && (
        <div className="carry-row">
          <span className="carry-label">{L ? 'Tragelast' : 'Carry'}</span>
          <span className={`carry-tier carry-light ${wc === 'light' && carriedKg > 0 ? 'carry-active' : ''}`}>
            <span className="ct-tag">{L ? 'Leicht' : 'Light'}</span>
            <span className="ct-val">≤{carryThresholds.light} kg</span>
          </span>
          <span className={`carry-tier carry-medium ${wc === 'medium' ? 'carry-active' : ''}`}>
            <span className="ct-tag">{L ? 'Mittel' : 'Med'}</span>
            <span className="ct-val">≤{carryThresholds.medium} kg</span>
          </span>
          <span className={`carry-tier carry-heavy ${wc === 'heavy' ? 'carry-active' : ''}`}>
            <span className="ct-tag">{L ? 'Schwer' : 'Heavy'}</span>
            <span className="ct-val">≤{carryThresholds.heavy} kg</span>
          </span>
          {carriedKg > 0 && (
            <span className={`carry-current carry-current-${wc || 'light'}`}>{carriedKg} kg</span>
          )}
          <button
            className={`carry-coin-toggle ${countCoins ? 'carry-coin-on' : 'carry-coin-off'}`}
            onClick={() => setInventory(inv => ({ ...inv, count_coin_weight: !countCoins }))}
            title={L
              ? (countCoins ? 'Münzgewicht wird gezählt' : 'Münzgewicht wird ignoriert')
              : (countCoins ? 'Coin weight counted' : 'Coin weight ignored')}
          >🪙</button>
          <button
            className={`carry-coin-toggle ${applyCarryMov ? 'carry-coin-on' : 'carry-coin-off'}`}
            onClick={() => setInventory(inv => ({ ...inv, apply_carry_movement: !applyCarryMov }))}
            title={L
              ? (applyCarryMov ? 'Tragelast → Bewegung aktiv (RAW)' : 'Tragelast → Bewegung inaktiv (wie Excel)')
              : (applyCarryMov ? 'Encumbrance → Speed active (RAW)' : 'Encumbrance → Speed inactive (Excel)')}
          >🏃</button>
        </div>
      )}

      {/* Item form */}
      {editId && (
        <div className="inv-form">
          <div className="invf-row">
            <label className="invf-label">{L ? 'Gegenstand' : 'Item'}</label>
            <input className="invf-input invf-name" autoFocus
              placeholder={L ? 'Name' : 'Name'}
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
          </div>
          <div className="invf-grid3">
            <div className="invf-cell">
              <label className="invf-label">{L ? 'Menge' : 'Qty'}</label>
              <input className="invf-input invf-small" type="number" min={1}
                value={draft.qty}
                onChange={e => setDraft(d => ({ ...d, qty: Math.max(1, Number(e.target.value) || 1) }))} />
            </div>
            <div className="invf-cell">
              <label className="invf-label">{L ? 'Gew. (kg)' : 'Wt (kg)'}</label>
              <input className="invf-input invf-small" type="number" min={0} step={0.1}
                value={draft.weight}
                onChange={e => setDraft(d => ({ ...d, weight: Number(e.target.value) || 0 }))} />
            </div>
            <div className="invf-cell">
              <label className="invf-label">{L ? `Preis (${COIN_LABEL.gp})` : 'Cost (GP)'}</label>
              <input className="invf-input invf-small" type="number" min={0} step={0.01}
                value={draft.gp ?? 0}
                onChange={e => setDraft(d => ({ ...d, gp: Number(e.target.value) || 0 }))} />
            </div>
          </div>
          <div className="invf-row">
            <label className="invf-label">{L ? 'Behälter' : 'Container'}</label>
            <input className="invf-input" list="bag-suggestions"
              placeholder={L ? 'Rucksack, Gürtel, … (leer = getragen)' : 'Backpack, Belt, … (empty = worn)'}
              value={draft.bag ?? ''}
              onChange={e => setDraft(d => ({ ...d, bag: e.target.value }))} />
            <datalist id="bag-suggestions">
              <option value={L ? 'Rucksack' : 'Backpack'} />
              <option value={L ? 'Gürtel' : 'Belt'} />
              <option value={L ? 'Satteltasche' : 'Saddlebag'} />
              <option value={L ? 'Beutel' : 'Pouch'} />
              <option value={L ? 'Kiste' : 'Chest'} />
            </datalist>
          </div>
          <div className="invf-row">
            <label className="invf-label">{L ? 'Notiz' : 'Note'}</label>
            <input className="invf-input"
              placeholder={L ? 'Fundort, Wert, …' : 'Location, value, …'}
              value={draft.notes}
              onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} />
          </div>
          <div className="invf-actions">
            {editId !== '__new__' && (
              <button className="invf-del-btn" onClick={() => deleteItem(editId)} title={L ? 'Löschen' : 'Delete'}>🗑</button>
            )}
            <button className="invf-cancel-btn" onClick={() => setEditId(null)} title={L ? 'Abbrechen' : 'Cancel'}>✕</button>
            <button className="invf-save-btn" onClick={saveDraft} disabled={!draft.name.trim()} title={L ? 'Speichern' : 'Save'}>✓</button>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 && !editId && (
        <p className="inv-empty">{L
          ? 'Noch keine Gegenstände. Tippe auf + um etwas hinzuzufügen.'
          : 'No items yet. Tap + to add one.'}</p>
      )}

      <div className="inv-list">
        {(() => {
          const groups = {}
          for (const it of items) {
            const key = it.bag?.trim() || ''
            if (!groups[key]) groups[key] = []
            groups[key].push(it)
          }
          const keys = Object.keys(groups).sort((a, b) => {
            if (a === '') return -1
            if (b === '') return 1
            return a.localeCompare(b)
          })
          return keys.map(key => (
            <div key={key || '__worn__'}>
              {key && <div className="inv-bag-header">📦 {key}</div>}
              {groups[key].map(it => (
                <div key={it.id}
                  className={`inv-item ${editId === it.id ? 'editing' : ''}`}
                  onClick={() => editId !== it.id && openEdit(it)}>
                  <div className="ii-main">
                    <span className="ii-name">{it.name}</span>
                    {it.qty > 1 && <span className="ii-qty">×{it.qty}</span>}
                    {it.weight > 0 && (
                      <span className="ii-weight">{Math.round(it.weight * it.qty * 10) / 10} kg</span>
                    )}
                    {it.gp > 0 && (
                      <span className="ii-gp">{it.qty > 1 ? `${it.qty}×` : ''}{it.gp} {COIN_LABEL.gp}</span>
                    )}
                  </div>
                  {it.notes && <p className="ii-notes">{it.notes}</p>}
                </div>
              ))}
            </div>
          ))
        })()}
      </div>

      {!editId && (
        <button className="inv-add-btn" onClick={openNew}>
          + {L ? 'Gegenstand hinzufügen' : 'Add item'}
        </button>
      )}
    </div>
  )
}
