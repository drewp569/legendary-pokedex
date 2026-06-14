import { useState, useEffect, useMemo } from 'react';
import PokemonCard from '../components/PokemonCard.jsx';
import PokemonModal from '../components/PokemonModal.jsx';
import '../styles/components.css';
import '../styles/home.css';

const GENERATIONS = [
  { value: 1, label: 'Gen I', region: 'Kanto' },
  { value: 2, label: 'Gen II', region: 'Johto' },
  { value: 3, label: 'Gen III', region: 'Hoenn' },
  { value: 8, label: 'Gen VIII', region: 'Galar' },
  { value: 9, label: 'Gen IX', region: 'Paldea' },
];

const ALL_TYPES = [
  'Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison',
  'Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'
];

export default function Home() {
  const [legendaries, setLegendaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPokemon, setSelectedPokemon] = useState(null);
  const [activeGens, setActiveGens] = useState([]);
  const [activeType, setActiveType] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('id');

  useEffect(() => {
    fetch('/api/legendaries')
      .then(r => { if (!r.ok) throw new Error('Failed to fetch'); return r.json(); })
      .then(data => { setLegendaries(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let result = legendaries;
    if (activeGens.length > 0) result = result.filter(p => activeGens.includes(p.generation));
    if (activeType) result = result.filter(p => p.types.includes(activeType));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.types.some(t => t.toLowerCase().includes(q)) ||
        p.region.toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      if (sortBy === 'bst') {
        const bstA = Object.values(a.stats).reduce((s, v) => s + v, 0);
        const bstB = Object.values(b.stats).reduce((s, v) => s + v, 0);
        return bstB - bstA;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return a.id - b.id;
    });
  }, [legendaries, activeGens, activeType, search, sortBy]);

  const toggleGen = gen => {
    setActiveGens(prev => prev.includes(gen) ? prev.filter(g => g !== gen) : [...prev, gen]);
  };

  const usedTypes = useMemo(() => {
    const s = new Set(legendaries.flatMap(p => p.types));
    return ALL_TYPES.filter(t => s.has(t));
  }, [legendaries]);

  return (
    <div className="home-page">
      <div className="container">
        <div className="hero">
          <h1 className="hero-title">Legendary Pokémon</h1>
          <p className="hero-sub">Explore {legendaries.length} legendary & mythical Pokémon from Generations I–III, VIII, and IX</p>
        </div>

        <div className="filters-section">
          <div className="filter-bar">
            <input
              className="search-input"
              type="text"
              placeholder="Search by name, type, or region…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />

            <div className="filter-divider" />

            <div className="filter-group">
              {GENERATIONS.map(g => (
                <button
                  key={g.value}
                  className={`filter-btn ${activeGens.includes(g.value) ? 'active' : ''}`}
                  onClick={() => toggleGen(g.value)}
                  title={g.region}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <div className="filter-divider" />

            <select
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="id">Sort: Pokédex #</option>
              <option value="name">Sort: Name</option>
              <option value="bst">Sort: BST (High→Low)</option>
            </select>
          </div>

          <div className="type-filter-wrap" style={{ marginTop: 10 }}>
            <button
              className={`type-filter-btn ${!activeType ? 'active' : ''}`}
              style={{ background: '#555', opacity: !activeType ? 1 : 0.6 }}
              onClick={() => setActiveType('')}
            >
              All Types
            </button>
            {usedTypes.map(type => (
              <button
                key={type}
                className={`type-filter-btn ${activeType === type ? 'active' : ''}`}
                style={{ background: `var(--type-${type}, #666)` }}
                onClick={() => setActiveType(prev => prev === type ? '' : type)}
              >
                {type}
              </button>
            ))}
          </div>

          {(activeGens.length > 0 || activeType || search) && (
            <div className="filter-active-row">
              <span className="filter-count">{filtered.length} Pokémon</span>
              <button
                className="clear-btn"
                onClick={() => { setActiveGens([]); setActiveType(''); setSearch(''); }}
              >
                Clear filters ✕
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="loading-grid">
            {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton-card" />)}
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>⚠️ Could not load Pokémon data: {error}</p>
            <p className="error-hint">Make sure the backend is running on port 3001.</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <h3>No Pokémon found</h3>
            <p>Try adjusting your filters or search term.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="pokemon-grid">
            {filtered.map(pokemon => (
              <PokemonCard
                key={pokemon.id}
                pokemon={pokemon}
                onClick={() => setSelectedPokemon(pokemon)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedPokemon && (
        <PokemonModal
          pokemon={selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
        />
      )}
    </div>
  );
}
