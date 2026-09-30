// Specifica eseguibile della proposta PROPOSTA_asse_morfologico.md — NON fa parte di `npm test`.
// Esecuzione:  node tests/proposta_scvp.mjs
// Finché il motore non espone `runCase(...).morph` ogni caso risulta «non implementato».
// Quando la proposta viene implementata: spostare i casi in tests/run.mjs e cancellare questo file.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { runCase } = require('../engine.js');

const MAJ = ['giantCells','granulomatous','elasticFragmentation','transmuralInflammation'];
const MIN = ['lymphocyticInfiltrate','intimalThickening','adventitialInflammation','neovascularization','focalElasticFragmentation','eosinophils'];
const zero = ks => Object.fromEntries(ks.map(k => [k, false]));
const S = (o = {}) => ({
  sampleAdequacy: { length:'15', arterialStructure:true, sections:'10', elasticStain:true, ...(o.sa||{}) },
  majorFindings:  { ...zero(MAJ), ...(o.maj||{}) },
  minorFindings:  { ...zero(MIN), ...(o.min||{}) },
  clinicalData:   { age:'', newHeadache:false, jawClaudication:false, visualSymptoms:false,
                    esr:'', crp:false, haloSign:false, onSteroids:false, steroidDays:'', ...(o.cli||{}) },
  ihcMarkers:     { cd68:false, cd4:false, cd8:false, cd3:false, cd20:false },
  redFlags:       { atypicalLymphoid:false, necrotizingGranulomas:false, necrotizingVasculitis:false, ...(o.rf||{}) },
  clinicalMode:   o.mode || 'none',
});
const CLIN = { age:'72', newHeadache:true, jawClaudication:true, esr:'90', crp:true, haloSign:true };
const testoAvvisi = r => r.validationWarnings.map(w => w.text).join(' ');

// [id, stato, morph atteso, categoria attesa (chiave), verifica aggiuntiva opzionale]
const CASI = [
  ['T1 transmurale + linfocitario',        S({ maj:{transmuralInflammation:true}, min:{lymphocyticInfiltrate:true} }), 'attiva', 'compatibile'],
  ['T2 come T1 con dati clinici pieni',     S({ mode:'full', maj:{transmuralInflammation:true}, min:{lymphocyticInfiltrate:true}, cli:CLIN }), 'attiva', 'compatibile'],
  ['T3 solo linfocitario (decisione D2)',  S({ min:{lymphocyticInfiltrate:true} }), 'attiva', 'compatibile'],
  ['T4 sole cellule giganti',              S({ maj:{giantCells:true} }), 'giganti_senza_media', 'compatibile', r => /amiloid/i.test(testoAvvisi(r))],
  ['T5 cellule giganti + transmurale',     S({ maj:{giantCells:true, transmuralInflammation:true} }), 'attiva', 'compatibile'],
  ['T6 solo avventiziale',                 S({ min:{adventitialInflammation:true} }), 'solo_avventiziale', 'negativa', r => /livelli/i.test(r.diagnosis.recommendation)],
  ['T7 come T6 con dati clinici pieni',     S({ mode:'full', min:{adventitialInflammation:true}, cli:CLIN }), 'solo_avventiziale', 'negativa', r => /livelli/i.test(r.diagnosis.recommendation)],
  ['T8 danno guarito',                     S({ min:{intimalThickening:true, neovascularization:true, focalElasticFragmentation:true} }), 'danno_guarito', 'bassa_concordanza',
     r => /danno arterioso guarito/i.test(r.referto) && /negativo per arterite attiva/i.test(r.referto) && !/alterazioni infiammatorie/i.test(r.referto)],
  ['T9 solo ispessimento intimale',        S({ min:{intimalThickening:true} }), 'negativa', 'negativa', r => /et[àa]/i.test(r.referto)],
  ['T10 nessun reperto',                   S({}), 'negativa', 'negativa', r => /skip lesion/i.test(r.referto)],
  ['T11 struttura assente',                S({ sa:{arterialStructure:false} }), 'inadeguato', 'inadeguato'],
  ['T12 necrotizzante + media',            S({ maj:{transmuralInflammation:true, granulomatous:true}, rf:{necrotizingVasculitis:true} }), 'attiva', 'compatibile'],
  ['T13 quadro pieno, clinica piena',      S({ mode:'full', maj:{granulomatous:true, giantCells:true, transmuralInflammation:true, elasticFragmentation:true}, cli:CLIN }), 'attiva', 'diagnostica'],
];

let ok = 0, ko = 0, ni = 0;
for (const [nome, st, morph, key, extra] of CASI) {
  const r = runCase(st);
  if (r.morph === undefined) { ni++; console.log(`  non implementato  ${nome}  (oggi: ${r.diagnosis.key})`); continue; }
  const esito = r.morph === morph && r.diagnosis.key === key && (!extra || extra(r));
  esito ? ok++ : ko++;
  console.log(`  ${esito ? 'OK ' : 'KO '} ${nome}: morph=${r.morph} (atteso ${morph}), categoria=${r.diagnosis.key} (attesa ${key})`);
}
console.log(`\n${ok} ok, ${ko} ko, ${ni} non implementati`);
process.exit(ko ? 1 : 0);
