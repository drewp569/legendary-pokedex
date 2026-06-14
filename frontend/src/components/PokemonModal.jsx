import { useEffect } from 'react';
import TypeBadge from './TypeBadge.jsx';
import StatBar from './StatBar.jsx';

const GEN_NAMES = { 1: 'Generation I (Kanto)', 2: 'Generation II (Johto)', 3: 'Generation III (Hoenn)', 8: 'Generation VIII (Galar)', 9: 'Generation IX (Paldea)' };

export default function PokemonModal({ pokemon, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const bst = Object.values(pokemon.stats).reduce((a, b) => a + b, 0);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-top">
          <div className="modal-sprite-wrap">
            <img
              src={pokemon.sprite}
              alt={pokemon.name}
              className="modal-sprite"
              onError={e => { e.target.src = pokemon.sprite_gif; }}
            />
          </div>
          <div className="modal-identity">
            <p className="modal-number">#{String(pokemon.id).padStart(4, '0')}</p>
            <h2 className="modal-name">{pokemon.name}</h2>
            <p className="modal-category">The {pokemon.category} Pokémon</p>
            <div className="modal-types">
              {pokemon.types.map(t => <TypeBadge key={t} type={t} />)}
            </div>
            <div className="modal-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Generation</span>
                <span className="meta-value">{GEN_NAMES[pokemon.generation]}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Status</span>
                <span className="meta-value" style={{ color: pokemon.legendary_type === 'Mythical' ? '#c084fc' : '#fbbf24' }}>
                  {pokemon.legendary_type}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Height</span>
                <span className="meta-value">{pokemon.height}m</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Weight</span>
                <span className="meta-value">{pokemon.weight}kg</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-tabs-content">
          <section className="modal-section">
            <h3 className="section-title">Pokédex Entry</h3>
            <p className="modal-description">{pokemon.description}</p>
          </section>

          <section className="modal-section">
            <h3 className="section-title">Lore</h3>
            <p className="modal-description">{pokemon.lore}</p>
          </section>

          <section className="modal-section">
            <h3 className="section-title">Abilities</h3>
            <div className="ability-list">
              {pokemon.abilities.map((ability, i) => (
                <span key={ability} className={`ability-tag ${i === pokemon.abilities.length - 1 && pokemon.abilities.length > 1 ? 'hidden-ability' : ''}`}>
                  {ability}
                  {i === pokemon.abilities.length - 1 && pokemon.abilities.length > 1 && (
                    <span className="ability-note"> (Hidden)</span>
                  )}
                </span>
              ))}
            </div>
          </section>

          <section className="modal-section">
            <h3 className="section-title">Signature Moves</h3>
            <div className="moves-list">
              {pokemon.signature_moves.map(move => (
                <span key={move} className="move-tag">{move}</span>
              ))}
            </div>
          </section>

          <section className="modal-section">
            <div className="stats-header">
              <h3 className="section-title">Base Stats</h3>
              <span className="bst-total">BST: <strong>{bst}</strong></span>
            </div>
            <div className="stats-list">
              {Object.entries(pokemon.stats).map(([stat, val]) => (
                <StatBar key={stat} stat={stat} value={val} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
