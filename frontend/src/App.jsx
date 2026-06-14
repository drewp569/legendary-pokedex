import { Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Battle from './pages/Battle.jsx';
import './styles/App.css';

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="container header-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">Legendary Pokédex</span>
          </div>
          <nav className="nav">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Pokédex
            </NavLink>
            <NavLink to="/battle" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              ⚔️ Battle Simulator
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/battle" element={<Battle />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">
          <p>Legendary Pokédex · Gens 1–3, 8–9 · Data sourced from official Pokémon titles</p>
        </div>
      </footer>
    </div>
  );
}
