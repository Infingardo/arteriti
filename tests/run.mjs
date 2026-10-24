// Runner dei test del motore — nessun framework.
// Esecuzione:  node tests/run.mjs   (oppure: npm test)   Exit code 0 = tutto verde.
//
// v4.0.0: il motore classifica secondo il consensus SCVP 2023 (Nair et al., Cardiovasc
// Pathol 2023;67:107574). Una sola domanda istologica decide: la media e' infiammata?
// Sì → A (arterite attiva). Poi B-E secondo gli altri reperti. La clinica non entra
// mai nella categoria. Nessun punteggio.
//
// Convenzione dell'input: ogni reperto e' undefined (non valutato), 'a' (assente) o
// 'p' (presente). Un campo non compilato NON vale 'assente'.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const E = require('../engine.js');
const { runCase, classify, CONCLUSIONI } = E;

let pass = 0, fail = 0; const failures = [];
const check = (n, c, d = '') => c ? pass++ : (fail++, failures.push(n + (d ? ` — ${d}` : '')));
const eq = (n, a, b) => check(n, a === b, `atteso ${JSON.stringify(b)}, ottenuto ${JSON.stringify(a)}`);
const section = t => console.log(`\n• ${t}`);
// Ogni caso gira isolato: un'eccezione e' un fallimento di quel caso, non la fine della suite.
const T = (nome, fn) => { try { fn(); } catch (e) { fail++; failures.push(`${nome} — eccezione: ${e.message}`); } };

// ── costruzione dello stato ────────────────────────────────────────────────
const RKEYS = ['i_fib','i_inf','m_inf','m_epi','m_gig','m_nec','m_fib','m_eos','m_pla',
               'a_inf','a_vv','a_fib','a_neo','g_gran','g_neu','g_amy','g_tra'];
const tutti = v => Object.fromEntries(RKEYS.map(k => [k, v]));
const S = (o = {}) => ({
  adeq: { lunghezza:'12', livelli:'6', inToto:true, elastiche:true, livelliAggiuntivi:undefined,
          struttura:true, ...(o.adeq || {}) },
  r:    { ...(o.r || {}) },
  gr:   { ...(o.gr || {}) },
  iel:  o.iel, calc: o.calc, rami: o.rami, congo: o.congo, igg4: o.igg4,
  igg4Hpf: o.igg4Hpf || '', igg4Rapporto: o.igg4Rapporto || '',
  ihc:  { cd68:false, cd4:false, cd8:false, cd3:false, cd20:false, ...(o.ihc || {}) },
  redFlags: { linfoidiAtipiche:false, granulomiNecrotizzanti:false, vasculiteNecrotizzante:false, ...(o.rf || {}) },
  clinica: { eta:'', cortisone:undefined, giorniCortisone:'', ves:'', pcr:undefined,
             cefalea:undefined, claudicatio:undefined, visivi:undefined, halo:undefined, ...(o.cli || {}) },
});
const CLIN_PIENA = { eta:'72', cefalea:true, claudicatio:true, visivi:true, ves:'90', pcr:true, halo:true };
const NEG = tutti('a');
const FORBIDDEN = /arterite temporale|Horton|arterite atipica|\batipic[oa]\b/i;
const rigaDiagnosi = txt => (txt.match(/Diagnosi: (.*)/) || [, ''])[1];

// ══════════════════════════════════════════════════════════════════════════
section('una classe per ogni esito: A-E, inadeguato, incompleto');
T('A da media dell asse', () => {
  const r = runCase(S({ r:{ m_inf:'p', m_gig:'p', m_epi:'p' } }));
  eq('A: chiave', r.classe, 'A');
  eq('A: riga di diagnosi', r.diagnosi, 'Arterite attiva.');
  check('A: la nota dichiara che la diagnosi è morfologica', /Diagnosi morfologica, indipendente dalla presenza di cellule giganti/.test(r.nota), r.nota);
});
T('A da solo ramo', () => {
  const r = runCase(S({ r:{ m_inf:'a' }, rami:'i' }));
  eq('A da ramo: chiave', r.classe, 'A');
  check('A da ramo: criticità dedicata', r.criticita.some(c => /solo nel ramo collaterale/.test(c)), r.criticita.join('|'));
  const asseERamo = runCase(S({ r:{ m_inf:'p' }, rami:'i' }));
  check('A su asse e ramo: nessuna criticità sul ramo', !asseERamo.criticita.some(c => /solo nel ramo collaterale/.test(c)));
});
T('A con ciascun segnale DD', () => {
  const casi = [
    ['m_eos', /granulomatosi eosinofila con poliangioite/],
    ['m_pla', /malattia correlata a IgG4/],
    ['g_gran', /granulomatosi con poliangioite/],
    ['m_nec', /poliarterite nodosa/],
    ['g_neu', /causa infettiva/],
  ];
  for (const [k, re] of casi) {
    const r = runCase(S({ r:{ m_inf:'p', [k]:'p' } }));
    eq(`A + ${k}: chiave`, r.classe, 'A');
    check(`A + ${k}: la nota induce a considerare la DD`, /induce a considerare, tra l.altro, anche/.test(r.nota) && re.test(r.nota), r.nota);
  }
  const igg4 = runCase(S({ r:{ m_inf:'p' }, igg4:'p' }));
  check('A + IgG4 positiva: DD IgG4-RD', /malattia correlata a IgG4/.test(igg4.nota));
  const senza = runCase(S({ r:{ m_inf:'p' } }));
  check('A senza segnali DD: la classificazione resta clinica', /resta clinica/.test(senza.nota), senza.nota);
});
T('B', () => {
  const av = runCase(S({ r:{ m_inf:'a', a_inf:'p' } }));
  eq('B da avventizia: chiave', av.classe, 'B');
  check('B da avventizia: riga', /^Segmento di arteria muscolare senza arterite attiva\. Infiammazione cronica avventiziale e periavventiziale\./.test(av.diagnosi), av.diagnosi);
  const vv = runCase(S({ r:{ m_inf:'a', a_vv:'p' } }));
  eq('B da soli vasa vasorum: chiave', vv.classe, 'B');
  check('B da vasa vasorum: riga', /vasa vasorum/.test(vv.diagnosi), vv.diagnosi);
  const im = runCase(S({ r:{ m_inf:'a', i_inf:'p' } }));
  eq('B da intima: chiave', im.classe, 'B');
  check('B da intima: riga', /intimale/.test(im.diagnosi), im.diagnosi);
  check('B senza livelli aggiuntivi: criticità', av.criticita.some(c => /livelli più profondi/.test(c)), av.criticita.join('|'));
  const conLiv = runCase(S({ adeq:{ livelliAggiuntivi:true }, r:{ m_inf:'a', a_inf:'p' } }));
  check('B con livelli aggiuntivi: niente criticità', !conLiv.criticita.some(c => /livelli più profondi/.test(c)));
  check('B con livelli aggiuntivi: la nota lo dice', /Dopo livelli aggiuntivi la media non risulta interessata/.test(conLiv.nota), conLiv.nota);
});
T('C', () => {
  const c = runCase(S({ r:{ m_inf:'a', m_fib:'p' }, iel:'f' }));
  eq('C: chiave', c.classe, 'C');
  eq('C: riga', c.diagnosi, 'Segmento di arteria muscolare con aspetti suggestivi di esiti di danno arterioso. Negativo per arterite attiva.');
  check('C: nota prudente', /significato clinico è incerto/.test(c.nota), c.nota);
  const cInf = runCase(S({ r:{ m_inf:'a', m_fib:'p', a_inf:'p' }, iel:'f' }));
  eq('C con avventizia infiammata: resta C, non B', cInf.classe, 'C');
  check('C con infiammazione extramediale: criticità livelli profondi', cInf.criticita.some(c2 => /livelli più profondi/.test(c2)), cInf.criticita.join('|'));
  const soloIEL = runCase(S({ r:{ m_inf:'a', m_fib:'a' }, iel:'f' }));
  check('IEL interrotta senza fibrosi della media non è C', soloIEL.classe !== 'C', soloIEL.classe);
});
T('D', () => {
  const d = runCase(S({ r:{ m_inf:'a', i_fib:'p' }, iel:'c' }));
  eq('D: chiave', d.classe, 'D');
  eq('D: riga', d.diagnosi, 'Segmento di arteria muscolare senza arterite attiva. Fibrosi intimale.');
});
T('E', () => {
  const e = runCase(S({ r:{ ...NEG } , iel:'c' }));
  eq('E: chiave', e.classe, 'E');
  eq('E: riga', e.diagnosi, 'Segmento di arteria muscolare negativo per arterite.');
  check('E: la nota ricorda la segmentarietà senza cifre', /segmentale/.test(e.nota) && !/\d\s?%/.test(e.nota), e.nota);
  const calc = runCase(S({ r:{ ...NEG }, calc:'m' }));
  eq('E con calcificazioni: chiave', calc.classe, 'E');
  check('E con calcificazioni: Mönckeberg, non esiti', /Mönckeberg/.test(calc.nota) && /non indicano esiti di arterite/.test(calc.nota), calc.nota);
  const aA = runCase(S({ r:{ m_inf:'p' }, calc:'m' }));
  check('in A le calcificazioni non producono la nota Mönckeberg', !/Mönckeberg/.test(aA.nota));
  const amy = runCase(S({ r:{ ...NEG, g_amy:'p' }, congo:'p' }));
  eq('E con amiloide: chiave', amy.classe, 'E');
  check('E con amiloide e Congo positivo: «Depositi di amiloide» in diagnosi', /Depositi di amiloide\.$/.test(amy.diagnosi), amy.diagnosi);
  const amyNo = runCase(S({ r:{ ...NEG, g_amy:'p' } }));
  check('amorfo senza Congo: niente amiloide in diagnosi', !/amiloide/.test(amyNo.diagnosi));
  check('amorfo senza Congo: criticità', amyNo.criticita.some(c => /Materiale amorfo senza Congo/.test(c)), amyNo.criticita.join('|'));
});
T('inadeguato e incompleto', () => {
  const inad = runCase(S({ adeq:{ struttura:false }, r:{ m_inf:'p', m_gig:'p' } }));
  eq('inadeguato: chiave', inad.classe, 'inadeguato');
  check('inadeguato: dice che non è valutabile', /non è valutabile istologicamente/.test(inad.diagnosi), inad.diagnosi);
  check('inadeguato: nessuna raccomandazione clinica', !/eco-Doppler|\bPET\b|controlaterale/i.test(inad.referto));
  const inc = runCase(S({ r:{ i_inf:'p', a_inf:'p' } }));
  eq('media non valutata: incompleto', inc.classe, 'incompleto');
  check('incompleto: nessuna conclusione', /nessuna conclusione/.test(inc.diagnosi), inc.diagnosi);
  const nonValutataMaRamo = runCase(S({ rami:'i' }));
  eq('media dell asse non valutata ma ramo infiammato: A', nonValutataMaRamo.classe, 'A');
  const strutturaNV = runCase(S({ adeq:{ struttura:undefined }, r:{ m_inf:'a' } }));
  check('struttura non valutata non vale assente', strutturaNV.classe !== 'inadeguato', strutturaNV.classe);
});

// ══════════════════════════════════════════════════════════════════════════
section('i sei casi di regressione del piano (v3.7.0 → v4.0.0)');
T('regressione 1-6', () => {
  const c1 = runCase(S({ r:{ m_inf:'p', i_inf:'p', a_inf:'p' } }));
  eq('1. infiammazione transmurale senza giganti, solo istologia → A', c1.classe, 'A');
  const c2 = runCase(S({ r:{ m_inf:'p', i_inf:'p' } }));
  eq('2. infiltrato medio-intimale isolato, solo istologia → A', c2.classe, 'A');
  const c3 = runCase(S({ r:{ m_inf:'p', i_inf:'p' }, cli:CLIN_PIENA }));
  eq('3. come 2 con clinica piena → A', c3.classe, 'A');
  eq('3. e la riga di diagnosi è identica a quella del caso 2', c3.diagnosi, c2.diagnosi);
  const c4 = runCase(S({ r:{ ...NEG, a_inf:'p' }, cli:CLIN_PIENA }));
  eq('4. solo avventizia, clinica piena → B', c4.classe, 'B');
  check('4. «senza arterite attiva», non «compatibile»', /senza arterite attiva/.test(c4.diagnosi) && !/compatibil/i.test(c4.referto), c4.diagnosi);
  const c5 = runCase(S({ r:{ m_inf:'a', i_fib:'p', a_neo:'p', m_fib:'p' }, iel:'f' }));
  eq('5. frammentazione + ispessimento + neovasi, senza infiltrato → C', c5.classe, 'C');
  const c6 = runCase(S({ r:{ ...NEG }, iel:'c', cli:CLIN_PIENA }));
  eq('6. istologia del tutto negativa, clinica piena → E', c6.classe, 'E');
  check('6. il referto non afferma compatibilità né GCA', !/compatibil|cellule giganti|GCA/i.test(rigaDiagnosi(c6.referto)), rigaDiagnosi(c6.referto));
});

// ══════════════════════════════════════════════════════════════════════════
section('la clinica è contesto: non cambia categoria né riga di diagnosi');
T('profili clinici su istologie campione', () => {
  const PROFILI = [{}, CLIN_PIENA, { eta:'35', cefalea:true, ves:'60', pcr:true },
                   { ...CLIN_PIENA, cortisone:true, giorniCortisone:'10' }, { cortisone:true }];
  const base = [ { m_inf:'p' }, { m_inf:'a', a_inf:'p' }, { ...NEG }, { m_inf:'a', m_fib:'p' }, {} ];
  for (const r of base) for (const iel of ['c','f',undefined]) {
    const rif = runCase(S({ r, iel }));
    for (const cli of PROFILI) {
      const x = runCase(S({ r, iel, cli }));
      if (x.classe !== rif.classe || x.diagnosi !== rif.diagnosi) { check('la clinica non cambia categoria', false, JSON.stringify({ r, iel, cli })); return; }
    }
  }
  pass++;
});
T('cortisone oltre 7 giorni: solo nota «come da notizie cliniche»', () => {
  const dieci = runCase(S({ r:{ ...NEG }, cli:{ cortisone:true, giorniCortisone:'10' } }));
  check('>7 gg: nota presente', /oltre 7 giorni dopo l.inizio del cortisone, come da notizie cliniche/.test(dieci.nota), dieci.nota);
  eq('>7 gg: la categoria non cambia', dieci.classe, 'E');
  const sette = runCase(S({ r:{ ...NEG }, cli:{ cortisone:true, giorniCortisone:'7' } }));
  check('7 gg: nessuna nota', !/cortisone/.test(sette.nota), sette.nota);
  const senzaGiorni = runCase(S({ r:{ ...NEG }, cli:{ cortisone:true } }));
  check('cortisone senza giorni: nessuna nota inventata', !/cortisone/.test(senzaGiorni.nota));
  check('cortisone senza giorni: criticità sulla durata', senzaGiorni.criticita.some(c => /durata/i.test(c)), senzaGiorni.criticita.join('|'));
  const non = runCase(S({ r:{ ...NEG } }));
  check('senza cortisone dichiarato: nessuna nota', !/cortisone/.test(non.nota));
});
T('età <50: avviso di DD, fuori dal referto', () => {
  const g = runCase(S({ r:{ m_inf:'p' }, cli:{ eta:'35' } }));
  check('avviso presente', g.avvisi.some(a => /50 anni/.test(a)), g.avvisi.join('|'));
  eq('categoria invariata', g.classe, 'A');
  check('l avviso non è nel referto', !g.avvisi.some(a => g.referto.includes(a)));
  check('nessun avviso a 72 anni', runCase(S({ r:{ m_inf:'p' }, cli:{ eta:'72' } })).avvisi.length === 0);
});

// ══════════════════════════════════════════════════════════════════════════
section('tre stati nel testo, confini e mutanti');
T('un campo non valutato non compare nel referto come presente o assente', () => {
  const nv = runCase(S({ adeq:{ lunghezza:'', livelli:'6', inToto:undefined, elastiche:undefined, livelliAggiuntivi:undefined }, r:{ m_inf:'a' } }));
  check('inToto non valutato: non scrive «in toto»', !/in toto/.test(nv.referto), nv.macro);
  check('elastiche non valutate: non scrive «colorazione per le elastiche»', !/colorazione per le elastiche/.test(nv.referto), nv.micro);
  check('livelli aggiuntivi non valutati: non li scrive', !/livelli aggiuntivi/.test(nv.referto), nv.micro);
  check('avventizia non valutata: non scrive «senza infiltrato»', !/Avventizia e periavventizia senza/.test(nv.referto), nv.micro);
  check('intima non valutata: non scrive «Intima senza»', !/Intima senza/.test(nv.referto), nv.micro);
  check('nessuna IHC spuntata: nessuna riga IHC', !/Immunoistochimica eseguita/.test(nv.referto));
  const parz = runCase(S({ r:{ m_inf:'a' }, ihc:{ cd4:true } }));
  check('una sola IHC: elenca solo quella', /Immunoistochimica eseguita: CD4\./.test(parz.referto), parz.referto);
});
T('classe C richiede elastica interrotta e fibrosi della media', () => {
  eq('fibrosi media senza elastica valutata: non C', runCase(S({ r:{ m_inf:'a', m_fib:'p' } })).classe === 'C', false);
  eq('fibrosi media con elastica conservata: non C', runCase(S({ r:{ m_inf:'a', m_fib:'p' }, iel:'c' })).classe === 'C', false);
  eq('B prima di D: intima fibrotica + avventizia infiammata → B', runCase(S({ r:{ m_inf:'a', i_fib:'p', a_inf:'p' } })).classe, 'B');
  eq('ispessimento fibroso avventiziale da solo non è D', runCase(S({ r:{ ...NEG, a_fib:'p' } })).classe, 'E');
});
T('rami non valutati e numeri non interi', () => {
  const nvRami = runCase(S({ r:{ ...NEG }, iel:'c' }));
  check('rami non valutati: criticità di classe provvisoria', nvRami.criticita.some(c => /classe provvisoria/.test(c) && /rami collaterali/.test(c)), nvRami.criticita.join('|'));
  check('rami valutati (assenti): nessuna criticità di provvisorietà', !runCase(S({ r:{ ...NEG }, iel:'c', rami:'a' })).criticita.some(c => /classe provvisoria/.test(c)));
  eq('livelli 5.9 non vengono troncati a 5', runCase(S({ adeq:{ livelli:'5.9' }, r:{ ...NEG } })).adeguatezza.livelli, null);
  check('livelli 5.9: nessuna frase «Esame su 5 livelli»', !/Esame su 5/.test(runCase(S({ adeq:{ livelli:'5.9' }, r:{ ...NEG } })).micro));
  check('cortisone 7.9 giorni: nota «oltre 7 giorni»', /oltre 7 giorni/.test(runCase(S({ r:{ ...NEG }, cli:{ cortisone:true, giorniCortisone:'7.9' } })).nota));
  check('cortisone 7 giorni esatti: nessuna nota', !/oltre 7/.test(runCase(S({ r:{ ...NEG }, cli:{ cortisone:true, giorniCortisone:'7' } })).nota));
});
T('amiloide solo con reperto e Congo', () => {
  check('Congo positivo senza materiale amorfo: niente amiloide', !/amiloide/.test(runCase(S({ r:{ ...NEG }, congo:'p' })).diagnosi));
});
T('età e cortisone: confini', () => {
  check('49 anni: avviso', runCase(S({ r:{ ...NEG }, cli:{ eta:'49' } })).avvisi.length === 1);
  check('50 anni: nessun avviso', runCase(S({ r:{ ...NEG }, cli:{ eta:'50' } })).avvisi.length === 0);
  check('età 0 o negativa: nessun avviso', runCase(S({ r:{ ...NEG }, cli:{ eta:'0' } })).avvisi.length === 0 && runCase(S({ r:{ ...NEG }, cli:{ eta:'-3' } })).avvisi.length === 0);
  check('cortisone «no» con giorni compilati: nessuna nota', !/cortisone/.test(runCase(S({ r:{ ...NEG }, cli:{ cortisone:false, giorniCortisone:'12' } })).nota));
  check('8 giorni: nota', /cortisone/.test(runCase(S({ r:{ ...NEG }, cli:{ cortisone:true, giorniCortisone:'8' } })).nota));
});
T('incompleto non è subordinato', () => {
  const r = runCase(S({ r:{ i_inf:'p' }, rf:{ vasculiteNecrotizzante:true } }));
  eq('incompleto con segnale d allarme', r.classe, 'incompleto');
  eq('non subordinato', r.subordinata, false);
});
T('reperti inseriti non spariscono dal testo', () => {
  check('epitelioidi con media non infiammata compaiono', /istiociti epitelioidi/.test(runCase(S({ r:{ m_inf:'a', m_epi:'p' } })).micro));
  const inc = runCase(S({ r:{ m_gig:'p', m_epi:'p' } }));
  check('giganti ed epitelioidi con media non valutata compaiono', /cellule giganti/.test(inc.micro) && /istiociti epitelioidi/.test(inc.micro), inc.micro);
  const dd = runCase(S({ r:{ ...NEG, m_nec:'p', m_eos:'p', g_gran:'p' }, iel:'c' }));
  eq('DD senza media infiammata: classe E', dd.classe, 'E');
  check('criticità: reperti di DD con media non infiammata', dd.criticita.some(c => /diagnosi differenziale presenti/.test(c) && /necrosi fibrinoide/.test(c)), dd.criticita.join('|'));
  check('e la criticità non è nel referto', !dd.referto.includes('Reperti di diagnosi differenziale presenti'));
});
T('valori impossibili', () => {
  const neg = runCase(S({ adeq:{ lunghezza:'-5', livelli:'-3' }, r:{ ...NEG } }));
  check('lunghezza negativa: placeholder, non «-5 mm»', !/-5/.test(neg.macro), neg.macro);
  check('livelli negativi: nessuna frase «Esame su»', !/Esame su -/.test(neg.micro), neg.micro);
  check('lunghezza decimale con la virgola', /12,5 mm/.test(runCase(S({ adeq:{ lunghezza:'12.5' }, r:{ ...NEG } })).macro));
  check('struttura assente: conformità non applicabile', runCase(S({ adeq:{ struttura:false } })).adeguatezza.conforme === null);
  const a = runCase(S({ adeq:{ livelli:'1' }, r:{ m_inf:'p' } }));
  check('in A la criticità sui livelli non parla di negatività', a.criticita.some(c => /Meno di 5 livelli/.test(c)) && !a.criticita.some(c => /negatività/.test(c)), a.criticita.join('|'));
});

// ══════════════════════════════════════════════════════════════════════════
section('adeguatezza e criticità (separate dal testo del referto)');
T('criteri di adeguatezza del consensus', () => {
  const ok = runCase(S({ adeq:{ livelli:'5', inToto:true, elastiche:true }, r:{ ...NEG } }));
  eq('5 livelli, in toto, elastiche → conforme', ok.adeguatezza.conforme, true);
  const poco = runCase(S({ adeq:{ livelli:'4' }, r:{ ...NEG } }));
  eq('4 livelli → non conforme', poco.adeguatezza.conforme, false);
  check('4 livelli: criticità', poco.criticita.some(c => /Meno di 5 livelli/.test(c)), poco.criticita.join('|'));
  eq('4 livelli: la categoria non cambia', poco.classe, 'E');
  const noEla = runCase(S({ adeq:{ elastiche:false }, r:{ ...NEG } }));
  check('elastiche non eseguite: criticità', noEla.criticita.some(c => /elastiche non eseguita/.test(c)), noEla.criticita.join('|'));
  const noToto = runCase(S({ adeq:{ inToto:false }, r:{ ...NEG } }));
  check('non in toto: criticità', noToto.criticita.some(c => /non è stato processato/.test(c)), noToto.criticita.join('|'));
  const nv = runCase(S({ adeq:{ livelli:'', inToto:undefined, elastiche:undefined }, r:{ ...NEG } }));
  eq('dati di adeguatezza non inseriti → conformità non determinata', nv.adeguatezza.conforme, null);
  check('e non diventano criticità «non conforme»', !nv.criticita.some(c => /Meno di 5 livelli|non eseguita|non è stato processato/.test(c)), nv.criticita.join('|'));
});
T('lunghezza: dato descritto, nessuna soglia', () => {
  const corto = runCase(S({ adeq:{ lunghezza:'5' }, r:{ ...NEG } }));
  check('5 mm: nel referto', /5 mm/.test(corto.referto));
  check('nessuna criticità sulla lunghezza', !corto.criticita.some(c => /mm/.test(c)), corto.criticita.join('|'));
  eq('la categoria non dipende dalla lunghezza', corto.classe, runCase(S({ adeq:{ lunghezza:'25' }, r:{ ...NEG } })).classe);
});
T('giganti senza media infiammata', () => {
  const g = runCase(S({ r:{ m_inf:'a', m_gig:'p' } }));
  check('giganti isolate → mai A', g.classe !== 'A', g.classe);
  check('criticità: non bastano per arterite attiva', g.criticita.some(c => /Cellule giganti senza infiammazione della media/.test(c)), g.criticita.join('|'));
});
T('IgG4 e plasmacellule', () => {
  const p = runCase(S({ r:{ m_inf:'p' }, igg4:'p' }));
  check('IgG4 positiva: chiede conta e rapporto', p.criticita.some(c => /conta IgG4\+\/HPF/.test(c) && /50/.test(c) && /40%/.test(c)), p.criticita.join('|'));
  const pla = runCase(S({ r:{ m_inf:'p', m_pla:'p' } }));
  check('plasmacellule senza IgG4: criticità', pla.criticita.some(c => /Plasmacellule senza IgG4/.test(c)), pla.criticita.join('|'));
});
T('campi non valutati: classe provvisoria', () => {
  const prov = runCase(S({ r:{ m_inf:'a' } }));
  eq('solo la media valutata (assente) → E', prov.classe, 'E');
  check('ma con criticità «classe provvisoria»', prov.criticita.some(c => /classe provvisoria/.test(c)), prov.criticita.join('|'));
  const completo = runCase(S({ r:{ ...NEG }, iel:'c', rami:'a' }));
  check('tutto valutato: nessuna criticità di provvisorietà', !completo.criticita.some(c => /classe provvisoria/.test(c)), completo.criticita.join('|'));
});

// ══════════════════════════════════════════════════════════════════════════
section('segnali d allarme: la categoria resta, è subordinata alla DD');
T('subordinazione', () => {
  const base = S({ r:{ m_inf:'p', m_gig:'p' }, cli:CLIN_PIENA });
  const senza = runCase(base);
  const con = runCase({ ...base, redFlags:{ ...base.redFlags, vasculiteNecrotizzante:true } });
  eq('senza segnali: A', senza.classe, 'A');
  eq('con segnale: la chiave non cambia', con.classe, 'A');
  eq('con segnale: la riga non cambia', con.diagnosi, senza.diagnosi);
  eq('è marcata subordinata', con.subordinata, true);
  check('la nota lo dice', /subordinata all.esclusione dei pattern morfologici alternativi/.test(con.nota), con.nota);
  check('i reperti inattesi compaiono nel referto', /REPERTI INATTESI/.test(con.referto));
  check('il referto subordinato non contiene «arterite a cellule giganti» nella riga di diagnosi', !/cellule giganti/i.test(rigaDiagnosi(con.referto)));
  const lin = runCase(S({ r:{ ...NEG }, rf:{ linfoidiAtipiche:true } }));
  check('linfoidi atipiche: citate e con IHC urgente', /linfoidi atipiche/.test(lin.referto) && /CD20/.test(lin.referto));
  const gr = runCase(S({ r:{ ...NEG }, rf:{ granulomiNecrotizzanti:true } }));
  check('granulomi necrotizzanti: citati', /necrosi centrale/.test(gr.referto));
  const inad = runCase(S({ adeq:{ struttura:false }, rf:{ vasculiteNecrotizzante:true } }));
  eq('inadeguato non viene subordinato', inad.subordinata, false);
});

// ══════════════════════════════════════════════════════════════════════════
section('IHC: supporto, mai criterio');
T('IHC non cambia la categoria e compare solo come eseguita', () => {
  const r0 = runCase(S({ r:{ m_inf:'a', a_inf:'p' } }));
  const r1 = runCase(S({ r:{ m_inf:'a', a_inf:'p' }, ihc:{ cd68:true, cd4:true, cd8:true, cd3:true, cd20:true } }));
  eq('IHC eseguita: stessa classe', r1.classe, r0.classe);
  eq('IHC eseguita: stessa riga', r1.diagnosi, r0.diagnosi);
  check('il referto elenca le IHC eseguite', /Immunoistochimica eseguita: CD68, CD4, CD8, CD3, CD20/.test(r1.referto));
  check('le raccomandazioni non usano numeri senza fonte', !r0.ihcRecs.some(x => />\s?2:1|2:1/.test(x.reason)));
  check('nessuna raccomandazione dichiara un criterio diagnostico', r0.ihcRecs.every(x => !/è criterio diagnostico|diagnostico per/.test(x.reason)));
  check('ogni raccomandazione è un oggetto con marker, priorità e motivo', r0.ihcRecs.length > 0 && r0.ihcRecs.every(x => x.marker && x.priority && x.reason));
});

// ══════════════════════════════════════════════════════════════════════════
section('referto: struttura, terminologia, criticità fuori');
T('struttura', () => {
  const r = runCase(S({ r:{ m_inf:'p', m_gig:'p' }, ihc:{ cd68:true } }));
  ['Macroscopia:', 'Microscopia:', 'Diagnosi:', 'Nota:'].forEach(s => check(`il referto contiene "${s}"`, r.referto.includes(s)));
  check('non contiene più il blocco LIMITI', !/LIMITI INTERPRETATIVI/.test(r.referto));
  check('non contiene punteggi', !/\d+\s?\/\s?(81|100)|\bpt\b|punti/i.test(r.referto));
  check('la microscopia descrive i giganti', /cellule giganti/.test(r.micro), r.micro);
  const macro = runCase(S({ adeq:{ lunghezza:'14' }, r:{ ...NEG } }));
  check('la macroscopia riporta la lunghezza e l inclusione in toto', /14 mm/.test(macro.macro) && /in toto/.test(macro.macro), macro.macro);
});
T('terminologia vietata (campioni mirati)', () => {
  const casi = [S({ r:{ m_inf:'p', m_gig:'p', m_eos:'p', g_gran:'p' }, cli:{ eta:'35', cortisone:true, giorniCortisone:'12' } }),
                S({ r:{ ...NEG } }), S({ r:{ m_inf:'a', m_fib:'p' }, iel:'f' }),
                S({ r:{ ...NEG }, rf:{ linfoidiAtipiche:true, granulomiNecrotizzanti:true, vasculiteNecrotizzante:true } }),
                S({ r:{ m_inf:'p' }, rf:{ vasculiteNecrotizzante:true } }), S({ adeq:{ struttura:false } }), S({})];
  for (const st of casi) {
    const r = runCase(st);
    check(`nessun termine vietato (${r.classe})`, !FORBIDDEN.test(r.referto), (r.referto.match(FORBIDDEN) || [''])[0]);
    check(`la riga di diagnosi non nomina l arterite a cellule giganti (${r.classe})`, !/arterite a cellule giganti|GCA/i.test(rigaDiagnosi(r.referto)));
  }
});
T('nessuna raccomandazione clinica nel referto', () => {
  for (const st of [S({ r:{ ...NEG }, cli:CLIN_PIENA }), S({ r:{ m_inf:'p' } }), S({ adeq:{ struttura:false } }), S({ r:{ m_inf:'a', a_inf:'p' } })]) {
    const r = runCase(st);
    check(`nessuna raccomandazione clinica (${r.classe})`, !/eco-?Doppler|\bPET\b|biopsia controlaterale|nuovo prelievo/i.test(r.referto));
  }
});

// ══════════════════════════════════════════════════════════════════════════
section('esplorazione esaustiva');
T('esplorazione esaustiva', () => {
  const tri = [undefined, 'a', 'p'];
  const dims = ['m_inf','m_gig','m_epi','m_nec','m_fib','i_fib','i_inf','a_inf','a_vv','a_fib'];
  const ielV = ['c','f',undefined], ramiV = [undefined,'a','n','i'], strV = [true,false,undefined];
  const CLIN = [{}, CLIN_PIENA, { eta:'35', cefalea:true, ves:'60' }, { ...CLIN_PIENA, cortisone:true, giorniCortisone:'12' }];
  const chiavi = new Set();
  let casi = 0, cli = 0, cliniciCambiano = 0, nessunReperto = 0, mediaMancata = 0, giganteA = 0, vietati = 0, critNelReferto = 0,
      senzaConclusione = 0, ihcCambia = 0, mancaDiagnosi = 0;
  // Oracolo indipendente: la regola del §4 del piano riscritta qui, senza riusare il motore.
  const oracolo = (r, iel, rami, str) => {
    if (str === false) return 'inadeguato';
    if (r.m_inf === 'p' || rami === 'i') return 'A';
    if (r.m_inf !== 'a') return 'incompleto';
    if (iel === 'f' && r.m_fib === 'p') return 'C';
    if (r.a_inf === 'p' || r.a_vv === 'p' || r.i_inf === 'p') return 'B';
    if (r.i_fib === 'p') return 'D';
    return 'E';
  };
  let divergeOracolo = 0, prima = 0, recoCliniche = 0, recoRegex = 0, cifre = 0;
  const RECO = /Doppler|\bPET|ecograf|controlaterale|prelievo|raccomand|consigli|si suggeris/i;
  let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
  const N = Math.pow(3, dims.length);
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const r = {}; let x = i; for (const d of dims) { r[d] = tri[x % 3]; x = Math.floor(x / 3); }
    for (const iel of ielV) for (const rami of ramiV) for (const str of strV) {
      // la parte pesante (referto completo) gira sullo stato senza altre variabili; il resto su classify
      const st = S({ r, iel, rami, adeq:{ struttura:str } });
      const k = classify(st); casi++;
      chiavi.add(k.classe);
      if (k.classe !== oracolo(r, iel, rami, str)) divergeOracolo++;
      for (const prof of CLIN) {   // tutti i profili clinici su tutto lo spazio morfologico
        const y = classify(S({ r, iel, rami, adeq:{ struttura:str }, cli:prof }));
        if (y.classe !== k.classe || y.diagnosi !== k.diagnosi) cliniciCambiano++;
      }
      if (CONCLUSIONI[k.classe] === undefined) senzaConclusione++;
      const mediaInfiammata = r.m_inf === 'p' || rami === 'i';
      if (str === false) { if (k.classe !== 'inadeguato') mediaMancata++; }
      else {
        if (mediaInfiammata && k.classe !== 'A') mediaMancata++;
        if (!mediaInfiammata && k.classe === 'A') mediaMancata++;
        if (r.m_gig === 'p' && !mediaInfiammata && k.classe === 'A') giganteA++;
        if (!RKEYS.some(c => r[c] === 'p') && rami !== 'i' && k.classe === 'A') nessunReperto++;
      }
      if ((i + iel_idx(iel) + rami_idx(rami)) % 23 === 0 || i === N - 1) {   // campione del referto completo
        // variazione deterministica delle variabili non esplorate: DD, calcificazioni, IgG4, Congo, segnali, adeguatezza
        const extra = { ...r };
        ['m_eos','m_pla','g_gran','g_neu','g_amy','g_tra','a_neo'].forEach(kk => { extra[kk] = tri[rnd(3)]; });
        const st2 = S({ r:extra, iel, rami, adeq:{ struttura:str, livelli:['', '3', '6'][rnd(3)], inToto:tri[rnd(3)] === 'p' ? true : [undefined, false][rnd(2)], elastiche:[undefined, true, false][rnd(3)], livelliAggiuntivi:[undefined, true, false][rnd(3)] },
          calc:[undefined,'a','i','m','b'][rnd(5)], congo:[undefined,'n','p','x'][rnd(4)], igg4:[undefined,'n','p','x'][rnd(4)],
          rf:{ linfoidiAtipiche:rnd(4) === 0, granulomiNecrotizzanti:rnd(4) === 0, vasculiteNecrotizzante:rnd(4) === 0 },
          cli:{ eta:['', '35', '50', '72'][rnd(4)], cortisone:[undefined, true, false][rnd(3)], giorniCortisone:['', '3', '10'][rnd(3)] } });
        const out = runCase(st2); cli++;
        const out0 = runCase(st);
        if (RECO.test(out.referto)) recoRegex++;
        if (!/IgG4/.test(out.referto) && /%/.test(out.referto)) cifre++;
        if (JSON.stringify(out.ihcRecs) !== JSON.stringify(runCase({ ...st2, clinica:{ eta:'', cortisone:undefined, giorniCortisone:'' } }).ihcRecs)) recoCliniche++;
        if (out.classe !== classify(st2).classe || out0.classe !== k.classe) prima++;
        if (FORBIDDEN.test(out.referto) || /arterite a cellule giganti|GCA/i.test(rigaDiagnosi(out.referto))) vietati++;
        if (out.criticita.some(c => out.referto.includes(c.slice(0, 40)))) critNelReferto++;
        if (!rigaDiagnosi(out.referto)) mancaDiagnosi++;
        if (!RKEYS.some(c => extra[c] === 'p') && rami !== 'i' && /compatibil/i.test(out.referto)) nessunReperto++;
        const z = classify(S({ r, iel, rami, adeq:{ struttura:str }, ihc:{ cd68:true, cd4:true, cd8:true, cd3:true, cd20:true } }));
        if (z.classe !== k.classe) ihcCambia++;
      }
    }
  }
  console.log(`  (${casi} combinazioni di reperti, ${cli} con referto completo e profili clinici, ${Date.now() - t0} ms, ${chiavi.size} chiavi)`);
  eq('1. stessa istologia × tutti i profili clinici → stessa categoria e stessa riga', cliniciCambiano, 0);
  eq('2. nessun reperto istologico → mai A, mai «compatibile»', nessunReperto, 0);
  eq('3-4. A se e solo se la media è infiammata (asse o ramo); inadeguato solo con struttura assente', mediaMancata, 0);
  eq('4. giganti senza media infiammata → mai A', giganteA, 0);
  eq('5. ogni chiave raggiungibile ha una conclusione', senzaConclusione, 0);
  check('5. la mappa CONCLUSIONI non ha voci morte', Object.keys(CONCLUSIONI).every(k => chiavi.has(k)) && [...chiavi].every(k => k in CONCLUSIONI),
    `mappa: ${Object.keys(CONCLUSIONI)} / viste: ${[...chiavi]}`);
  eq('le classi raggiungibili sono A-E, inadeguato, incompleto', [...chiavi].sort().join(','), 'A,B,C,D,E,inadeguato,incompleto');
  eq('6. nessun termine vietato nel referto, nessuna «GCA» nella riga di diagnosi', vietati, 0);
  eq('7. le criticità non compaiono nel testo del referto', critNelReferto, 0);
  eq('ogni referto ha una riga di diagnosi', mancaDiagnosi, 0);
  eq('IHC eseguita: mai un effetto sulla categoria', ihcCambia, 0);
  eq('la classificazione coincide con la regola del §4 su tutto lo spazio esplorato', divergeOracolo, 0);
  eq('nessuna raccomandazione clinica nel referto (campione ampio, variabili non esplorate incluse)', recoRegex, 0);
  eq('nessuna percentuale nel referto fuori dal blocco IgG4', cifre, 0);
  eq('la clinica non cambia nemmeno i suggerimenti IHC', recoCliniche, 0);
  eq('la classificazione non dipende dalle variabili non esplorate', prima, 0);
});
function iel_idx(v) { return v === 'c' ? 0 : v === 'f' ? 1 : 2; }
function rami_idx(v) { return v === undefined ? 0 : v === 'a' ? 1 : v === 'n' ? 2 : 3; }

// ══════════════════════════════════════════════════════════════════════════
section('purezza e invarianti di progetto');
T('purezza', () => {
  const st = S({ r:{ m_inf:'p', m_gig:'p' }, cli:CLIN_PIENA });
  const snap = JSON.stringify(st);
  runCase(st);
  eq('runCase non muta lo stato in ingresso', JSON.stringify(st), snap);

  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const eng  = fs.readFileSync(new URL('../engine.js',  import.meta.url), 'utf8');
  const pkg  = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  // Le invarianti "non deve piu' esserci" guardano il CODICE: i commenti citano di
  // proposito il comportamento vecchio per spiegare perche' e' stato cambiato.
  const senzaCommenti = t => t.replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const htmlCod = senzaCommenti(html), engCod = senzaCommenti(eng);

  eq('versione 4.0.0', pkg.version, '4.0.0');
  check('index.html carica engine.js', /<script src="\.\/engine\.js/.test(html));
  eq('versione allineata a package.json', html.includes(`engine.js?v=${pkg.version}`), true);
  check('versione mostrata in pagina', html.includes(`v${pkg.version} —`), pkg.version);
  check('il motore non tocca il DOM', !/document\.|getElementById|querySelector|window\.|useState/.test(engCod));
  check('il motore non contiene JSX', !/<[A-Z]\w+[ /]/.test(engCod));
  ['const classify', 'const generateReferto', 'function classify', 'function generateReferto', 'getIhcRecommendations'].forEach(f =>
    check(`${f} non è duplicata in index.html`, !htmlCod.includes(f)));
  check('la pagina passa dalla stessa funzione dei test', /const R\s*=\s*runCase\(st\)/.test(html));

  const iconeMotore = [...new Set([...eng.matchAll(/icon:\s*'(\w+)'/g)].map(m => m[1]))];
  const iconePagina = [...new Set([...html.matchAll(/^\s{8}(\w+):\s*<\w+ className/gm)].map(m => m[1]))];
  check('il motore emette almeno tre icone', iconeMotore.length >= 3, iconeMotore.join(','));
  iconeMotore.forEach(i => check(`la pagina sa disegnare l icona "${i}"`, iconePagina.includes(i), `pagina: ${iconePagina.join(',')}`));

  // niente più punteggi, composito, modalità clinica, cifre senza fonte
  ['compositeScore', 'histoScore', 'HISTO_MAX', 'calculateScore', 'getDiagnosis', 'suggestClinicalMode', 'clinicalMode', 'getWeights'].forEach(w => {
    check(`il motore non contiene più ${w}`, !engCod.includes(w));
    check(`la pagina non contiene più ${w}`, !htmlCod.includes(w));
  });
  check('nessuna cifra senza fonte (skip lesion, varianti, 7–14 gg)',
    !/10\s?[–-]\s?15\s?%|20\s?[–-]\s?30\s?%|7\s?[–-]\s?14\s?gg|3\s?[–-]\s?5\s?gg/.test(engCod + htmlCod));
  check('il motore non contiene termini vietati nei testi', !/Horton|arterite temporale|arterite atipica/i.test(engCod));
  check('il pannello clinico dichiara di non entrare nella diagnosi', /non entra nella diagnosi/.test(html));
  check('la pagina cita il consensus', /Nair/.test(html) && /107574/.test(html));
  check('nessun nuovo URL esterno caricato (script/link/@import)',
    !/<script[^>]+src="https?:/.test(html) && !/<link[^>]+href="https?:/.test(html) && !/@import\s+url\(\s*['"]?https?:/.test(html));
});

console.log(`\n${fail === 0 ? 'OK' : 'FALLITO'} — ${pass} pass, ${fail} fail`);
if (failures.length) { console.log('\nFallimenti:'); failures.slice(0, 80).forEach(f => console.log('  ✗ ' + f)); if (failures.length > 80) console.log(`  … e altri ${failures.length - 80}`); }
process.exit(fail === 0 ? 0 : 1);
