// Converte coordenadas em endereço usando o Nominatim (OpenStreetMap).
// O serviço gratuito pede uso moderado (cerca de 1 consulta por segundo).
// Para muito tráfego, troque por um provedor pago ou hospede o seu.
export async function enderecoPorCoordenada(lat, lng) {
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=pt-BR' +
    `&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('Falha ao buscar endereço');
  const dados = await resposta.json();

  const a = dados.address || {};
  const rua = a.road || a.pedestrian || a.residential || a.path || '';
  const numero = a.house_number || '';
  const bairro = a.suburb || a.neighbourhood || a.city_district || '';

  const ruaNumero = [rua, numero].filter(Boolean).join(', ');
  return [ruaNumero, bairro].filter(Boolean).join(' - ');
}
