import './CompanionFeaturesPanel.css'

export function CompanionFeaturesPanel({ features = [], lang }) {
  if (features.length === 0) return null
  const L = lang === 'de'

  return (
    <div className="companion-features">
      <div className="companion-features-title">{L ? 'GEFÄHRTENMERKMALE' : 'COMPANION FEATURES'}</div>
      <div className="companion-features-list">
        {features.map(feature => (
          <div key={feature.name} className="companion-feature">
            <strong>{feature.name}</strong>
            {feature.description && <span>{feature.description}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
