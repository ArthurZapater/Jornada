import { getDb, porId } from './mockDb';
import { idLogado, simularRequisicao } from './http';
import { normalizar } from '../utils/format';

const LIMITE = 8;

// Telas que não são dado do beneficiário, mas que as pessoas procuram pelo nome.
const PAGINAS = [
  { chave: 'p-config', titulo: 'Configurações', subtitulo: 'Tema, texto, voz e notificações', link: '/configuracoes', termos: 'configuracoes ajustes tema escuro claro tamanho texto letra voz notificacoes' },
  { chave: 'p-perfil-saude', titulo: 'Perfil de saúde', subtitulo: 'Alergias, hábitos e contato de emergência', link: '/perfil/saude', termos: 'perfil saude alergia tipo sanguineo remedios contato emergencia habitos questionario' },
  { chave: 'p-sobre', titulo: 'Sobre a Jornada', subtitulo: 'Versão, equipe e licenças', link: '/sobre', termos: 'sobre versao equipe licencas' },
];

/** Busca global do header: especialidades, médicos, exames, resultados e unidades. */
export function buscar(texto) {
  return simularRequisicao(async () => {
    const termo = normalizar(texto);
    if (termo.length < 2) return [];
    const db = await getDb();
    const id = idLogado();
    const combina = (...campos) => normalizar(campos.join(' ')).includes(termo);

    const resultados = [
      ...PAGINAS.filter((p) => combina(p.titulo, p.termos)).map((p) => ({ chave: p.chave, tipo: 'Tela', titulo: p.titulo, subtitulo: p.subtitulo, link: p.link })),
      ...db.especialidades
        .filter((e) => combina(e.nome))
        .map((e) => ({ chave: `e-${e.id}`, tipo: 'Especialidade', titulo: e.nome, subtitulo: 'Agendar consulta', link: `/consultas/agendar?especialidade=${e.id}` })),
      ...db.medicos
        .filter((m) => combina(m.nome, porId(db.especialidades, m.especialidadeId).nome))
        .map((m) => ({ chave: `m-${m.id}`, tipo: 'Médico', titulo: m.nome, subtitulo: porId(db.especialidades, m.especialidadeId).nome, link: `/consultas/agendar?medico=${m.id}` })),
      ...db.exames
        .filter((e) => e.beneficiarioId === id && combina(porId(db.tiposExame, e.tipoExameId).nome))
        .map((e) => ({ chave: `r-${e.id}`, tipo: 'Resultado', titulo: porId(db.tiposExame, e.tipoExameId).nome, subtitulo: e.status === 'DISPONIVEL' ? 'Resultado disponível' : 'Aguardando resultado', link: `/resultados/${e.id}` })),
      ...db.tiposExame
        .filter((t) => combina(t.nome, t.categoria))
        .map((t) => ({ chave: `t-${t.id}`, tipo: 'Exame', titulo: t.nome, subtitulo: 'Agendar exame', link: `/exames/agendar?tipo=${t.id}` })),
      ...db.unidades
        .filter((u) => combina(u.nome, u.endereco))
        .map((u) => ({ chave: `u-${u.id}`, tipo: 'Unidade', titulo: u.nome, subtitulo: u.endereco, link: `/rede?busca=${encodeURIComponent(u.nome)}` })),
    ];
    return resultados.slice(0, LIMITE);
  }, 150);
}
