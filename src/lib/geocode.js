import { CENTRO } from './constantes.js';

// Procura uma rua pelo nome e devolve o ponto e a área que ela ocupa no mapa.
// Os resultados próximos do centro do mapa têm prioridade, e a variável opcional
// VITE_CIDADE (ex.: "Santos, SP") ajuda quando o nome da rua existe em várias cidades.
export async function buscarEndereco(texto) {
  const cidade = import.meta.env.VITE_CIDADE || '';
  const consulta = cidade ? `${texto}, ${cidade}` : texto;
  const [lat, lng] = CENTRO;
  const d = 0.15; // cerca de 15 km ao redor do centro
  const viewbox = `${lng - d},${lat + d},${lng + d},${lat - d}`;

  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR' +
    `&viewbox=${viewbox}&q=${encodeURIComponent(consulta)}`;

  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('Falha ao buscar a rua');
  const lista = await resposta.json();
  if (!lista.length) return null;

  const item = lista[0];
  const [sul, norte, oeste, leste] = item.boundingbox.map(Number);
  return {
    lat: Number(item.lat),
    lng: Number(item.lon),
    limites: [
      [sul, oeste],
      [norte, leste],
    ],
  };
}

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
