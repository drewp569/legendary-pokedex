import TypeBadge from './TypeBadge.jsx';

const GEN_LABELS = { 1: 'Gen I', 2: 'Gen II', 3: 'Gen III', 8: 'Gen VIII', 9: 'Gen IX' };

export default function PokemonCard({ pokemon, onClick, draggable = false, dragHandleProps = {} }) {
  const bst = Object.values(pokemon.stats).reduce((a, b) => a + b, 0);

  return (
    <div
      className={`pokemon-card ${draggable ? 'draggable' : ''}`}
      onClick={onClick}
      {...dragHandleProps}
    >
      <div className="card-header">
        <span className="card-gen-badge">{GEN_LABELS[pokemon.generation] || `Gen ${pokemon.generation}`}</span>
        <span className="card-legendary-badge" style={{
          color: pokemon.legendary_type === 'Mythical' ? '#c084fc' : '#fbbf24'
        }}>
          {pokemon.legendary_type === 'Mythical' ? '✦ Mythical' : '★ Legendary'}
        </span>
      </div>

      <div className="card-sprite-wrap">
        <img
          src={pokemon.sprite}
          alt={pokemon.name}
          className="card-sprite"
          loading="lazy"
          onError={e => {
            e.target.src = pokemon.sprite_gif;
          }}
        />
      </div>

      <div className="card-body">
        <p className="card-number">#{String(pokemon.id).padStart(4, '0')}</p>
        <h3 className="card-name">{pokemon.name}</h3>
        <div className="card-types">
          {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
        </div>
        <div className="card-bst">
          <span className="bst-label">BST</span>
          <span className="bst-value">{bst}</span>
        </div>
      </div>

      <div className="card-footer">
        <span className="card-region">{pokemon.region}</span>
        {onClick && <span className="card-cta">View Details →</span>}
      </div>
    </div>
  );
}
