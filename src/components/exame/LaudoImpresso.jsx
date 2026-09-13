import { createPortal } from 'react-dom';
import { LogoMark } from '../brand/Logo';
import { formatarData, formatarHora, idade, mascararCpf } from '../../utils/format';

// Laudo em formato de documento, só para impressão (e "Salvar como PDF" do navegador).
//
// Fica fora do #root, num portal no <body>: na impressão o CSS esconde o app inteiro e
// mostra só isto (ver ".laudo-impresso" em index.css). As cores do documento são fixas
// no CSS — papel é sempre branco, com o app no tema escuro ou não.
//
// É DEMONSTRAÇÃO: marca d'água e rodapé dizem que os dados são fictícios e que o
// documento não tem validade. Não remover — o nome e o endereço da unidade são reais
// (OpenStreetMap), então sem o aviso isto pareceria um laudo verdadeiro dela.

/** Código curto e estável a partir dos dados do laudo (FNV-1a) — só ilustrativo. */
function codigoDeVerificacao(texto) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i += 1) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const hex = hash.toString(16).toUpperCase().padStart(8, '0');
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

function protocoloDoExame(exame) {
  const ano = (exame.dataRealizacao ?? exame.dataSolicitacao ?? '').slice(0, 4) || new Date().getFullYear();
  return `${ano}.${String(exame.id).padStart(6, '0')}`;
}

export default function LaudoImpresso({ exame, paciente }) {
  const { resultado, unidade, tipoExame } = exame;
  if (!resultado || typeof document === 'undefined') return null;

  const protocolo = protocoloDoExame(exame);
  const emitidoEm = new Date();
  const codigo = codigoDeVerificacao(`${exame.id}|${resultado.id}|${resultado.dataDisponibilizacao}|${paciente?.cpf ?? ''}`);
  const alterados = resultado.itens.some((item) => item.alterado);
  const realizado = exame.dataAgendada
    ? `${formatarData(exame.dataAgendada)} às ${formatarHora(exame.dataAgendada)}`
    : exame.dataRealizacao
      ? formatarData(exame.dataRealizacao)
      : '—';
  const [nomeResponsavel, registro] = resultado.responsavel.split(' — ');

  const dados = [
    { rotulo: 'Paciente', valor: paciente?.nome, largo: true },
    {
      rotulo: 'Nascimento',
      valor: paciente?.dataNascimento ? `${formatarData(paciente.dataNascimento)} (${idade(paciente.dataNascimento)} anos)` : '—',
    },
    { rotulo: 'CPF', valor: paciente?.cpf ? mascararCpf(paciente.cpf) : '—' },
    { rotulo: 'Convênio', valor: paciente?.plano ?? '—' },
    { rotulo: 'Carteirinha', valor: paciente?.carteirinha ?? '—' },
    { rotulo: 'Médico solicitante', valor: exame.medicoSolicitante ?? 'Autossolicitação', largo: true },
    { rotulo: 'Solicitado em', valor: exame.dataSolicitacao ? formatarData(exame.dataSolicitacao) : '—' },
    { rotulo: 'Realizado em', valor: realizado },
    { rotulo: 'Liberado em', valor: formatarData(resultado.dataDisponibilizacao) },
    { rotulo: 'Situação', valor: 'Laudo liberado' },
  ];

  return createPortal(
    <article className="laudo-impresso" aria-hidden="true">
      <div className="laudo__marca-dagua">DEMONSTRAÇÃO · DADOS FICTÍCIOS</div>

      <header className="laudo__cabecalho">
        <div className="laudo__instituicao">
          <LogoMark className="laudo__logo" />
          <div>
            <p className="laudo__nome-inst">Jornada · Medicina Diagnóstica</p>
            <p className="laudo__unidade">{unidade.nome}</p>
            <p className="laudo__endereco">
              {[unidade.endereco, unidade.cidade && `${unidade.cidade}/${unidade.uf}`].filter(Boolean).join(' — ')}
            </p>
          </div>
        </div>
        <div className="laudo__protocolo">
          <p className="laudo__tipo-doc">Laudo de exame</p>
          <p>
            Protocolo <strong>{protocolo}</strong>
          </p>
          <p>Emitido em {formatarData(emitidoEm)} às {formatarHora(emitidoEm)}</p>
        </div>
      </header>

      <section className="laudo__dados" aria-label="Dados do paciente">
        {dados.map(({ rotulo, valor, largo }) => (
          <div key={rotulo} className={largo ? 'laudo__dado laudo__dado--largo' : 'laudo__dado'}>
            <span className="laudo__rotulo">{rotulo}</span>
            <span className="laudo__valor">{valor ?? '—'}</span>
          </div>
        ))}
      </section>

      <section className="laudo__exame">
        <h1 className="laudo__titulo">{tipoExame.nome}</h1>
        <p className="laudo__categoria">{tipoExame.categoria}</p>

        <table className="laudo__tabela">
          <thead>
            <tr>
              <th scope="col">Parâmetro</th>
              <th scope="col">Resultado</th>
              <th scope="col">Valores de referência</th>
            </tr>
          </thead>
          <tbody>
            {resultado.itens.map((item) => (
              <tr key={item.parametro} className={item.alterado ? 'laudo__linha--alterada' : undefined}>
                <th scope="row">{item.parametro}</th>
                <td>
                  {item.valor}
                  {item.alterado && <span className="laudo__asterisco"> *</span>}
                </td>
                <td>{item.referencia}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {alterados && <p className="laudo__legenda">(*) Valor fora do intervalo de referência.</p>}
      </section>

      <section className="laudo__conclusao">
        <h2>Conclusão</h2>
        <p>{resultado.laudo}</p>
      </section>

      <section className="laudo__assinatura">
        <div className="laudo__assinante">
          <div className="laudo__linha-assinatura" />
          <p className="laudo__assinante-nome">{nomeResponsavel}</p>
          {registro && <p>{registro}</p>}
          <p>Responsável técnico(a)</p>
        </div>
        <div className="laudo__verificacao">
          <p>Assinado eletronicamente em {formatarData(resultado.dataDisponibilizacao)}</p>
          <p>
            Código de verificação <strong>{codigo}</strong>
          </p>
        </div>
      </section>

      <footer className="laudo__rodape">
        <p>
          Resultados de exames devem ser interpretados pelo médico, considerando a história clínica e outros exames do
          paciente. Valores de referência podem variar conforme idade, sexo e método.
        </p>
        <p className="laudo__aviso">
          Documento de demonstração gerado pelo protótipo Jornada (Challenge FIAP 2026 · Unimed Nacional). Dados de
          paciente, exame e resultado são fictícios; este documento não tem validade clínica nem legal.
        </p>
      </footer>
    </article>,
    document.body,
  );
}
