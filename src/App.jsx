import { NavLink, Route, Routes } from 'react-router-dom';
import Cidadao from './pages/Cidadao.jsx';
import Prefeitura from './pages/Prefeitura.jsx';
import { configurado } from './supabaseClient.js';

export default function App() {
  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <span className="plate-mini" aria-hidden="true">
            <i />
            <b>ABC</b>
          </span>
          <span className="brand-name">Carros Abandonados</span>
        </div>
        <nav className="seg" aria-label="Escolha a visão">
          <NavLink to="/" end>
            Cidadão
          </NavLink>
          <NavLink to="/prefeitura">Prefeitura</NavLink>
        </nav>
      </header>

      {!configurado && (
        <p className="aviso-config" role="alert">
          O Supabase ainda não está configurado. Copie <code>.env.example</code> para <code>.env</code>, preencha os
          dados do projeto e reinicie o servidor.
        </p>
      )}

      <main>
        <Routes>
          <Route path="/" element={<Cidadao />} />
          <Route path="/prefeitura" element={<Prefeitura />} />
          <Route path="*" element={<Cidadao />} />
        </Routes>
      </main>
    </div>
  );
}
