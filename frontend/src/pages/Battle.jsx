import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import TypeBadge from '../components/TypeBadge.jsx';
import '../styles/components.css';
import '../styles/battle.css';

/* ---- Damage formula (simplified Gen 5+ style) ---- */
function calcDamage(attacker, defender) {
  const level = 50;
  const power = 80;
  const atkStat = Math.max(attacker.stats.attack, attacker.stats.sp_attack);
  const defStat = atkStat === attacker.stats.attack
    ? defender.stats.defense
    : defender.stats.sp_defense;

  const base = Math.floor(((2 * level / 5 + 2) * power * atkStat / defStat) / 50) + 2;
  const randomMod = 0.85 + Math.random() * 0.15;
  return Math.max(1, Math.floor(base * randomMod));
}

function getTypeMoveLabel(attacker) {
  const hasPhys = attacker.stats.attack >= attacker.stats.sp_attack;
  const move = attacker.signature_moves[0];
  return move || (hasPhys ? 'Tackle' : 'Confusion');
}

function runBattle(p1, p2) {
  const hp1Max = p1.stats.hp * 2 + 10;
  const hp2Max = p2.stats.hp * 2 + 10;
  let hp1 = hp1Max;
  let hp2 = hp2Max;
  const log = [];
  let turn = 1;

  log.push({ type: 'turn', text: `⚔️ Battle begins: ${p1.name} vs ${p2.name}!` });

  while (hp1 > 0 && hp2 > 0 && turn <= 50) {
    log.push({ type: 'turn', text: `— Turn ${turn} —` });

    const p1GoesFirst = p1.stats.speed >= p2.stats.speed;
    const [first, second] = p1GoesFirst ? [p1, p2] : [p2, p1];
    let hpFirst = p1GoesFirst ? hp1 : hp2;
    let hpSecond = p1GoesFirst ? hp2 : hp1;
    const hpFirstMax = p1GoesFirst ? hp1Max : hp2Max;
    const hpSecondMax = p1GoesFirst ? hp2Max : hp1Max;

    // First attacker
    const dmg1 = calcDamage(first, second);
    hpSecond = Math.max(0, hpSecond - dmg1);
    const move1 = getTypeMoveLabel(first);
    log.push({ type: 'damage', text: `${first.name} used ${move1}! Dealt ${dmg1} damage to ${second.name}. (HP: ${hpSecond}/${hpSecondMax})` });

    if (hpSecond <= 0) {
      log.push({ type: 'faint', text: `${second.name} fainted!` });
      log.push({ type: 'winner', text: `🏆 ${first.name} wins!` });
      return { log, winner: first.id, loser: second.id, turns: turn };
    }

    // Second attacker
    const dmg2 = calcDamage(second, first);
    hpFirst = Math.max(0, hpFirst - dmg2);
    const move2 = getTypeMoveLabel(second);
    log.push({ type: 'damage', text: `${second.name} used ${move2}! Dealt ${dmg2} damage to ${first.name}. (HP: ${hpFirst}/${hpFirstMax})` });

    if (hpFirst <= 0) {
      log.push({ type: 'faint', text: `${first.name} fainted!` });
      log.push({ type: 'winner', text: `🏆 ${second.name} wins!` });
      return { log, winner: second.id, loser: first.id, turns: turn };
    }

    if (p1GoesFirst) { hp1 = hpFirst; hp2 = hpSecond; }
    else { hp1 = hpSecond; hp2 = hpFirst; }

    turn++;
  }

  // Draw (shouldn't happen in practice)
  log.push({ type: 'winner', text: "⚖️ It's a draw! Both Pokémon held their ground." });
  return { log, winner: null, loser: null, turns: turn };
}

/* ---- Draggable list item ---- */
function DraggableItem({ pokemon }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pokemon-${pokemon.id}`,
    data: { pokemon },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`battle-list-item ${isDragging ? 'dragging' : ''}`}
    >
      <img src={pokemon.sprite_gif} alt={pokemon.name}
        onError={e => { e.target.src = pokemon.sprite; }} />
      <div className="battle-list-item-info">
        <div className="battle-list-item-name">{pokemon.name}</div>
        <div className="battle-list-item-types">
          {pokemon.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
        </div>
      </div>
    </div>
  );
}

/* ---- Drop Zone ---- */
function DropZone({ id, fighter, label, onRemove, hpPct, battleDone }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`drop-zone ${isOver ? 'over' : ''} ${fighter ? 'filled' : ''}`}
    >
      {fighter ? (
        <div className="arena-fighter">
          {!battleDone && (
            <button className="remove-fighter-btn" onClick={onRemove} title="Remove">✕</button>
          )}
          <img
            src={fighter.sprite}
            alt={fighter.name}
            onError={e => { e.target.src = fighter.sprite_gif; }}
          />
          <div className="arena-fighter-name">{fighter.name}</div>
          <div className="arena-fighter-types">
            {fighter.types.map(t => <TypeBadge key={t} type={t} size="sm" />)}
          </div>
          {battleDone && (
            <>
              <div className="arena-fighter-hp-bar">
                <div
                  className="arena-fighter-hp-fill"
                  style={{
                    width: `${Math.max(0, hpPct) * 100}%`,
                    background: hpPct > 0.5 ? '#4ade80' : hpPct > 0.2 ? '#facc15' : '#f87171',
                  }}
                />
              </div>
              <span className="arena-fighter-hp-text">
                {hpPct > 0 ? `${Math.round(hpPct * 100)}% HP` : 'Fainted'}
              </span>
            </>
          )}
        </div>
      ) : (
        <div className="drop-zone-placeholder">
          <div className="drop-zone-icon">🎯</div>
          <p>{label}</p>
        </div>
      )}
    </div>
  );
}

export default function Battle() {
  const [legendaries, setLegendaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fighter1, setFighter1] = useState(null);
  const [fighter2, setFighter2] = useState(null);
  const [battleLog, setBattleLog] = useState([]);
  const [battleResult, setBattleResult] = useState(null);
  const [activeDrag, setActiveDrag] = useState(null);
  const [hp1Pct, setHp1Pct] = useState(1);
  const [hp2Pct, setHp2Pct] = useState(1);
  const [search, setSearch] = useState('');
  const logRef = useRef(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 4 },
  }));

  useEffect(() => {
    fetch('/api/legendaries')
      .then(r => r.json())
      .then(data => { setLegendaries(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [battleLog]);

  const filteredList = legendaries.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleDragStart(event) {
    const { data } = event.active;
    setActiveDrag(data.current?.pokemon || null);
  }

  function handleDragEnd(event) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;

    const pokemon = active.data.current?.pokemon;
    if (!pokemon) return;

    const target = over.id;
    if (target === 'zone-1') {
      if (fighter2?.id === pokemon.id) return; // can't be same pokemon
      setFighter1(pokemon);
      resetBattle(false);
    } else if (target === 'zone-2') {
      if (fighter1?.id === pokemon.id) return;
      setFighter2(pokemon);
      resetBattle(false);
    }
  }

  function resetBattle(clearFighters = true) {
    setBattleLog([]);
    setBattleResult(null);
    setHp1Pct(1);
    setHp2Pct(1);
    if (clearFighters) { setFighter1(null); setFighter2(null); }
  }

  function startBattle() {
    if (!fighter1 || !fighter2) return;
    const result = runBattle(fighter1, fighter2);
    setBattleLog(result.log);
    setBattleResult(result);

    // Determine HP percentages
    const hp1Max = fighter1.stats.hp * 2 + 10;
    const hp2Max = fighter2.stats.hp * 2 + 10;
    if (result.winner === fighter1.id) {
      setHp1Pct(0.15 + Math.random() * 0.3);
      setHp2Pct(0);
    } else if (result.winner === fighter2.id) {
      setHp1Pct(0);
      setHp2Pct(0.15 + Math.random() * 0.3);
    } else {
      setHp1Pct(0.05);
      setHp2Pct(0.05);
    }
  }

  const winnerName = battleResult?.winner
    ? legendaries.find(p => p.id === battleResult.winner)?.name
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="battle-page">
        <div className="container">
          <div className="battle-header">
            <h1 className="battle-title">⚔️ Battle Simulator</h1>
            <p className="battle-sub">Drag two legendary Pokémon into the arena to simulate a battle</p>
          </div>

          <div className="battle-layout">
            {/* Left panel: pokemon list */}
            <div className="battle-panel">
              <h3>Legendary Roster</h3>
              <input
                className="search-input"
                type="text"
                placeholder="Filter…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', marginBottom: 10 }}
              />
              <div className="battle-panel-list">
                {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Loading…</p>}
                {filteredList.map(p => (
                  <DraggableItem key={p.id} pokemon={p} />
                ))}
              </div>
            </div>

            {/* Center: arena */}
            <div className="battle-arena">
              <div className="arena-top">
                <DropZone
                  id="zone-1"
                  fighter={fighter1}
                  label="Drop Pokémon 1 here"
                  onRemove={() => { setFighter1(null); resetBattle(false); }}
                  hpPct={hp1Pct}
                  battleDone={!!battleResult}
                />
                <div className="arena-vs">VS</div>
                <DropZone
                  id="zone-2"
                  fighter={fighter2}
                  label="Drop Pokémon 2 here"
                  onRemove={() => { setFighter2(null); resetBattle(false); }}
                  hpPct={hp2Pct}
                  battleDone={!!battleResult}
                />
              </div>

              <div className="battle-controls">
                <button
                  className="battle-btn battle-btn-primary"
                  onClick={startBattle}
                  disabled={!fighter1 || !fighter2}
                >
                  {battleResult ? '⟳ Rematch' : '⚔️ Start Battle'}
                </button>
                <button
                  className="battle-btn battle-btn-secondary"
                  onClick={() => resetBattle(true)}
                >
                  Reset
                </button>
              </div>

              {/* Stat comparison */}
              {fighter1 && fighter2 && (
                <StatComparison p1={fighter1} p2={fighter2} />
              )}
            </div>

            {/* Right: battle log */}
            <div className="battle-log" ref={logRef}>
              <h3>Battle Log</h3>
              {battleResult && winnerName && (
                <div className="battle-result-banner">
                  🏆 {winnerName} wins in {battleResult.turns} turn{battleResult.turns !== 1 ? 's' : ''}!
                </div>
              )}
              {battleLog.length === 0 ? (
                <p className="log-empty">Battle log will appear here once the fight begins.</p>
              ) : (
                battleLog.map((entry, i) => (
                  <div key={i} className={`log-entry log-${entry.type}`}>
                    {entry.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          <div className="battle-list-item" style={{ opacity: 0.9, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
            <img src={activeDrag.sprite_gif} alt={activeDrag.name}
              style={{ width: 40, height: 40, objectFit: 'contain' }} />
            <div className="battle-list-item-info">
              <div className="battle-list-item-name">{activeDrag.name}</div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ---- Stat Comparison Component ---- */
const STAT_KEYS = ['hp','attack','defense','sp_attack','sp_defense','speed'];
const STAT_LABELS = { hp:'HP', attack:'ATK', defense:'DEF', sp_attack:'SpA', sp_defense:'SpD', speed:'SPE' };

function StatComparison({ p1, p2 }) {
  const maxAny = Math.max(
    ...STAT_KEYS.map(s => Math.max(p1.stats[s], p2.stats[s]))
  );

  return (
    <div className="stat-comparison">
      <h3 className="stat-comparison-title">Stat Comparison</h3>
      {STAT_KEYS.map(stat => {
        const v1 = p1.stats[stat];
        const v2 = p2.stats[stat];
        const pct1 = (v1 / maxAny) * 100;
        const pct2 = (v2 / maxAny) * 100;
        const winner = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;
        return (
          <div key={stat} className="cmp-row">
            <span className={`cmp-val cmp-left ${winner === 1 ? 'cmp-winner' : ''}`}>{v1}</span>
            <div className="cmp-bars">
              <div className="cmp-bar-wrap cmp-bar-left">
                <div className="cmp-bar cmp-bar-1" style={{ width: `${pct1}%` }} />
              </div>
              <span className="cmp-label">{STAT_LABELS[stat]}</span>
              <div className="cmp-bar-wrap cmp-bar-right">
                <div className="cmp-bar cmp-bar-2" style={{ width: `${pct2}%` }} />
              </div>
            </div>
            <span className={`cmp-val cmp-right ${winner === 2 ? 'cmp-winner' : ''}`}>{v2}</span>
          </div>
        );
      })}
      <div className="cmp-bst-row">
        <span className="cmp-bst">{Object.values(p1.stats).reduce((a,b)=>a+b,0)}</span>
        <span className="cmp-bst-label">BST</span>
        <span className="cmp-bst">{Object.values(p2.stats).reduce((a,b)=>a+b,0)}</span>
      </div>
    </div>
  );
}
