// Aceita o formato antigo (ABC-1234) e o Mercosul (ABC1D23)
export function formatarPlaca(bruto) {
  const limpo = bruto.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  return /^[A-Z]{3}\d{4}$/.test(limpo) ? `${limpo.slice(0, 3)}-${limpo.slice(3)}` : limpo;
}

export function placaValida(placa) {
  return /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/.test(placa);
}
