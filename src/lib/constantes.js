export const STATUS = {
  pendente: 'Pendente',
  vistoriado: 'Vistoriado',
  recolhido: 'Recolhido',
};

export const ORDEM_STATUS = ['pendente', 'vistoriado', 'recolhido'];

export const CENTRO = [
  Number(import.meta.env.VITE_CENTRO_LAT) || -23.9535,
  Number(import.meta.env.VITE_CENTRO_LNG) || -46.34,
];

export function dataCurta(valor) {
  const d = new Date(valor);
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} · ${hora}`;
}

export function dataCompleta(valor) {
  const d = new Date(valor);
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dia} às ${hora}`;
}
