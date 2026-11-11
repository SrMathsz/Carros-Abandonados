import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import MapaBase, { iconePin } from '../components/MapaBase.jsx';
import { Placa, StatusPill } from '../components/Etiquetas.jsx';
import { supabase } from '../supabaseClient.js';
import { ORDEM_STATUS, STATUS, dataCompleta, dataCurta } from '../lib/constantes.js';
import { agrupar } from '../lib/agrupar.js';

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */
function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    if (!supabase) return setErro('O Supabase ainda não está configurado.');
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) setErro('E-mail ou senha incorretos.');
  }

  return (
    <section className="login">
      <div className="side">
        <h2>Acesso da prefeitura</h2>
        <form className="form" onSubmit={entrar}>
          <div className="field">
            <label className="lbl" htmlFor="l-email">
              E-mail
            </label>
            <input id="l-email" type="text" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="lbl" htmlFor="l-senha">
              Senha
            </label>
            <input id="l-senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && (
            <p className="err" role="alert">
              {erro}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mapa: ajusta a vista aos pinos na primeira carga                    */
/* ------------------------------------------------------------------ */
function AjustarVista({ registros }) {
  const mapa = useMap();
  const feito = useRef(false);
  useEffect(() => {
    if (feito.current || registros.length === 0) return;
    feito.current = true;
    mapa.fitBounds(
      registros.map((r) => [r.lat, r.lng]),
      { padding: [40, 40], maxZoom: 17 }
    );
  }, [registros, mapa]);
  return null;
}

function IrParaSelecionado({ registro }) {
  const mapa = useMap();
  useEffect(() => {
    if (registro) mapa.panTo([registro.lat, registro.lng]);
  }, [registro, mapa]);
  return null;
}

/* ------------------------------------------------------------------ */
/* Detalhe de um registro                                              */
/* ------------------------------------------------------------------ */
function Detalhe({ grupo, aoMudarStatus }) {
  const [fotos, setFotos] = useState([]);
  const caminhos = grupo.itens.map((i) => i.foto_path).filter(Boolean);
  const chaveFotos = caminhos.join('|');
  const enderecos = [...new Set(grupo.itens.map((i) => i.endereco))];

  useEffect(() => {
    let ativo = true;
    setFotos([]);
    if (caminhos.length === 0) return undefined;
    supabase.storage
      .from('fotos')
      .createSignedUrls(caminhos, 3600)
      .then(({ data }) => {
        if (ativo && data) setFotos(data.filter((f) => f.signedUrl).map((f) => f.signedUrl));
      });
    return () => {
      ativo = false;
    };
  }, [chaveFotos]);

  return (
    <div className="detail">
      {fotos.length > 0 ? (
        <div className="fotos">
          {fotos.map((url, i) => (
            <div className="photo" key={url}>
              <img src={url} alt={`Foto ${i + 1} do carro em ${grupo.endereco}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="photo">
          <span>{caminhos.length ? 'Carregando foto…' : 'Registro sem foto'}</span>
        </div>
      )}
      {grupo.total > 1 ? (
        <p className="meta">
          {grupo.total} registros deste carro. Primeiro em {dataCompleta(grupo.primeiro)}, último em{' '}
          {dataCompleta(grupo.itens[0].criado_em)}.
        </p>
      ) : (
        <p className="meta">Registrado em {dataCompleta(grupo.criado_em)}</p>
      )}
      {enderecos.length > 1 && <p className="meta">Endereços informados: {enderecos.join('; ')}</p>}
      <div className="statusrow" role="group" aria-label="Alterar situação">
        {ORDEM_STATUS.map((s) => (
          <button
            key={s}
            type="button"
            data-status={s}
            aria-pressed={grupo.status === s}
            onClick={() => aoMudarStatus(grupo, s)}
          >
            {STATUS[s]}
          </button>
        ))}
      </div>
      <a
        className="link-mapa"
        href={`https://www.google.com/maps/search/?api=1&query=${grupo.lat},${grupo.lng}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir no Google Maps
      </a>
      <p className="legal">Antes do recolhimento, siga o procedimento do município para notificar o proprietário.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel                                                              */
/* ------------------------------------------------------------------ */
function Painel() {
  const [autorizado, setAutorizado] = useState(null);
  const [registros, setRegistros] = useState([]);
  const [filtro, setFiltro] = useState('todos');
  const [selecionado, setSelecionado] = useState(null);
  const [aviso, setAviso] = useState('');
  const listaRef = useRef(null);
  // Um item por carro: registros da mesma placa são juntados, com o total
  const grupos = useMemo(() => agrupar(registros), [registros]);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('registros').select('*').order('criado_em', { ascending: false });
    if (error) {
      setAviso('Não foi possível carregar os registros.');
      return;
    }
    setRegistros(data || []);
  }, []);

  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await supabase.from('agentes').select('user_id').maybeSingle();
      if (!ativo) return;
      setAutorizado(Boolean(data));
      if (data) carregar();
    })();

    // Atualiza a lista quando alguém registra um carro novo ou muda uma situação
    const canal = supabase
      .channel('registros-painel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'registros' }, () => carregar())
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(canal);
    };
  }, [carregar]);

  function mostrarAviso(texto) {
    setAviso(texto);
    setTimeout(() => setAviso(''), 3500);
  }

  // Muda a situação de todos os registros do mesmo carro de uma vez
  async function mudarStatus(grupo, status) {
    const ids = grupo.ids;
    setRegistros((lista) => lista.map((r) => (ids.includes(r.id) ? { ...r, status } : r)));
    const { error } = await supabase.from('registros').update({ status }).in('id', ids);
    if (error) {
      mostrarAviso('Não foi possível alterar a situação.');
      carregar();
      return;
    }
    mostrarAviso(`Situação alterada para ${STATUS[status].toLowerCase()}.`);
  }

  function selecionar(id, alternar) {
    setSelecionado((atual) => (alternar && atual === id ? null : id));
  }

  // Rola a lista até o cartão escolhido (útil ao clicar num pino do mapa)
  useEffect(() => {
    if (!selecionado || !listaRef.current) return;
    const el = listaRef.current.querySelector(`[data-id="${selecionado}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selecionado]);

  if (autorizado === null) return <p className="note">Carregando…</p>;

  if (!autorizado) {
    return (
      <section className="login">
        <div className="side">
          <h2>Sem permissão</h2>
          <p>Esta conta não está cadastrada como agente da prefeitura.</p>
          <button type="button" className="btn" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </section>
    );
  }

  const visiveis = grupos.filter((r) => filtro === 'todos' || r.status === filtro);
  const contagem = (s) => grupos.filter((r) => s === 'todos' || r.status === s).length;
  const registroSelecionado = visiveis.find((r) => r.id === selecionado) || null;
  const filtros = [['todos', 'Todos'], ...ORDEM_STATUS.map((s) => [s, `${STATUS[s]}s`])];

  return (
    <section>
      <div className="stage has-side">
        <div className="col">
          <div className="mapwrap">
            <MapaBase>
              <AjustarVista registros={grupos} />
              <IrParaSelecionado registro={registroSelecionado} />
              {visiveis.map((r) => {
                const escolhido = r.id === selecionado;
                return (
                  <Marker
                    key={r.id}
                    position={[r.lat, r.lng]}
                    icon={iconePin(`var(--st-${r.status})`, escolhido ? 1.35 : 1, r.total)}
                    zIndexOffset={escolhido ? 1000 : 0}
                    eventHandlers={{ click: () => selecionar(r.id, false) }}
                    title={`${r.endereco} · ${r.descricao}${r.total > 1 ? ` · ${r.total} registros` : ''}`}
                  />
                );
              })}
            </MapaBase>
            <div className="maplegend" aria-hidden="true">
              {ORDEM_STATUS.map((s) => (
                <span key={s}>
                  <i className="dot-key" style={{ background: `var(--st-${s})` }} />
                  {STATUS[s]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <aside className="side" aria-label="Carros registrados">
          <div className="side-head">
            <h2>Registros</h2>
            <button type="button" className="btn-sair" onClick={() => supabase.auth.signOut()}>
              Sair
            </button>
          </div>

          <div className="chips" role="group" aria-label="Filtrar por situação">
            {filtros.map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                className="chip"
                aria-pressed={filtro === chave}
                onClick={() => {
                  setFiltro(chave);
                  setSelecionado(null);
                }}
              >
                {rotulo} {contagem(chave)}
              </button>
            ))}
          </div>

          <div className="list" ref={listaRef}>
            {visiveis.length === 0 && <p className="empty">Nenhum carro nesta situação.</p>}
            {visiveis.map((r) => {
              const aberto = r.id === selecionado;
              return (
                <article key={r.id} data-id={r.id} className={`card ${aberto ? 'sel' : ''}`}>
                  <button type="button" className="card-head" aria-expanded={aberto} onClick={() => selecionar(r.id, true)}>
                    <span className="addr">{r.endereco}</span>
                    <span className="car">Carro: {r.descricao}</span>
                    <span className="row">
                      <Placa valor={r.placa} />
                      <StatusPill status={r.status} />
                      {r.total > 1 && <span className="contador">{r.total} registros</span>}
                      <span className="when">{dataCurta(r.criado_em)}</span>
                    </span>
                  </button>
                  {aberto && <Detalhe grupo={r} aoMudarStatus={mudarStatus} />}
                </article>
              );
            })}
          </div>
        </aside>
      </div>
      {aviso && (
        <p className="toast" role="status">
          {aviso}
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */
export default function Prefeitura() {
  const [sessao, setSessao] = useState(undefined); // undefined = carregando

  useEffect(() => {
    if (!supabase) {
      setSessao(null);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova));
    return () => data.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return <p className="note">Carregando…</p>;
  if (!sessao) return <Login />;
  return <Painel />;
}
