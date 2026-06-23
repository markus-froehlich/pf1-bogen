export const BUFF_STATS = [
  { key: 'str',        de: 'ST',         cat: 'attr'   },
  { key: 'dex',        de: 'GE',         cat: 'attr'   },
  { key: 'kon',        de: 'KO',         cat: 'attr'   },
  { key: 'int_',       de: 'IN',         cat: 'attr'   },
  { key: 'wis',        de: 'WE',         cat: 'attr'   },
  { key: 'cha',        de: 'CH',         cat: 'attr'   },
  { key: 'attack',     de: 'Angriff',    cat: 'combat' },
  { key: 'ac',         de: 'RK',         cat: 'combat' },
  { key: 'nat_armor',  de: 'Nat.Rüst.',  cat: 'combat' },
  { key: 'deflection', de: 'Ausweich.',  cat: 'combat' },
  { key: 'saves_all',  de: 'Alle RW',    cat: 'saves'  },
  { key: 'fort',       de: 'Zäh.',       cat: 'saves'  },
  { key: 'ref',        de: 'Ref',        cat: 'saves'  },
  { key: 'will',       de: 'Will',       cat: 'saves'  },
  { key: 'init',       de: 'Init',       cat: 'other'  },
  { key: 'skills_all', de: 'Fertigk.',   cat: 'other'  },
]

export function computeBuffTotals(active_buffs) {
  const totals = {}
  for (const s of BUFF_STATS) totals[s.key] = 0
  for (const b of (active_buffs ?? [])) {
    if (!b.active) continue
    const bn = b.bonuses ?? {}
    for (const s of BUFF_STATS) {
      totals[s.key] += Number(bn[s.key] ?? 0)
    }
  }
  return totals
}
