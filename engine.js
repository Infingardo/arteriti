// -----------------------------------------------------------------------------
//  MOTORE — biopsia dell'arteria temporale. Logica pura: niente DOM, niente JSX.
//
//  v4.0.0: riallineato al consensus SCVP 2023 (Nair V, Fishbein GA, Padera R, et al.
//  Cardiovasc Pathol 2023;67:107574). Al posto del composito istologico-clinico c'e'
//  una classificazione qualitativa che risponde a una sola domanda: la media e'
//  infiammata (nell'asse o in un ramo)? Se si' → A, arterite attiva, con o senza
//  cellule giganti. Altrimenti B-E secondo gli altri reperti. Non esiste nessun punteggio.
//
//  Regole di progetto (docs/PIANO_riallineamento_consensus_SCVP2023.md):
//   - la categoria dipende SOLO dai reperti istologici; la clinica e' contesto;
//   - ogni reperto ha tre stati: non valutato (undefined) / assente ('a') / presente ('p').
//     Un campo non compilato non vale mai "assente";
//   - le criticita' (adeguatezza, livelli mancanti, DD da completare) restano fuori dal
//     testo del referto;
//   - le IHC sono un supporto: non entrano mai nella categoria.
// -----------------------------------------------------------------------------
'use strict';

const GRADI = { l: ['lieve', 'lieve'], m: ['moderato', 'moderata'], s: ['severo', 'severa'] };

// Metadati di presentazione per chiave (la pagina sceglie il componente dell'icona).
const CLASSI = {
  A:           { titolo: 'A — Arterite attiva',                                      color: 'bg-red-100 border-red-500',       icon: 'alert' },
  B:           { titolo: 'B — Senza arterite attiva, infiammazione extramediale',    color: 'bg-yellow-100 border-yellow-500', icon: 'info' },
  C:           { titolo: 'C — Aspetti suggestivi di esiti di danno arterioso',       color: 'bg-yellow-100 border-yellow-500', icon: 'info' },
  D:           { titolo: 'D — Senza arterite attiva, fibrosi intimale',              color: 'bg-blue-100 border-blue-400',     icon: 'info' },
  E:           { titolo: 'E — Negativo per arterite',                                color: 'bg-green-100 border-green-500',   icon: 'check' },
  inadeguato:  { titolo: 'Campione non valutabile',                                       color: 'bg-gray-100 border-gray-500',     icon: 'ban' },
  incompleto:  { titolo: 'Non conclusivo — infiltrato della media non valutato',     color: 'bg-gray-100 border-gray-400',     icon: 'info' },
};

// ── helper sullo stato ────────────────────────────────────────────────────────
const isP = (st, k) => !!st.r && st.r[k] === 'p';
const isA = (st, k) => !!st.r && st.r[k] === 'a';
const grado = (st, k, f) => (isP(st, k) && st.gr && GRADI[st.gr[k]]) ? GRADI[st.gr[k]][f ? 1 : 0] : '';
const join = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1];
const sp = a => a.filter(Boolean).join(' ');
const extramediale = st => isP(st, 'a_inf') || isP(st, 'a_vv') || isP(st, 'i_inf');
const mediaInfiammata = st => isP(st, 'm_inf') || st.rami === 'i';
const strutturaAssente = st => !!st.adeq && st.adeq.struttura === false;
const livelli = st => { const n = parseInt(st.adeq && st.adeq.livelli, 10); return isNaN(n) || n < 0 ? null : n; };
const giorniCortisone = st => { const n = parseInt(st.clinica && st.clinica.giorniCortisone, 10); return isNaN(n) ? null : n; };
const haSegnaliAllarme = st => !!st.redFlags && (st.redFlags.linfoidiAtipiche || st.redFlags.granulomiNecrotizzanti || st.redFlags.vasculiteNecrotizzante);

// ── conclusioni: una per chiave ───────────────────────────────────────────────
// Il test verifica che la mappa copra tutte le chiavi che classify puo' produrre, e
// nessuna in piu'. Un valore funzione compone la riga dai reperti.
const CONCLUSIONI = {
  A: 'Arterite attiva.',
  B: st => {
    const w = [];
    if (isP(st, 'i_inf')) w.push('intimale');
    if (isP(st, 'a_inf')) w.push('avventiziale e periavventiziale');
    const vv = isP(st, 'a_vv') ? (w.length ? ', con interessamento dei vasa vasorum' : 'dei vasa vasorum') : '';
    return 'Segmento di arteria muscolare senza arterite attiva. Infiammazione cronica ' + w.join(', ') + vv + '.';
  },
  C: 'Segmento di arteria muscolare con aspetti suggestivi di esiti di danno arterioso. Negativo per arterite attiva.',
  D: 'Segmento di arteria muscolare senza arterite attiva. Fibrosi intimale.',
  E: 'Segmento di arteria muscolare negativo per arterite.',
  inadeguato: 'Il campione non è valutabile istologicamente per assenza di struttura vascolare.',
  incompleto: 'Infiltrato infiammatorio della media non valutato: nessuna conclusione.',
};

// ── classificazione ───────────────────────────────────────────────────────────
function classify(st) {
  let classe;
  if (strutturaAssente(st)) classe = 'inadeguato';
  else if (mediaInfiammata(st)) classe = 'A';
  else if (!isA(st, 'm_inf')) classe = 'incompleto';
  else if (st.iel === 'f' && isP(st, 'm_fib')) classe = 'C';      // prima di B: negli esiti l'infiammazione e' scarsa e avventiziale
  else if (extramediale(st)) classe = 'B';
  else if (isP(st, 'i_fib')) classe = 'D';
  else classe = 'E';
  const c = CONCLUSIONI[classe];
  let diagnosi = typeof c === 'function' ? c(st) : c;
  if (classe !== 'inadeguato' && classe !== 'incompleto' && isP(st, 'g_amy') && st.congo === 'p') diagnosi += ' Depositi di amiloide.';
  return { classe, diagnosi };
}

// ── adeguatezza: dato descrittivo, non cambia la categoria ───────────────────
function adeguatezza(st) {
  const a = st.adeq || {};
  const n = livelli(st);
  const nega = (n !== null && n < 5) || a.inToto === false || a.elastiche === false;
  const nonNoto = n === null || a.inToto === undefined || a.elastiche === undefined;
  // con struttura assente il campione non è valutabile: la conformità non si applica
  return { livelli: n, conforme: a.struttura === false ? null : nega ? false : nonNoto ? null : true };
}

// ── elenco DD per la nota di A ────────────────────────────────────────────────
function ddList(st) {
  const l = [];
  if (isP(st, 'm_eos')) l.push('una granulomatosi eosinofila con poliangioite');
  if (isP(st, 'm_pla') || st.igg4 === 'p') l.push('una malattia correlata a IgG4');
  if (isP(st, 'g_gran')) l.push('una granulomatosi con poliangioite');
  if (isP(st, 'm_nec')) l.push('una poliarterite nodosa');
  if (isP(st, 'g_neu')) l.push('una causa infettiva');
  return l;
}

// ── macroscopia / microscopia ────────────────────────────────────────────────
function macro(st) {
  const lung = parseFloat(st.adeq && st.adeq.lunghezza);
  const L = (!isNaN(lung) && lung > 0) ? String(lung).replace('.', ',') : '[n]';
  let t = 'Arteria temporale: segmento di ' + L + ' mm di lunghezza';
  if (st.adeq && st.adeq.inToto === true) t += ', incluso in toto e sezionato a 1-2 mm dopo la processazione';
  return t + '.';
}

function levelsSentence(st) {
  const n = livelli(st);
  if (!n) return '';
  let s = 'Esame su ' + n + (n === 1 ? ' livello' : ' livelli') + ' in EE';
  if (st.adeq.elastiche === true) s += ', con colorazione per le elastiche';
  if (st.adeq.livelliAggiuntivi === true) s += ', con livelli aggiuntivi più profondi';
  return s + '.';
}

function micro(st) {
  const out = [levelsSentence(st)];
  const m = [];
  if (isP(st, 'm_inf')) {
    let x = 'Arteria muscolare con infiltrato infiammatorio' + (grado(st, 'm_inf') ? ' ' + grado(st, 'm_inf') : '') + ' a carico della media';
    const w = [];
    if (isP(st, 'm_epi')) w.push('istiociti epitelioidi');
    if (isP(st, 'm_gig')) w.push('cellule giganti di tipo Langhans');
    if (w.length) x += ', con ' + join(w);
    m.push(x + '.');
  } else if (isA(st, 'm_inf')) {
    m.push('Arteria muscolare con media priva di infiltrato infiammatorio' + (isP(st, 'm_gig') ? ', con cellule giganti isolate' : '') + '.');
  }
  if (st.rami === 'i') m.push(isP(st, 'm_inf') ? 'Interessato anche un ramo collaterale.' : 'Ramo collaterale con infiltrato infiammatorio a carico della media.');
  if (st.rami === 'n') m.push('Ramo collaterale con media indenne.');
  const med = [];
  if (isP(st, 'm_nec')) med.push('necrosi fibrinoide');
  if (isP(st, 'm_fib')) med.push('fibrosi sostitutiva' + (grado(st, 'm_fib', 1) ? ' ' + grado(st, 'm_fib', 1) : ''));
  if (st.calc === 'm' || st.calc === 'b') med.push('calcificazioni');
  // reperti inseriti ma non descritti altrove: non devono sparire dal testo
  if (isP(st, 'm_epi') && !isP(st, 'm_inf')) med.push('istiociti epitelioidi');
  if (isP(st, 'm_gig') && (!st.r || st.r.m_inf === undefined)) med.push('cellule giganti');
  if (isP(st, 'm_eos')) med.push('eosinofili');
  if (isP(st, 'm_pla')) med.push('plasmacellule');
  if (med.length) m.push('Nella media: ' + join(med) + '.');
  out.push(sp(m));
  const calcIel = (st.calc === 'i' || st.calc === 'b');
  if (st.iel === 'c') out.push('Elastica interna conservata' + (calcIel ? ', con calcificazioni' : '') + '.');
  if (st.iel === 'f') out.push('Elastica interna frammentata/interrotta' + (calcIel ? ', con calcificazioni' : '') + '.');
  if (!st.iel && calcIel) out.push('Calcificazioni dell’elastica interna.');
  const i = [];
  if (isP(st, 'i_fib')) i.push('Ispessimento intimale fibroso' + (grado(st, 'i_fib') ? ' ' + grado(st, 'i_fib') : ''));
  if (isP(st, 'i_inf')) i.push('Infiltrato infiammatorio intimale' + (grado(st, 'i_inf') ? ' ' + grado(st, 'i_inf') : ''));
  if (i.length) out.push(i.join('. ') + '.');
  else if (isA(st, 'i_fib') && isA(st, 'i_inf')) out.push('Intima senza ispessimento né infiltrato.');
  const a = [];
  if (isP(st, 'a_inf')) a.push('infiltrato infiammatorio cronico' + (grado(st, 'a_inf') ? ' ' + grado(st, 'a_inf') : ''));
  if (isP(st, 'a_vv')) a.push('interessamento dei vasa vasorum');
  if (isP(st, 'a_fib')) a.push('ispessimento fibroso' + (grado(st, 'a_fib') ? ' ' + grado(st, 'a_fib') : ''));
  if (isP(st, 'a_neo')) a.push('neovasi');
  if (a.length) out.push('Avventizia e periavventizia con ' + join(a) + '.');
  else if (isA(st, 'a_inf') && !isP(st, 'a_vv')) out.push('Avventizia e periavventizia senza infiltrato infiammatorio.');
  const al = [];
  if (isP(st, 'g_gran')) al.push('granulomi');
  if (isP(st, 'g_neu')) al.push('neutrofili/microtrombi');
  if (isP(st, 'g_amy')) al.push('materiale amorfo eosinofilo' + (st.congo === 'p' ? ' (Congo red positivo)' : st.congo === 'n' ? ' (Congo red negativo)' : ''));
  if (isP(st, 'g_tra')) al.push('trombo, pseudoaneurisma o duplicazione dell’elastica');
  if (al.length) out.push((al.length === 1 && !isP(st, 'g_gran') && !isP(st, 'g_neu') ? 'Si osserva ' : 'Si osservano ') + join(al) + '.');
  if (st.igg4 === 'p') out.push('Positiva la ricerca immunoistochimica per IgG4 (' + (st.igg4Hpf || '[n]') + ' plasmacellule IgG4+/HPF; rapporto IgG4/IgG ' + (st.igg4Rapporto || '[n]') + '%).');
  if (st.igg4 === 'n') out.push('Negativa la ricerca immunoistochimica per IgG4.');
  const neg = [];
  [['m_nec', 'necrosi fibrinoide'], ['g_gran', 'granulomi'], ['m_eos', 'eosinofili'], ['m_pla', 'plasmacellule'],
   ['g_neu', 'neutrofili o microtrombi'], ['g_tra', 'segni di trauma']].forEach(p => { if (isA(st, p[0])) neg.push(p[1]); });
  if (neg.length) out.push((neg.length === 1 && neg[0] === 'necrosi fibrinoide' ? 'Non si reperta ' : 'Non si repertano ') + join(neg) + '.');
  return sp(out.filter(Boolean));
}

// ── nota (testo del referto) ──────────────────────────────────────────────────
function nota(st, classe) {
  if (classe === 'inadeguato' || classe === 'incompleto') return '';
  const n = [];
  if (classe === 'A') {
    n.push('Diagnosi morfologica, indipendente dalla presenza di cellule giganti.');
    const dd = ddList(st);
    if (dd.length) n.push('Il quadro istologico, in correlazione con il contesto clinico, induce a considerare, tra l’altro, anche ' + join(dd) + '.');
    else n.push('La classificazione come arterite a cellule giganti resta clinica.');
  }
  if (classe === 'B') n.push((st.adeq && st.adeq.livelliAggiuntivi === true ? 'Dopo livelli aggiuntivi la media non risulta interessata. ' : '') +
    'L’infiammazione extramediale è aspecifica e non indica arterite attiva, ma non esclude un coinvolgimento segmentario.');
  if (classe === 'C') {
    n.push('Il quadro è sovrapponibile a esiti di trauma o biopsia pregressa, a esiti di arterite e a modificazioni dell’età; la morfologia non li discrimina e il significato clinico è incerto.');
    if (extramediale(st)) n.push('L’infiammazione cronica extramediale presente è di per sé aspecifica.');
  }
  if (classe === 'D') n.push('Reperto riferibile a modificazioni dell’età.');
  if (classe === 'E') n.push('L’arterite può essere segmentale: non si esclude un errore di campionamento.');
  if (classe !== 'A' && st.calc && st.calc !== 'a') n.push('Le calcificazioni (spettro della sclerosi mediale calcifica di Mönckeberg) non indicano esiti di arterite.');
  if (classe !== 'A' && isP(st, 'g_tra')) n.push('Reperti compatibili con danno traumatico o iatrogeno.');
  const g = giorniCortisone(st);
  if (st.clinica && st.clinica.cortisone === true && g !== null && g > 7)
    n.push('Biopsia eseguita oltre 7 giorni dopo l’inizio del cortisone, come da notizie cliniche: la terapia può ridurre l’infiammazione.');
  if (haSegnaliAllarme(st)) n.push('La categoria indicata è subordinata all’esclusione dei pattern morfologici alternativi identificati (vedere reperti inattesi).');
  return n.join(' ');
}

// ── criticita': NON entrano nel referto ───────────────────────────────────────
function criticita(st, classe) {
  if (classe === 'inadeguato') return [];
  const w = [];
  const n = livelli(st);
  if (n !== null && n < 5) w.push('Meno di 5 livelli (il consensus indica almeno 5)' + (classe === 'A' ? '.' : ': la negatività è meno affidabile.'));
  if (st.adeq && st.adeq.elastiche === false) w.push('Colorazione per le elastiche non eseguita: elastica interna e fibrosi della media non valutabili in modo conforme.');
  if (st.adeq && st.adeq.inToto === false) w.push('Il campione non è stato processato secondo il protocollo (in toto, sezionato dopo la processazione).');
  if (classe === 'incompleto') return w;
  if (isP(st, 'm_gig') && !mediaInfiammata(st)) w.push('Cellule giganti senza infiammazione della media: non bastano da sole per arterite attiva.');
  const add = st.adeq && st.adeq.livelliAggiuntivi === true;
  if (classe === 'B' && !add) w.push('Infiammazione solo extramediale senza livelli aggiuntivi dichiarati: eseguire livelli più profondi prima di chiudere.');
  if (classe === 'C' && extramediale(st) && !add) w.push('Esiti di danno arterioso con infiammazione extramediale: eseguire livelli più profondi per escludere il coinvolgimento della media.');
  if (st.igg4 === 'p' && (!st.igg4Hpf || !st.igg4Rapporto)) w.push('IgG4 positiva: completare conta IgG4+/HPF e rapporto IgG4/IgG (soglie: oltre 50/HPF e oltre 40%, dalla Tab. 2 del consensus, criteri aortici).');
  if (isP(st, 'g_amy') && st.congo !== 'p' && st.congo !== 'n') w.push('Materiale amorfo senza Congo red: eseguire la colorazione.');
  if (isP(st, 'g_amy') && st.congo === 'n') w.push('Materiale amorfo con Congo red negativo: riconsiderare il reperto.');
  if (isP(st, 'm_pla') && st.igg4 !== 'p' && st.igg4 !== 'n') w.push('Plasmacellule senza IgG4 immunoistochimica: da eseguire se si considera IgG4-RD (soglie: oltre 50 IgG4+/HPF e rapporto IgG4/IgG oltre 40%, dalla Tab. 2 del consensus, criteri aortici).');
  if (classe === 'A' && st.rami === 'i' && !isP(st, 'm_inf')) w.push('Media interessata solo nel ramo collaterale: per il consensus basta per arterite attiva.');
  if (st.clinica && st.clinica.cortisone === true && giorniCortisone(st) === null) w.push('Cortisone indicato ma durata non specificata: nessuna nota sul timing della biopsia.');
  if (['B', 'C', 'D', 'E'].includes(classe)) {
    const dd = [['m_nec', 'necrosi fibrinoide'], ['m_eos', 'eosinofili'], ['m_pla', 'plasmacellule'], ['g_gran', 'granulomi'], ['g_neu', 'neutrofili']].filter(q => isP(st, q[0])).map(q => q[1]);
    if (dd.length) w.push('Reperti di diagnosi differenziale presenti (' + dd.join(', ') + ') con media non infiammata: verificare l’infiltrato della media e i livelli.');
    const nv = ['i_fib', 'i_inf', 'a_inf', 'a_vv', 'm_fib'].some(k => !st.r || st.r[k] === undefined) || st.iel === undefined;
    if (nv) w.push('Campi non valutati (intima, avventizia, vasa vasorum, fibrosi della media, elastica interna): classe provvisoria.');
  }
  return w;
}

// ── avvisi di contesto clinico (non entrano nel referto) ──────────────────────
function avvisi(st) {
  const a = [];
  const eta = parseInt(st.clinica && st.clinica.eta, 10);
  if (!isNaN(eta) && eta > 0 && eta < 50)
    a.push(`Età <50 anni (${eta} aa): la GCA è eccezionale sotto i 50 anni (criteri ACR/EULAR 2022: età ≥50 requisito di classificazione). In caso di arterite attiva, in un paziente giovane la diagnosi differenziale è prioritaria: arterite di Takayasu, vasculite ANCA-associata, arterite infettiva, sarcoidosi vascolare, vasculite correlata a IgG4.`);
  return a;
}

// ── raccomandazioni IHC: supporto, mai criterio ───────────────────────────────
function getIhcRecommendations(st, classe) {
  const recs = [];
  const m = st.ihc || {};
  if (classe === 'inadeguato' || classe === 'incompleto') return recs;
  if (!m.cd68) {
    const documentato = isP(st, 'm_gig') || isP(st, 'm_epi');
    recs.push(classe !== 'A' || !documentato ? {
      marker: 'CD68', priority: 'ALTA', color: 'text-red-600',
      reason: 'CD68 documenta l’infiltrato macrofagico a livello intima-media; sensibile ma non specifico (presente in altre vasculiti granulomatose e macrofagiche), mai da solo un criterio.'
    } : {
      marker: 'CD68', priority: 'OPZIONALE', color: 'text-blue-600',
      reason: 'Cellule giganti o istiociti epitelioidi già documentati su EE. CD68 può documentare la distribuzione intima-media dell’infiltrato macrofagico.'
    });
  }
  if (!m.cd4 && !m.cd8) {
    if (classe === 'B' || classe === 'C')
      recs.push({ marker: 'CD4 + CD8', priority: 'ALTA', color: 'text-red-600',
        reason: 'La distribuzione compartimentale CD4/CD8 (pattern descritto: CD4 prevalente in media, CD8 in avventizia) può supportare la diagnosi differenziale. Non specifica se isolata.' });
  } else if (m.cd4 && !m.cd8) {
    recs.push({ marker: 'CD8', priority: 'MEDIA', color: 'text-orange-600',
      reason: 'Per valutare il rapporto CD4/CD8. Pattern descritto in GCA: CD4+ prevalente in media, CD8+ in avventizia. Non discriminante se isolato.' });
  }
  if (!m.cd20 && !isP(st, 'm_inf') && !haSegnaliAllarme(st) && ddList(st).length === 0) {
    recs.push({ marker: 'CD20', priority: 'MEDIA', color: 'text-orange-600',
      reason: 'Utile se si sospetta una componente B prominente: un infiltrato B-ricco fa riconsiderare la diagnosi (IgG4-RD, vasculiti linfocitarie). Per IgG4 servono morfologia, plasmacellule e rapporto IgG4/IgG su IHC dedicata.' });
  }
  if (!m.cd3 && (m.cd4 || m.cd8)) {
    recs.push({ marker: 'CD3', priority: 'BASSA', color: 'text-gray-600',
      reason: 'Opzionale: quantifica la popolazione T totale. Non essenziale per la routine.' });
  }
  return recs;
}

// ── referto ───────────────────────────────────────────────────────────────────
function generateReferto(st, classe, diagnosi) {
  const parti = { macro: macro(st), micro: '', rf: [], ihc: [] };
  if (classe !== 'inadeguato') parti.micro = micro(st);
  if (classe !== 'inadeguato' && st.redFlags) {
    const rf = st.redFlags;
    if (rf.linfoidiAtipiche) parti.rf.push('— Cellule linfoidi atipiche intravascolari (sospetto linfoma intravascolare — IHC urgente: CD20, CD3, MUM1, Ki67)');
    if (rf.granulomiNecrotizzanti) parti.rf.push('— Granulomi con necrosi centrale (escludere arterite infettiva: ZN, PAS+GMS)');
    if (rf.vasculiteNecrotizzante) parti.rf.push('— Vasculite necrotizzante/necrosi fibrinoide di parete con infiltrato neutrofilico prominente (escludere vasculite ANCA-associata, PAN)');
  }
  const ihc = st.ihc || {};
  if (classe !== 'inadeguato') ['cd68', 'cd4', 'cd8', 'cd3', 'cd20'].forEach(k => { if (ihc[k]) parti.ihc.push(k.toUpperCase()); });
  const nt = nota(st, classe);
  let r = 'ARTERIA TEMPORALE — BIOPSIA\n\nMacroscopia: ' + parti.macro;
  if (parti.micro) r += '\n\nMicroscopia: ' + parti.micro;
  if (parti.ihc.length) r += '\nImmunoistochimica eseguita: ' + parti.ihc.join(', ') + '.';
  if (parti.rf.length) r += '\n\nREPERTI INATTESI:\n' + parti.rf.join('\n');
  r += '\n\nDiagnosi: ' + diagnosi;
  if (nt) r += '\n\nNota: ' + nt;
  return { referto: r, macro: parti.macro, micro: parti.micro, nota: nt };
}

// Un solo punto di verita': la pagina e i test leggono questo oggetto.
function runCase(st) {
  const { classe, diagnosi } = classify(st);
  const meta = CLASSI[classe];
  const subordinata = classe !== 'inadeguato' && classe !== 'incompleto' && !!haSegnaliAllarme(st);
  const ref = generateReferto(st, classe, diagnosi);
  return {
    classe, diagnosi, titolo: meta.titolo,
    color: subordinata ? 'bg-purple-100 border-purple-500' : meta.color,
    icon: subordinata ? 'triangle' : meta.icon,
    subordinata, redFlag: subordinata,
    nota: ref.nota, macro: ref.macro, micro: ref.micro, referto: ref.referto,
    criticita: criticita(st, classe),
    avvisi: avvisi(st),
    adeguatezza: adeguatezza(st),
    ihcRecs: getIhcRecommendations(st, classe),
  };
}

const API = { CONCLUSIONI, CLASSI, classify, runCase, criticita, avvisi, adeguatezza, getIhcRecommendations, generateReferto };
if (typeof globalThis !== 'undefined') Object.assign(globalThis, API);
if (typeof module !== 'undefined' && module.exports) module.exports = API;
