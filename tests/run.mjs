// Runner dei test del motore — nessun framework.
// Esecuzione:  node tests/run.mjs   (oppure: npm test)   Exit code 0 = tutto verde.
//
// Perche' esiste: fino alla v3.6.1 la conclusione del referto veniva scelta con
// `categoria.includes('DIAGNOSTICA')`, vero anche per 'ISTOLOGIA NON DIAGNOSTICA'.
// Due categorie su dieci producevano un referto copiabile che diceva
// "il quadro istologico e' diagnostico per GCA" mentre il cartello a schermo diceva
// il contrario. Con la logica dentro un componente React di 1400 righe non c'era
// modo di accorgersene se non caso per caso, a mano.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const E = require('../engine.js');
const { runCase, makeEngine, suggestClinicalMode, subordinaRedFlag,
        CONCLUSIONI, HISTO_POINTS, HISTO_MAX, CLINICAL_MAX } = E;

let pass = 0, fail = 0; const failures = [];
const check = (n, c, d = '') => c ? pass++ : (fail++, failures.push(n + (d ? ` — ${d}` : '')));
const eq = (n, a, b) => check(n, a === b, `atteso ${JSON.stringify(b)}, ottenuto ${JSON.stringify(a)}`);
const section = t => console.log(`\n• ${t}`);

const MAJ = ['giantCells','granulomatous','elasticFragmentation','transmuralInflammation'];
const MIN = ['lymphocyticInfiltrate','intimalThickening','adventitialInflammation','neovascularization','focalElasticFragmentation','eosinophils'];
const zero = ks => Object.fromEntries(ks.map(k => [k, false]));
const S = (o = {}) => ({
  sampleAdequacy: { length:'8', arterialStructure:true, sections:'8', elasticStain:true, ...(o.sa||{}) },
  majorFindings:  { ...zero(MAJ), ...(o.maj||{}) },
  minorFindings:  { ...zero(MIN), ...(o.min||{}) },
  clinicalData:   { age:'', newHeadache:false, jawClaudication:false, visualSymptoms:false,
                    esr:'', crp:false, haloSign:false, onSteroids:false, steroidDays:'', ...(o.cli||{}) },
  ihcMarkers:     { cd68:false, cd4:false, cd8:false, cd3:false, cd20:false, ...(o.ihc||{}) },
  redFlags:       { atypicalLymphoid:false, necrotizingGranulomas:false, necrotizingVasculitis:false, ...(o.rf||{}) },
  clinicalMode:   o.mode || 'full',
});
const GCA_PIENA  = { giantCells:true, granulomatous:true, transmuralInflammation:true, elasticFragmentation:true };
const CLIN_PIENA = { age:'72', newHeadache:true, jawClaudication:true, esr:'90', crp:true, haloSign:true };
const conclusioneDi = r => (r.referto.match(/CONCLUSIONE:\n(.*)/) || [, ''])[1];
const DICE_DIAGNOSTICO = /è diagnostico per arterite a cellule giganti/;

// ══════════════════════════════════════════════════════════════════════════
section('la conclusione del referto non contraddice la categoria');
{
  // Il difetto: 'ISTOLOGIA NON DIAGNOSTICA — CLINICA SUGGESTIVA'.includes('DIAGNOSTICA')
  eq("la vecchia condizione era vera anche per 'NON DIAGNOSTICA'",
    'ISTOLOGIA NON DIAGNOSTICA — CLINICA SUGGESTIVA'.includes('DIAGNOSTICA'), true);

  const casiStorici = [
    ['istologia muta, clinica completa',        S({ cli:CLIN_PIENA })],
    ['solo core, solo istologia',               S({ mode:'none', maj:{giantCells:true,granulomatous:true} })],
    ['tre minori, clinica completa',            S({ min:{lymphocyticInfiltrate:true,intimalThickening:true,adventitialInflammation:true}, cli:CLIN_PIENA })],
    ['GCA piena, 35 anni',                      S({ maj:GCA_PIENA, cli:{age:'35',newHeadache:true,esr:'60',crp:true} })],
    ['eosinofili + un minore, clinica completa',S({ min:{eosinophils:true,lymphocyticInfiltrate:true}, cli:CLIN_PIENA })],
  ];
  for (const [nome, st] of casiStorici) {
    const r = runCase(st);
    check(`${nome}: categoria "non diagnostica" → il referto non dice "è diagnostico"`,
      !(/NON DIAGNOSTICA/.test(r.diagnosis.category) && DICE_DIAGNOSTICO.test(conclusioneDi(r))),
      `${r.diagnosis.category} → «${conclusioneDi(r).slice(0,60)}…»`);
  }
}

section('esplorazione esaustiva: nessuna categoria senza conclusione, nessuna contraddizione');
{
  const chiaviViste = new Set(), categorieViste = new Set();
  let contraddizioni = 0, senzaConclusione = 0, casi = 0;
  const CLINICI = [{}, {age:'72',newHeadache:true}, CLIN_PIENA, {age:'35',newHeadache:true,esr:'60',crp:true}];
  for (let m = 0; m < 16; m++) {
    const maj = Object.fromEntries(MAJ.map((k, i) => [k, !!(m & (1 << i))]));
    for (let n = 0; n < 64; n += 1) {
      const min = Object.fromEntries(MIN.map((k, i) => [k, !!(n & (1 << i))]));
      for (const mode of ['none','partial','full']) {
        for (const cli of CLINICI) {
          const r = runCase(S({ maj, min, cli, mode })); casi++;
          const k = r.diagnosis.key, cat = r.diagnosis.category || '';
          chiaviViste.add(k); categorieViste.add(cat.replace(' — SUBORDINATA A DD ALTERNATIVA',''));
          if (CONCLUSIONI[k] === undefined) senzaConclusione++;
          const c = conclusioneDi(r);
          if (/NON DIAGNOSTICA|COMPATIBILE|BASSA CONCORDANZA|NEGATIVA|ASPECIFICA/.test(cat) && DICE_DIAGNOSTICO.test(c)) {
            contraddizioni++;
            if (contraddizioni === 1) failures.push(`  primo controesempio: ${cat} → «${c.slice(0,70)}»`);
          }
        }
      }
    }
  }
  console.log(`  (${casi} combinazioni percorse, ${chiaviViste.size} chiavi, ${categorieViste.size} categorie)`);
  eq('nessuna categoria produce un referto che si contraddice', contraddizioni, 0);
  eq('ogni chiave raggiungibile ha una conclusione', senzaConclusione, 0);
  check('la mappa CONCLUSIONI non ha voci morte',
    Object.keys(CONCLUSIONI).every(k => chiaviViste.has(k) || ['inadeguato','inconsistente'].includes(k)),
    Object.keys(CONCLUSIONI).filter(k => !chiaviViste.has(k) && !['inadeguato','inconsistente'].includes(k)).join(','));
  check('le categorie raggiungibili sono quelle attese', categorieViste.size >= 8, [...categorieViste].join(' | '));
}

section('il composito dichiara la propria scala');
{
  // HISTO_MAX non e' 100: le due voci di frammentazione descrivono la stessa lamina
  let massimo = 0;
  for (let m = 0; m < 16; m++) for (let n = 0; n < 64; n++) {
    const maj = Object.fromEntries(MAJ.map((k,i)=>[k,!!(m&(1<<i))]));
    const min = Object.fromEntries(MIN.map((k,i)=>[k,!!(n&(1<<i))]));
    const s = runCase(S({maj,min,mode:'none'})).scores;
    if (s.histoScore > massimo) massimo = s.histoScore;
  }
  eq('HISTO_MAX coincide col massimo davvero raggiungibile', massimo, HISTO_MAX);
  eq('e vale 81, non 100', HISTO_MAX, 81);
  eq('somma dichiarata dei punti maggiori',
    HISTO_POINTS.giantCells + HISTO_POINTS.granulomatousConCG +
    HISTO_POINTS.elasticFragmentation + HISTO_POINTS.transmuralInflammation, 61);

  const max = mode => runCase(S({mode})).scores.compositeMax;
  eq('massimo del composito, solo istologia', max('none'), 81);
  eq('massimo del composito, dati parziali',  max('partial'), Math.round(81*0.8 + 100*0.2));
  eq('massimo del composito, dati completi',  max('full'),    Math.round(81*0.6 + 100*0.4));
  check('anche il campione inadeguato dichiara la scala',
    runCase(S({sa:{arterialStructure:false}})).scores.compositeMax > 0);

  // la soglia diagnostica in modalita' 'full' e' fuori portata per la sola morfologia
  const soloMorfo = runCase(S({ maj:GCA_PIENA, min:Object.fromEntries(MIN.map(k=>[k,true])) })).scores;
  check('in modalità "dati completi" la sola morfologia non arriva a 70',
    Math.round(HISTO_MAX * 0.6) < 70, String(Math.round(HISTO_MAX * 0.6)));
}

section('una casella non spuntata non è una risposta negativa');
{
  eq('nessun dato clinico → solo istologia', suggestClinicalMode({}), 'none');
  eq('un solo dato → parziale', suggestClinicalMode({ newHeadache:true }), 'partial');
  eq('tre dati → completi', suggestClinicalMode({ age:'72', newHeadache:true, crp:true }), 'full');
  eq('età inserita conta', suggestClinicalMode({ age:'72' }), 'partial');
  eq('VES inserita conta', suggestClinicalMode({ esr:'60' }), 'partial');
  eq('stringhe vuote non contano', suggestClinicalMode({ age:'', esr:'' }), 'none');
  eq('clinicalData assente non esplode', suggestClinicalMode(undefined), 'none');

  // il caso che nella 3.6.1 declassava una GCA da manuale
  const st = S({ maj:GCA_PIENA });
  const conModoAutomatico = runCase({ ...st, clinicalMode: suggestClinicalMode(st.clinicalData) });
  eq('GCA piena senza dati clinici → categoria diagnostica', conModoAutomatico.diagnosis.key, 'diagnostica');
  const conVecchioDefault = runCase({ ...st, clinicalMode:'full' });
  eq('col vecchio default usciva bassa concordanza', conVecchioDefault.diagnosis.key, 'bassa_concordanza');
}

section('reperti inattesi: la categoria viene subordinata, non cancellata');
{
  const base = S({ maj:GCA_PIENA, cli:CLIN_PIENA });
  const senza = runCase(base);
  const con   = runCase({ ...base, redFlags:{ ...base.redFlags, necrotizingVasculitis:true } });
  eq('senza red flag la categoria è diagnostica', senza.diagnosis.key, 'diagnostica');
  eq('con red flag la chiave non cambia', con.diagnosis.key, 'diagnostica');
  check('ma l etichetta dichiara la subordinazione', /SUBORDINATA A DD ALTERNATIVA/.test(con.diagnosis.category), con.diagnosis.category);
  eq('ed è marcata', con.diagnosis.redFlag, true);
  check('la raccomandazione nomina i pattern alternativi', /pattern identificati/.test(con.diagnosis.recommendation));
  check('il referto mette la GCA in subordine', /diagnosi secondaria subordinata/.test(con.referto));
  check('e i reperti inattesi compaiono nel referto', /REPERTI INATTESI/.test(con.referto));
  // un campione non refertabile non viene "subordinato": resta non refertabile
  const inad = runCase(S({ sa:{arterialStructure:false}, rf:{necrotizingVasculitis:true} }));
  eq('il campione inadeguato resta bloccato', inad.diagnosis.blocked, 'inadequate');
  check('e non riceve l etichetta di subordinazione', !/SUBORDINATA/.test(inad.diagnosis.category || ''));
}

section('incoerenze dure: raggiungibili e non doppiamente contate');
{
  // Diffusa (>30%) e focale (<30%) descrivono la stessa lamina.
  const doppia = runCase(S({ maj:{elasticFragmentation:true, transmuralInflammation:true}, min:{focalElasticFragmentation:true} }));
  eq('è un incoerenza bloccante', doppia.hardInconsistency, true);
  eq('e la categoria lo dice', doppia.diagnosis.key, 'inconsistente');
  check('il referto lo dice', /incoerenze logiche/.test(doppia.referto));
  const singola = runCase(S({ maj:{elasticFragmentation:true, transmuralInflammation:true} }));
  eq('i punti della lamina non sono contati due volte', doppia.scores.histoScore, singola.scores.histoScore);

  // I warning che implicano l inadeguatezza non devono attivare il ramo "inconsistente":
  // getDiagnosis esce prima con blocked:'inadequate', ed era quello a renderlo codice morto.
  const inad = runCase(S({ sa:{arterialStructure:false}, maj:{giantCells:true, transmuralInflammation:true} }));
  eq('campione senza struttura arteriosa → inadeguato, non incoerente', inad.diagnosis.blocked, 'inadequate');
  eq('e non alza la bandiera di incoerenza', inad.hardInconsistency, false);
  check('i warning restano di livello error', inad.validationWarnings.some(w => w.level === 'error'));
  check('ma sono marcati come derivati dall inadeguatezza',
    inad.validationWarnings.filter(w => w.level === 'error').every(w => w.daInadeguatezza === true));
}

section('frammentazione elastica isolata');
{
  const conVVG  = runCase(S({ sa:{elasticStain:true},  maj:{elasticFragmentation:true} }));
  const senzaVVG= runCase(S({ sa:{elasticStain:false}, maj:{elasticFragmentation:true} }));
  eq('senza infiammazione attiva vale 3 punti', conVVG.scores.histoScore, 3);
  eq('e vale 3 anche senza VVG', senzaVVG.scores.histoScore, 3);
  const riserva = r => r.validationWarnings.some(w => /contributo ridotto con riserva/.test(w.text));
  check('la riserva è dichiarata con VVG', riserva(conVVG));
  // v3.7.0: l avviso era condizionato a elasticStain, ma il declassamento avviene comunque
  check('la riserva è dichiarata anche senza VVG', riserva(senzaVVG));
  const conInfiamm = runCase(S({ maj:{elasticFragmentation:true, granulomatous:true} }));
  eq('con infiammazione attiva torna criterio maggiore da 15',
    conInfiamm.scores.histoScore - runCase(S({ maj:{granulomatous:true} })).scores.histoScore, 15);
}

section('adeguatezza');
{
  eq('struttura arteriosa assente → non refertabile', runCase(S({sa:{arterialStructure:false}})).scores.adequacyLevel, 'inadequate');
  eq('dimensioni non inserite → sconosciuta', runCase(S({sa:{length:'',sections:''}})).scores.adequacyLevel, 'unknown');
  eq('3 mm / 4 sezioni → subottimale', runCase(S({sa:{length:'3',sections:'4'}})).scores.adequacyLevel, 'suboptimal');
  eq('8 mm / 8 sezioni → subottimale (<10 mm)', runCase(S({sa:{length:'8',sections:'8'}})).scores.adequacyLevel, 'suboptimal');
  eq('12 mm / 5 sezioni → subottimale (<6 sezioni)', runCase(S({sa:{length:'12',sections:'5'}})).scores.adequacyLevel, 'suboptimal');
  eq('10 mm / 6 sezioni → adeguata', runCase(S({sa:{length:'10',sections:'6'}})).scores.adequacyLevel, 'adequate');
  // scelta esplicita: la mancata registrazione delle dimensioni e' una lacuna di
  // documentazione, non morfologica, e non declassa la diagnosi. Lo dice il referto.
  const senzaMisure = runCase(S({ sa:{length:'',sections:''}, maj:GCA_PIENA, cli:CLIN_PIENA }));
  eq('un quadro diagnostico resta diagnostico senza le misure', senzaMisure.diagnosis.key, 'diagnostica');
  check('ma il referto dichiara la lacuna', /Dimensioni campione non specificate/.test(senzaMisure.referto));
  check('e la categoria pure', /Dimensioni campione non inserite/.test(senzaMisure.diagnosis.recommendation));
}

section('referto: struttura e coerenza interna');
{
  const r = runCase(S({ maj:GCA_PIENA, cli:CLIN_PIENA, ihc:{cd68:true} }));
  ['ARTERIA TEMPORALE — BIOPSIA','ADEGUATEZZA DEL CAMPIONE:','REPERTI ISTOLOGICI:',
   'CONCLUSIONE:','LIMITI INTERPRETATIVI:'].forEach(s =>
    check(`il referto contiene "${s}"`, r.referto.includes(s)));
  check('elenca l IHC eseguita', /IMMUNOISTOCHIMICA ESEGUITA: CD68/.test(r.referto));
  const neg = runCase(S({}));
  check('il referto negativo ricorda le skip lesion', /skip lesion/.test(neg.referto));
  check('e che la negatività non esclude la diagnosi', /non esclude la diagnosi clinica/.test(neg.referto));
  const ster = runCase(S({ maj:GCA_PIENA, cli:{...CLIN_PIENA, onSteroids:true, steroidDays:'20'} }));
  check('la nota steroidea riporta i giorni', /da 20 giorno\/i/.test(ster.referto));
}

section('purezza e invarianti di progetto');
{
  const st = S({ maj:GCA_PIENA, cli:CLIN_PIENA });
  const snap = JSON.stringify(st);
  runCase(st);
  eq('runCase non muta lo stato in ingresso', JSON.stringify(st), snap);

  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const eng  = fs.readFileSync(new URL('../engine.js',  import.meta.url), 'utf8');
  const pkg  = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  // Le invarianti "non deve piu' esserci" guardano il CODICE: i commenti citano di
  // proposito il comportamento vecchio per spiegare perche' e' stato cambiato.
  const senzaCommenti = t => t.replace(/^\s*\/\/.*$/gm, '');
  const htmlCod = senzaCommenti(html), engCod = senzaCommenti(eng);

  check('index.html carica engine.js', /<script src="\.\/engine\.js/.test(html));
  eq('versione allineata a package.json', html.includes(`engine.js?v=${pkg.version}`), true);
  check('versione mostrata in pagina', html.includes(`v${pkg.version} —`), pkg.version);
  check('il motore non tocca il DOM',
    !/document\.|getElementById|querySelector|window\.|useState/.test(engCod));
  check('il motore non contiene JSX', !/<[A-Z]\w+[ /]/.test(engCod));

  // il motore non deve essere anche dentro la pagina
  ['const calculateScore','const getDiagnosis','const generateReferto',
   'const getValidationWarnings','const getIhcRecommendations'].forEach(f =>
    check(`${f} non è duplicata in index.html`, !htmlCod.includes(f)));
  check('la pagina passa dalla stessa funzione dei test', /const R\s*=\s*runCase\(st\)/.test(html));

  // ogni icona che il motore può emettere deve avere un componente in pagina
  const iconeMotore = [...new Set([...eng.matchAll(/icon:\s*'(\w+)'/g)].map(m => m[1]))];
  const iconePagina = [...new Set([...html.matchAll(/^\s{8}(\w+):\s*<\w+ className/gm)].map(m => m[1]))];
  check('il motore emette almeno quattro icone', iconeMotore.length >= 4, iconeMotore.join(','));
  iconeMotore.forEach(i => check(`la pagina sa disegnare l icona "${i}"`, iconePagina.includes(i),
    `pagina: ${iconePagina.join(',')}`));

  // la modalità clinica non deve tornare a partire da 'full'
  check("clinicalMode non è più inizializzata a 'full'", !/useState\('full'\)/.test(htmlCod));
  check('la pagina usa suggestClinicalMode', /suggestClinicalMode\(clinicalData\)/.test(html));

  // il composito non deve più essere stampato su /100 fisso
  check('il composito non è più stampato su /100', !/\$\{scores\.compositeScore\}\/100/.test(htmlCod));
  check('il composito è stampato sul proprio massimo', /scores\.compositeMax/.test(html));

  // la conclusione non deve tornare a essere scelta per sottostringa
  check("nessun includes('DIAGNOSTICA') nel motore", !/includes\('DIAGNOSTICA'\)/.test(engCod));
  check('la conclusione è scelta per chiave', /CONCLUSIONI\[diag\.key\]/.test(eng));
}

console.log(`\n${fail === 0 ? 'OK' : 'FALLITO'} — ${pass} pass, ${fail} fail`);
if (failures.length) { console.log('\nFallimenti:'); failures.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail === 0 ? 0 : 1);
