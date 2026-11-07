import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { CENTRO } from '../lib/constantes.js';

const CAMINHO_PIN = 'M0 0 C-4 -9 -15 -18 -15 -26 A15 15 0 1 1 15 -26 C15 -18 4 -9 0 0Z';

// Pino em SVG (evita o problema dos ícones padrão do Leaflet com bundlers).
// "cor" aceita uma variável CSS, por exemplo var(--st-pendente).
export function iconePin(cor, escala = 1) {
  const largura = 34 * escala;
  const altura = 46 * escala;
  return L.divIcon({
    className: 'pin-icone',
    iconSize: [largura, altura],
    iconAnchor: [17 * escala, 43 * escala],
    html:
      `<svg width="${largura}" height="${altura}" viewBox="-17 -43 34 46" aria-hidden="true">` +
      `<path d="${CAMINHO_PIN}" style="fill:${cor};stroke:var(--surface);stroke-width:2"/>` +
      `<circle cy="-26" r="5.5" style="fill:var(--surface)"/></svg>`,
  });
}

// O Leaflet não percebe sozinho quando o container muda de tamanho
// (por exemplo, quando o formulário abre ao lado do mapa).
function ObservarTamanho() {
  const mapa = useMap();
  useEffect(() => {
    const elemento = mapa.getContainer();
    const observador = new ResizeObserver(() => mapa.invalidateSize());
    observador.observe(elemento);
    return () => observador.disconnect();
  }, [mapa]);
  return null;
}

export default function MapaBase({ children, classe = '' }) {
  return (
    <MapContainer center={CENTRO} zoom={16} className={`mapa ${classe}`} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ObservarTamanho />
      {children}
    </MapContainer>
  );
}
