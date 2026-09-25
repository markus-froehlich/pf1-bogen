import {
  Flask, CaretRight, DownloadSimple, UploadSimple, Printer, Cloud, CloudCheck, Minus, Plus,
} from '@phosphor-icons/react'
import { MORE_PAGES } from './morePages.js'

function Seg({ options, value, onPick }) {
  return (
    <div className="nc-seg">
      {options.map(([key, label]) => (
        <button key={key} className={`nc-seg-opt ${value === key ? 'is-on' : ''}`} onClick={() => onPick(key)}>{label}</button>
      ))}
    </div>
  )
}

/** „Mehr": Referenzen, Daten, Einstellungen (README „Mehr"). */
export function MoreView({
  lang, counts, onOpenPage,
  onExport, onImportFile, onPrint, onHomebrew, homebrewCount, onBackup, backupStatus,
  profile, onProfile, fontScale, onFontDown, onFontUp, theme, onTheme, externalLinks, onLinks, onLang, build,
}) {
  const L = lang === 'de'
  const fontLabel = { s: 'S', m: 'M', l: 'L', xl: 'XL' }[fontScale] ?? 'M'
  const BackupIcon = backupStatus === 'ok' ? CloudCheck : Cloud
  const backupMeta = { ok: L ? 'verbunden' : 'connected', error: L ? 'Fehler' : 'error', off: L ? 'nicht verbunden' : 'not connected' }[backupStatus] ?? (L ? 'verbunden' : 'connected')

  return (
    <div className="nc-page nc-more">
      <div className="nc-list-card">
        {Object.entries(MORE_PAGES).map(([key, page]) => (
          <button key={key} className="nc-list-row" onClick={() => onOpenPage(key)}>
            <page.Icon className="nc-list-icon nc-accent-soft" />
            <span className="nc-list-label">{L ? page.de : page.en}</span>
            {counts[key] != null && <span className="nc-list-meta">{counts[key]}</span>}
            <CaretRight className="nc-list-caret" />
          </button>
        ))}
      </div>

      <span className="nc-label">{L ? 'Daten' : 'Data'}</span>
      <div className="nc-list-card">
        <button className="nc-list-row" onClick={onExport}>
          <DownloadSimple className="nc-list-icon" /><span className="nc-list-label">{L ? 'Exportieren' : 'Export'}</span><span className="nc-list-meta">JSON</span>
        </button>
        <label className="nc-list-row">
          <UploadSimple className="nc-list-icon" /><span className="nc-list-label">{L ? 'Importieren' : 'Import'}</span>
          <span className="nc-list-meta">{L ? 'als neuer Charakter' : 'as new character'}</span>
          <input type="file" accept=".json" hidden onChange={onImportFile} />
        </label>
        <button className="nc-list-row" onClick={onPrint}>
          <Printer className="nc-list-icon" /><span className="nc-list-label">{L ? 'Drucken' : 'Print'}</span><span className="nc-list-meta">A4</span>
        </button>
        <button className="nc-list-row" onClick={onHomebrew}>
          <Flask className="nc-list-icon" /><span className="nc-list-label">Homebrew</span>
          <span className="nc-list-meta">{homebrewCount} {L ? (homebrewCount === 1 ? 'Eintrag' : 'Einträge') : 'entries'}</span>
        </button>
        <button className="nc-list-row" onClick={onBackup}>
          <BackupIcon className="nc-list-icon" /><span className="nc-list-label">Backup</span>
          <span className={`nc-list-meta ${backupStatus === 'error' ? 'nc-neg' : ''}`}>{backupMeta}</span>
        </button>
      </div>

      <span className="nc-label">{L ? 'Einstellungen' : 'Settings'}</span>
      <div className="nc-list-card">
        <div className="nc-set-row">
          <span className="nc-set-label">{L ? 'Profil' : 'Profile'}</span>
          <Seg options={[['player', L ? 'SP' : 'Player'], ['gm', L ? 'SL' : 'GM']]} value={profile} onPick={onProfile} />
        </div>
        <div className="nc-set-row">
          <span className="nc-set-label">{L ? 'Schriftgröße' : 'Font size'}</span>
          <div className="nc-seg">
            <button className="nc-seg-opt" onClick={onFontDown} disabled={fontScale === 's'} aria-label="−"><Minus /></button>
            <span className="nc-seg-opt is-static">{fontLabel}</span>
            <button className="nc-seg-opt" onClick={onFontUp} disabled={fontScale === 'xl'} aria-label="+"><Plus /></button>
          </div>
        </div>
        <div className="nc-set-row">
          <span className="nc-set-text">
            <span className="nc-set-label">{L ? 'Darstellung' : 'Appearance'}</span>
            <span className="nc-set-hint">{L ? 'Hoher Kontrast für schwache Sicht' : 'High contrast for low vision'}</span>
          </span>
          <Seg options={[['standard', 'Standard'], ['kontrast', L ? 'Kontrast' : 'Contrast']]} value={theme} onPick={onTheme} />
        </div>
        <div className="nc-set-row">
          <span className="nc-set-label">{L ? 'Links öffnen' : 'Open links'}</span>
          <Seg options={[['app', 'App'], ['browser', 'Browser']]} value={externalLinks ? 'browser' : 'app'} onPick={v => onLinks(v === 'browser')} />
        </div>
        <div className="nc-set-row">
          <span className="nc-set-label">{L ? 'Sprache' : 'Language'}</span>
          <Seg options={[['de', 'DE'], ['en', 'EN']]} value={lang} onPick={onLang} />
        </div>
      </div>
      <span className="nc-build">Build #{build}</span>
    </div>
  )
}
