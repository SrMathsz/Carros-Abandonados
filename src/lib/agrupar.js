// Placa sem hífen e em maiúsculas: ABC-1234 e abc1234 viram a mesma chave.
export function chavePlaca(placa) {
  return placa ? placa.replace(/-/g, '').toUpperCase() : null;
}

// Junta os registros da mesma placa em um só carro.
// Recebe a lista com os mais recentes primeiro e devolve um item por carro,
// com os dados do registro mais recente, o total e a lista de ids agrupados.
//
// Carros já recolhidos ficam num grupo à parte: se a mesma placa aparecer de novo
// depois do recolhimento, vira um caso novo em vez de reabrir o antigo.
// Registros sem placa nunca são agrupados, porque não há como saber se são o mesmo carro.
export function agrupar(registros) {
  const mapa = new Map();
  for (const r of registros) {
    const placa = chavePlaca(r.placa);
    const encerrado = r.status === 'recolhido';
    const chave = placa ? `${placa}|${encerrado ? 'fim' : 'ativo'}` : r.id;
    const grupo = mapa.get(chave);
    if (grupo) grupo.push(r);
    else mapa.set(chave, [r]);
  }

  return Array.from(mapa, ([chave, itens]) => {
    const maisRecente = itens[0];
    let status = maisRecente.status;
    if (status !== 'recolhido') {
      // Se a prefeitura já vistoriou, um registro novo do mesmo carro não volta o caso para pendente
      status = itens.some((i) => i.status === 'vistoriado') ? 'vistoriado' : 'pendente';
    }
    return {
      ...maisRecente,
      id: chave,
      ids: itens.map((i) => i.id),
      itens,
      total: itens.length,
      status,
      primeiro: itens[itens.length - 1].criado_em,
    };
  });
}
