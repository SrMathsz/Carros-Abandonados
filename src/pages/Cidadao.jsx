import { useCallback, useEffect, useState } from 'react';
import { CircleMarker, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import MapaBase, { iconePin } from '../components/MapaBase.jsx';
import FormularioCarro from '../components/FormularioCarro.jsx';
import { supabase } from '../supabaseClient.js';

function CliqueNoMapa({ ativo, aoClicar }) {
  useMapEvents({
    click(e) {
      if (ativo) aoClicar({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Move o mapa só quando a pessoa usa a localização do aparelho
function VoarPara({ foco }) {
  const mapa = useMap();
  useEffect(() => {
    if (foco) mapa.flyTo([foco.lat, foco.lng], Math.max(mapa.getZoom(), 17));
  }, [foco, mapa]);
  return null;
}

export default function Cidadao() {
  const [publicos, setPublicos] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [ponto, setPonto] = useState(null);
  const [foco, setFoco] = useState(null);
  const [erroLocalizacao, setErroLocalizacao] = useState('');
  const [aviso, setAviso] = useState('');

  const carregarPublicos = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('registros_publicos').select('id,lat,lng,status');
    setPublicos(data || []);
  }, []);

  useEffect(() => {
    carregarPublicos();
  }, [carregarPublicos]);

  function usarLocalizacao() {
    setErroLocalizacao('');
    if (!navigator.geolocation) {
      setErroLocalizacao('Este aparelho não informa a localização. Toque no mapa para marcar o ponto.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPonto(p);
        setFoco(p);
      },
      () => setErroLocalizacao('Não foi possível obter sua localização. Toque no mapa para marcar o ponto.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function fechar() {
    setAberto(false);
    setPonto(null);
    setErroLocalizacao('');
  }

  function enviado() {
    fechar();
    setAviso('Registro enviado. A prefeitura já pode ver este carro.');
    setTimeout(() => setAviso(''), 4000);
    carregarPublicos();
  }

  return (
    <section>
      <div className={`stage ${aberto ? 'has-side' : ''}`}>
        <div className="col">
          <div className="mapwrap">
            <MapaBase classe={aberto ? 'adicionando' : ''}>
              <CliqueNoMapa ativo={aberto} aoClicar={setPonto} />
              <VoarPara foco={foco} />
              {publicos.map((r) => (
                <CircleMarker
                  key={r.id}
                  center={[r.lat, r.lng]}
                  radius={7}
                  pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#8E99A2', fillOpacity: 1 }}
                >
                  <Tooltip>Já registrado</Tooltip>
                </CircleMarker>
              ))}
              {ponto && (
                <Marker
                  position={[ponto.lat, ponto.lng]}
                  icon={iconePin('var(--accent)', 1.2)}
                  draggable
                  eventHandlers={{
                    dragend(e) {
                      const ll = e.target.getLatLng();
                      setPonto({ lat: ll.lat, lng: ll.lng });
                    },
                  }}
                />
              )}
            </MapaBase>
            {aberto && <div className="maphint">Toque no mapa para marcar onde o carro está</div>}
          </div>

          <div className="actions">
            {!aberto && (
              <button type="button" className="btn primary" onClick={() => setAberto(true)}>
                Adicionar carro
              </button>
            )}
            <span className="count">
              {publicos.length} {publicos.length === 1 ? 'carro em análise' : 'carros em análise'} (pontos cinza no mapa)
            </span>
          </div>
          {aviso && (
            <p className="aviso-ok" role="status">
              {aviso}
            </p>
          )}
        </div>

        {aberto && (
          <FormularioCarro
            ponto={ponto}
            erroLocalizacao={erroLocalizacao}
            aoUsarLocalizacao={usarLocalizacao}
            aoCancelar={fechar}
            aoEnviado={enviado}
          />
        )}
      </div>
    </section>
  );
}
