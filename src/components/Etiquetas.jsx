import { STATUS } from '../lib/constantes.js';

export function Placa({ valor }) {
  if (!valor) return <span className="noplate">Sem placa</span>;
  return (
    <span className="plate">
      <i />
      <b>{valor}</b>
    </span>
  );
}

export function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{STATUS[status]}</span>;
}
