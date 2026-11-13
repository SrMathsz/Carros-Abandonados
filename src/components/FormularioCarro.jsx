import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient.js';
import { formatarPlaca, placaValida } from '../lib/placa.js';
import { reduzirImagem } from '../lib/imagem.js';
import { buscarEndereco, enderecoPorCoordenada } from '../lib/geocode.js';

export default function FormularioCarro({ ponto, erroLocalizacao, aoUsarLocalizacao, aoLocalizarRua, aoCancelar, aoEnviado }) {
  const [foto, setFoto] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [placa, setPlaca] = useState('');
  const [descricao, setDescricao] = useState('');
  const [endereco, setEndereco] = useState('');
  const [enderecoEditado, setEnderecoEditado] = useState(false);
  const [buscandoEndereco, setBuscandoEndereco] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [procurandoRua, setProcurandoRua] = useState(false);
  const [msgRua, setMsgRua] = useState('');
  const cameraRef = useRef(null);
  const galeriaRef = useRef(null);

  // Libera a memória da prévia da foto
  useEffect(() => {
    return () => {
      if (previa) URL.revokeObjectURL(previa);
    };
  }, [previa]);

  // Sugere o endereço quando o pino muda (com uma pequena espera para não
  // consultar o serviço a cada movimento ao arrastar o pino)
  useEffect(() => {
    if (!ponto || enderecoEditado) return undefined;
    let cancelado = false;
    const espera = setTimeout(() => {
      setBuscandoEndereco(true);
      enderecoPorCoordenada(ponto.lat, ponto.lng)
        .then((texto) => {
          if (!cancelado && texto) setEndereco(texto);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelado) setBuscandoEndereco(false);
        });
    }, 600);
    return () => {
      cancelado = true;
      clearTimeout(espera);
    };
  }, [ponto, enderecoEditado]);

  // Serve para os dois botões: o da câmera e o da galeria
  function escolherFoto(e) {
    const arquivo = e.target.files && e.target.files[0];
    // Limpa o campo para permitir escolher o mesmo arquivo de novo depois
    e.target.value = '';
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) {
      setErro('Escolha um arquivo de imagem.');
      return;
    }
    setErro('');
    setFoto(arquivo);
    setPrevia(URL.createObjectURL(arquivo));
  }

  // Procura a rua digitada e leva o mapa até ela. A pessoa toca no ponto exato depois.
  async function procurarRua() {
    const texto = endereco.trim();
    setMsgRua('');
    if (texto.length < 3) {
      setMsgRua('Digite o nome da rua para procurar.');
      return;
    }
    setProcurandoRua(true);
    try {
      const resultado = await buscarEndereco(texto);
      if (!resultado) {
        setMsgRua('Não encontrei essa rua. Confira o nome ou tente só o nome da rua, sem o número.');
        return;
      }
      setEnderecoEditado(true); // mantém o que a pessoa digitou
      aoLocalizarRua(resultado);
      setMsgRua('Rua encontrada. Toque no mapa no ponto onde o carro está.');
    } catch (err) {
      console.error(err);
      setMsgRua('Não foi possível procurar agora. Toque direto no mapa para marcar o local.');
    } finally {
      setProcurandoRua(false);
    }
  }

  function removerFoto() {
    setFoto(null);
    setPrevia(null);
  }

  async function enviar(e) {
    e.preventDefault();
    setErro('');

    const desc = descricao.trim();
    const end = endereco.trim();
    if (!ponto) return setErro('Marque no mapa onde o carro está.');
    if (end.length < 3) return setErro('Informe o endereço aproximado.');
    if (placa && !placaValida(placa)) return setErro('A placa parece incompleta. Confira ou deixe em branco.');

    setEnviando(true);
    try {
      const id = crypto.randomUUID();
      let fotoPath = null;

      if (foto) {
        let blob;
        try {
          blob = await reduzirImagem(foto);
        } catch (errFoto) {
          console.error(errFoto);
          setErro('Não foi possível ler esta foto. Tente outra ou tire uma nova.');
          return;
        }
        const caminho = `${id}.jpg`;
        const { error: erroFoto } = await supabase.storage
          .from('fotos')
          .upload(caminho, blob, { contentType: 'image/jpeg' });
        if (erroFoto) throw erroFoto;
        fotoPath = caminho;
      }

      // Sem .select() de propósito: o cidadão pode inserir, mas não ler registros.
      const { error: erroInsert } = await supabase.from('registros').insert({
        id,
        endereco: end,
        descricao: desc || null,
        placa: placa || null,
        lat: ponto.lat,
        lng: ponto.lng,
        foto_path: fotoPath,
      });
      if (erroInsert) throw erroInsert;

      aoEnviado();
    } catch (err) {
      console.error(err);
      setErro('Não foi possível enviar agora. Confira a conexão e tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <aside className="side" aria-label="Novo registro">
      <h2>Novo registro</h2>
      <form className="form" onSubmit={enviar} noValidate>
        <div className="field">
          <span className="lbl">Foto do carro</span>

          {/* Dois campos escondidos: o da câmera (capture) e o da galeria (sem capture) */}
          <input ref={cameraRef} hidden type="file" id="f-camera" accept="image/*" capture="environment" onChange={escolherFoto} />
          <input ref={galeriaRef} hidden type="file" id="f-galeria" accept="image/*" onChange={escolherFoto} />

          {previa ? (
            <div className="foto-previa">
              <img src={previa} alt="Foto escolhida do carro" />
            </div>
          ) : (
            <div className="foto-vazia">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span>Nenhuma foto escolhida</span>
            </div>
          )}

          <div className="foto-acoes">
            <button type="button" className="btn" onClick={() => cameraRef.current && cameraRef.current.click()}>
              {previa ? 'Tirar outra' : 'Tirar foto'}
            </button>
            <button type="button" className="btn" onClick={() => galeriaRef.current && galeriaRef.current.click()}>
              {previa ? 'Outra da galeria' : 'Escolher da galeria'}
            </button>
          </div>
          {previa && (
            <button type="button" className="btn-sair foto-remover" onClick={removerFoto}>
              Remover foto
            </button>
          )}
        </div>

        <div className="field">
          <label className="lbl" htmlFor="f-placa">
            Placa (se estiver visível)
          </label>
          <input
            type="text"
            id="f-placa"
            className="campo-placa"
            maxLength={8}
            autoComplete="off"
            autoCapitalize="characters"
            placeholder="ABC-1234"
            value={placa}
            onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
          />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="f-descricao">
            Carro (opcional)
          </label>
          <input
            type="text"
            id="f-descricao"
            autoComplete="off"
            maxLength={120}
            placeholder="Modelo e cor, se souber. Ex.: Versa azul"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="lbl" htmlFor="f-endereco">
            Rua ou endereço {buscandoEndereco && <span className="buscando">buscando…</span>}
          </label>
          <div className="busca-linha">
            <input
              type="text"
              id="f-endereco"
              autoComplete="off"
              maxLength={200}
              placeholder="Ex.: Rua Erasmo"
              value={endereco}
              onChange={(e) => {
                setEndereco(e.target.value);
                setEnderecoEditado(e.target.value.trim() !== '');
              }}
              onKeyDown={(e) => {
                // Enter procura a rua em vez de enviar o formulário
                if (e.key === 'Enter') {
                  e.preventDefault();
                  procurarRua();
                }
              }}
            />
            <button type="button" className="btn" onClick={procurarRua} disabled={procurandoRua}>
              {procurandoRua ? 'Procurando…' : 'Buscar rua'}
            </button>
          </div>
          <p className="ajuda" role="status">
            {msgRua || 'Digite a rua e toque em Buscar. O mapa vai até ela e você toca no ponto onde o carro está.'}
          </p>
        </div>

        <div className="loc">
          <p className="locstat">
            <span className="dot-key" style={{ background: ponto ? 'var(--accent)' : 'var(--muted)' }} />
            {ponto ? 'Ponto marcado. Arraste o pino ou toque em outro lugar para ajustar.' : 'Nenhum ponto marcado no mapa'}
          </p>
          <button type="button" className="btn" onClick={aoUsarLocalizacao}>
            Usar minha localização
          </button>
          {erroLocalizacao && <p className="err">{erroLocalizacao}</p>}
        </div>

        {erro && (
          <p className="err" role="alert">
            {erro}
          </p>
        )}

        <p className="privacidade">
          A foto e os dados ficam visíveis apenas para a equipe da prefeitura. Outras pessoas veem somente um ponto no mapa.
        </p>

        <div className="formactions">
          <button type="submit" className="btn primary" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Enviar registro'}
          </button>
          <button type="button" className="btn" onClick={aoCancelar} disabled={enviando}>
            Cancelar
          </button>
        </div>
      </form>
    </aside>
  );
}
