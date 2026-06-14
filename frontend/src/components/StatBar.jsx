const STAT_COLORS = {
  hp: '#ff5959',
  attack: '#f5ac78',
  defense: '#fae078',
  sp_attack: '#9db7f5',
  sp_defense: '#a7db8d',
  speed: '#fa92b2',
};

const STAT_LABELS = {
  hp: 'HP',
  attack: 'ATK',
  defense: 'DEF',
  sp_attack: 'SpA',
  sp_defense: 'SpD',
  speed: 'SPE',
};

export default function StatBar({ stat, value, max = 255 }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = STAT_COLORS[stat] || '#aaa';

  return (
    <div className="stat-row">
      <span className="stat-label">{STAT_LABELS[stat] || stat}</span>
      <span className="stat-value">{value}</span>
      <div className="stat-bar-bg">
        <div
          className="stat-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
