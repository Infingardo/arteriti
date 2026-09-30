// -----------------------------------------------------------------------------
//  MOTORE — biopsia dell'arteria temporale / GCA. Logica pura: niente DOM, niente JSX.
//  Estratto da index.html nella v3.7.0.
//
//  Perche' esiste: la conclusione del referto veniva scelta con
//  `categoria.includes('DIAGNOSTICA')`, vero anche per "NON DIAGNOSTICA". Due
//  categorie su dieci — le due che nella pratica escono piu' spesso — producevano
//  un referto copiabile che diceva "il quadro istologico e' diagnostico per GCA"
//  mentre il cartello a schermo diceva il contrario. Con la logica dentro un
//  componente React di 1400 righe non c'era modo di accorgersene se non a mano.
// -----------------------------------------------------------------------------
'use strict';

// Punteggi morfologici. Il massimo raggiungibile NON e' 100: la frammentazione
// focale (<30%) e quella diffusa (>30%) descrivono la stessa lamina e si escludono.
const HISTO_POINTS = {
  giantCells: 22, granulomatousConCG: 11, granulomatousDaSola: 22,
  elasticFragmentation: 15, transmuralInflammation: 13,
  lymphocyticInfiltrate: 5, intimalThickening: 5, adventitialInflammation: 5,
  neovascularization: 5, focalElasticFragmentation: 5
};
const HISTO_MAX = HISTO_POINTS.giantCells + HISTO_POINTS.granulomatousConCG
                + HISTO_POINTS.elasticFragmentation + HISTO_POINTS.transmuralInflammation
                + HISTO_POINTS.lymphocyticInfiltrate + HISTO_POINTS.intimalThickening
                + HISTO_POINTS.adventitialInflammation + HISTO_POINTS.neovascularization; // 81
const CLINICAL_MAX = 100;   // clinicalScore e' cappato a 100 su un grezzo di 135

// Una conclusione per ogni chiave di categoria. Il test verifica che la mappa
// copra tutte le chiavi che getDiagnosis puo' produrre, e nessuna in piu'.
const CONCLUSIONI = {
  diagnostica: 'Il quadro istologico e\u0300 diagnostico per arterite a cellule giganti (GCA / arterite temporale di Horton).'.replace('e\u0300','\u00e8'),
  altamente_suggestiva: 'Il quadro istologico \u00e8 altamente suggestivo per arterite a cellule giganti. Si raccomanda correlazione con il contesto clinico-laboratoristico per la decisione terapeutica.',
  compatibile_clinica_suggestiva: 'Il quadro istologico \u00e8 compatibile con arterite a cellule giganti, pur in assenza di reperti patognomonici. Il contesto clinico \u00e8 altamente suggestivo; si raccomanda integrazione clinico-reumatologica/vascolare urgente, anche mediante eco-Doppler temporale/ascellare bilaterale ed eventuale PET-TC.',
  non_diagnostica_clinica_suggestiva: 'Il quadro istologico \u00e8 compatibile con arterite a cellule giganti, in assenza di reperti patognomonici. La diagnosi richiede necessaria integrazione con il contesto clinico-laboratoristico e imaging vascolare (eco-Doppler temporale/ascellare bilaterale, eventuale PET-TC).',
  compatibile: 'Il quadro istologico \u00e8 compatibile con arterite a cellule giganti, in assenza di reperti patognomonici. La diagnosi richiede necessaria integrazione con il contesto clinico-laboratoristico e imaging vascolare (eco-Doppler temporale/ascellare bilaterale, eventuale PET-TC).',
  aspecifica_clinica_suggestiva: 'Non si identificano criteri morfologici maggiori di arterite a cellule giganti nelle sezioni esaminate. Il quadro istologico \u00e8 aspecifico e non attribuibile a GCA su base morfologica, indipendentemente dal contesto clinico.',
  bassa_concordanza: 'Il quadro istologico mostra alterazioni infiammatorie vascolari aspecifiche, a bassa concordanza con arterite a cellule giganti. Si raccomanda diagnosi differenziale con vasculite ANCA-associata, arterite di Takayasu e vasculite IgG4-correlata.',
  negativa: 'Non si identificano reperti istologici specifici riferibili ad arterite a cellule giganti nelle sezioni esaminate.',
  inconsistente: 'NOTA: Sono presenti incoerenze logiche nei dati inseriti. Il referto automatico non \u00e8 affidabile. Correggere le incoerenze prima di procedere alla refertazione definitiva.',
  inadeguato: 'Il campione non \u00e8 valutabile istologicamente per assenza di struttura vascolare. La diagnosi di arterite a cellule giganti non pu\u00f2 essere applicata. Si raccomanda nuovo prelievo adeguato.'
};

// I reperti inattesi non annullano la categoria: la subordinano.
function subordinaRedFlag(d, scores){
  if (!scores || !scores.hasRedFlags || !d || d.blocked) return d;
  return Object.assign({}, d, {
    category: d.category + ' \u2014 SUBORDINATA A DD ALTERNATIVA',
    color: 'bg-purple-100 border-purple-500',
    icon: 'triangle',
    redFlag: true,
    recommendation: 'Sono documentati reperti morfologici alternativi (vedere sezione dedicata). La categoria indicata resta quella prodotta dai criteri applicati, ma \u00e8 subordinata all\'esclusione dei pattern identificati. ' + (d.recommendation || '')
  });
}

// Quanta informazione clinica c'e' davvero. Una casella non spuntata non e' una
// risposta negativa: e' un dato che nessuno ha inserito. La modalita' 'full' era
// il default e contava come ASSENTI tutti i campi mai compilati, col 40% del peso.
function suggestClinicalMode(cd){
  cd = cd || {};
  const compilati = [
    cd.age !== '' && cd.age != null,
    !!cd.newHeadache, !!cd.jawClaudication, !!cd.visualSymptoms,
    cd.esr !== '' && cd.esr != null,
    !!cd.crp, !!cd.haloSign
  ].filter(Boolean).length;
  return compilati >= 3 ? 'full' : compilati >= 1 ? 'partial' : 'none';
}

function makeEngine(st){
  const { sampleAdequacy, majorFindings, minorFindings, clinicalData,
          ihcMarkers, redFlags, clinicalMode } = st;

        /* ── GATING: struttura arteriosa ────────────────────────────────── */
        const hasArterialStructure = sampleAdequacy.arterialStructure;

        /* ── GATING: condizioni di eligibilità reperti elastici ─────────── */
        const hasActiveInflammation =
            majorFindings.giantCells ||
            majorFindings.granulomatous ||
            majorFindings.transmuralInflammation ||
            minorFindings.lymphocyticInfiltrate ||
            minorFindings.adventitialInflammation;
        // Frammentazione LEI visibile anche su EE — VVG migliora la quantificazione ma non è prerequisito.
        // canUseElasticFull: infiammazione attiva presente → punteggio pieno (15 pt maggiore, 5 pt focale)
        const canUseElasticFull = hasActiveInflammation;
        // canUseElasticIsolated: SENZA infiammazione attiva → 3 pt con riserva (diffusa) / 2 pt (focale)
        // Razionale: danno strutturale LEI persiste come cicatrice morfologica post-steroidea.
        const canUseElasticIsolated = !hasActiveInflammation;
        // UI: checkbox abilitata se struttura arteriosa presente (sempre, indipendentemente da VVG)
        const canUseElastic = hasArterialStructure;

        /* ── PESI IN BASE ALLA MODALITÀ ──────────────────────────────────── */
        const getWeights = () => {
            if (clinicalMode === 'none')    return { h: 1.00, c: 0.00 };
            if (clinicalMode === 'partial') return { h: 0.80, c: 0.20 };
            return                                 { h: 0.60, c: 0.40 };
        };

        /* ── VALIDAZIONE COERENZA ────────────────────────────────────────── */
        const getValidationWarnings = () => {
            const warnings = [];
            if (!sampleAdequacy.elasticStain && (majorFindings.elasticFragmentation || minorFindings.focalElasticFragmentation)) {
                warnings.push({ level:'info', text:'Frammentazione elastica selezionata senza VVG: la stima è su EE, morfologicamente valida ma meno precisa nella quantificazione. La VVG è raccomandata per documentazione formale e per la stima percentuale della frammentazione.' });
            }
            if ((majorFindings.elasticFragmentation || minorFindings.focalElasticFragmentation) && !hasActiveInflammation) {
                warnings.push({ level:'warning', text:'Frammentazione elastica in assenza di infiltrato infiammatorio attivo: contributo ridotto con riserva (3 pt se diffusa >30%; 2 pt se focale <30%). DD obbligatoria: aterosclerosi accelerata, involuzione elastica da invecchiamento, artefatto da processazione. In contesto di biopsia post-steroidea il dato strutturale può avere valore residuo.' });
            }
            if (clinicalData.onSteroids && (clinicalData.steroidDays==='' || isNaN(parseInt(clinicalData.steroidDays)))) {
                warnings.push({ level:'warning', text:'Terapia steroidea indicata ma durata non specificata. Nessuna correzione numerica applicata; interpretare con cautela soprattutto i reperti negativi o aspecifici. Inserire i giorni di terapia per calibrare la nota interpretativa.' });
            }
            if (!hasArterialStructure && (majorFindings.transmuralInflammation || majorFindings.elasticFragmentation || minorFindings.intimalThickening)) {
                warnings.push({ level:'error', daInadeguatezza:true, text:'Reperti murali selezionati (infiammazione transmurale, frammentazione elastica, ispessimento intimale) su campione con struttura arteriosa assente. Incoerenza logica: i punti relativi sono ESCLUSI dal calcolo.' });
            }
            if (!hasArterialStructure && majorFindings.giantCells) {
                warnings.push({ level:'error', daInadeguatezza:true, text:'Cellule giganti selezionate ma struttura arteriosa non identificabile: impossibile attribuire topograficamente le CG alla giunzione intima-media. Punti ESCLUSI dal calcolo.' });
            }
            if (minorFindings.eosinophils) {
                warnings.push({ level:'info', text:'Eosinofili intraparietali significativi: reperto atipico per GCA. DD: EGPA, vasculite ANCA-eosinofilica, reazione avventiziale aspecifica. Valutare ANCA (MPO/PR3), eosinofilia periferica, contesto clinico.' });
            }
            if (majorFindings.elasticFragmentation && minorFindings.focalElasticFragmentation) {
                warnings.push({ level:'error', text:'Frammentazione della lamina elastica interna indicata come diffusa (>30%) e come focale (<30%) sullo stesso campione: le due voci si escludono a vicenda. Selezionarne una sola. Fino alla correzione i punti della sola voce diffusa sono conteggiati e il punteggio non e\' interpretabile.' });
            }
            const ageVal = parseInt(clinicalData.age);
            if (!isNaN(ageVal) && ageVal < 50) {
                warnings.push({ level:'warning', text:`Età <50 anni (${ageVal} aa): la GCA è eccezionale sotto i 50 anni (criterio ACR/EULAR 2022: età ≥50 requisito di classificazione). Un quadro morfologico di arterite granulomatosa in paziente giovane impone diagnosi differenziale prioritaria: arterite di Takayasu, vasculite ANCA-associata, arterite infettiva, sarcoidosi vascolare, vasculite IgG4-correlata. La diagnosi nosologica di GCA non può essere posta su base istologica isolata in questa fascia d'età.` });
            }
            return warnings;
        };

        /* ── CALCOLO SCORE ───────────────────────────────────────────────── */
        const calculateScore = () => {
            let histoScore = 0;
            let clinicalScore = 0;

            const length   = parseFloat(sampleAdequacy.length);
            const sections = parseInt(sampleAdequacy.sections);
            const lengthMissing   = isNaN(length)   || sampleAdequacy.length   === '';
            const sectionsMissing = isNaN(sections) || sampleAdequacy.sections === '';

            let adequacyLevel;
            if (!hasArterialStructure) adequacyLevel = 'inadequate';
            else if (lengthMissing || sectionsMissing) adequacyLevel = 'unknown';
            else if (length < 10 || sections < 6) adequacyLevel = 'suboptimal';
            else adequacyLevel = 'adequate';

            if (adequacyLevel === 'inadequate') {
                const age = parseInt(clinicalData.age);
                if (age >= 50) clinicalScore += 15;
                if (age >= 70) clinicalScore += 10;
                if (clinicalData.newHeadache)     clinicalScore += 20;
                if (clinicalData.jawClaudication) clinicalScore += 25;
                if (clinicalData.visualSymptoms)  clinicalScore += 20;
                const esr = parseInt(clinicalData.esr);
                if (esr >= 50) clinicalScore += 10;
                if (esr >= 80) clinicalScore += 10;
                if (clinicalData.crp)      clinicalScore += 10;
                if (clinicalData.haloSign) clinicalScore += 15;
                clinicalScore = Math.min(100, clinicalScore);
                return { histoScore:null, clinicalScore, compositeScore:null, histoMax:HISTO_MAX, clinicalMax:CLINICAL_MAX, compositeMax:Math.round(HISTO_MAX*getWeights().h + CLINICAL_MAX*getWeights().c), histoContrib:null, clinicContrib:null, steroidOngoing:clinicalData.onSteroids, steroidDays:parseInt(clinicalData.steroidDays)||0, driver:'n/a', adequacyLevel, majorCount:0, minorCount:0, hasCoreCriteria:false, hasRedFlags:redFlags.atypicalLymphoid||redFlags.necrotizingGranulomas||redFlags.necrotizingVasculitis };
            }

            const validMajorFindings = {
                giantCells:            majorFindings.giantCells,
                granulomatous:         majorFindings.granulomatous,
                elasticFragmentation:  majorFindings.elasticFragmentation && canUseElasticFull,
                transmuralInflammation:majorFindings.transmuralInflammation
            };
            const validMinorFindings = {
                lymphocyticInfiltrate:     minorFindings.lymphocyticInfiltrate,
                intimalThickening:         minorFindings.intimalThickening,
                adventitialInflammation:   minorFindings.adventitialInflammation,
                neovascularization:        minorFindings.neovascularization,
                focalElasticFragmentation: minorFindings.focalElasticFragmentation && canUseElasticFull && !majorFindings.elasticFragmentation
            };
            // Frammentazione isolata (VVG sì, infiammazione no): 3 pt maggiore / 2 pt focale — con riserva
            // Razionale: danno strutturale LEI persiste come cicatrice morfologica post-steroidea
            const elasticIsolatedMajor = majorFindings.elasticFragmentation && canUseElasticIsolated;
            const elasticIsolatedMinor = minorFindings.focalElasticFragmentation && canUseElasticIsolated && !majorFindings.elasticFragmentation;

            const majorCount      = Object.values(validMajorFindings).filter(Boolean).length;
            const validMinorCount = Object.values(validMinorFindings).filter(Boolean).length;
            const hasCoreCriteria = validMajorFindings.giantCells || validMajorFindings.granulomatous;

            if (validMajorFindings.giantCells)             histoScore += 22;
            if (validMajorFindings.granulomatous)          histoScore += validMajorFindings.giantCells ? 11 : 22;
            if (validMajorFindings.elasticFragmentation)   histoScore += 15;
            if (validMajorFindings.transmuralInflammation) histoScore += 13;
            if (validMinorFindings.lymphocyticInfiltrate)     histoScore += 5;
            if (validMinorFindings.intimalThickening)         histoScore += 5;
            if (validMinorFindings.adventitialInflammation)   histoScore += 5;
            if (validMinorFindings.neovascularization)        histoScore += 5;
            if (validMinorFindings.focalElasticFragmentation) histoScore += 5;
            if (elasticIsolatedMajor) histoScore += 3;
            if (elasticIsolatedMinor) histoScore += 2;

            // Score clinico — calcolato sempre (anche in modalità 'none'/'partial')
            // In 'none': contribuisce 0% al composito; in 'partial': contribuisce 20%
            const age = parseInt(clinicalData.age);
            if (age >= 50) clinicalScore += 15;
            if (age >= 70) clinicalScore += 10;
            if (clinicalData.newHeadache)     clinicalScore += 20;
            if (clinicalData.jawClaudication) clinicalScore += 25;
            if (clinicalData.visualSymptoms)  clinicalScore += 20;
            const esr = parseInt(clinicalData.esr);
            if (esr >= 50) clinicalScore += 10;
            if (esr >= 80) clinicalScore += 10;
            if (clinicalData.crp)      clinicalScore += 10;
            if (clinicalData.haloSign) clinicalScore += 15;
            clinicalScore = Math.min(100, clinicalScore);

            // Steroidi: nessuna sottrazione numerica.
            // Razionale: positivo sotto steroidi = resta positivo (peso aumentato, non ridotto).
            // Negativo sotto steroidi = non esclude GCA. La penalità numerica era biologicamente
            // controintuitiva. L'effetto è gestito come warning interpretativo + nota nel referto.
            const steroidOngoing = clinicalData.onSteroids;
            const steroidDays = parseInt(clinicalData.steroidDays) || 0;

            const { h: hw, c: cw } = getWeights();
            const compositeScore = Math.min(100, Math.max(0,
                Math.round((histoScore * hw) + (clinicalScore * cw))
            ));

            const histoContrib  = Math.round(histoScore * hw);
            const compositeMax  = Math.round(HISTO_MAX * hw + CLINICAL_MAX * cw);
            const clinicContrib = Math.round(clinicalScore * cw);
            const driver = (clinicalMode === 'none')  ? 'morphology' :
                           histoContrib > clinicContrib  ? 'morphology' :
                           clinicContrib > histoContrib  ? 'clinical'   : 'balanced';

            return {
                histoScore, clinicalScore, compositeScore,
                histoMax: HISTO_MAX, clinicalMax: CLINICAL_MAX, compositeMax,
                histoContrib, clinicContrib, steroidOngoing, steroidDays, driver, adequacyLevel,
                majorCount, minorCount: validMinorCount, hasCoreCriteria,
                validMajorFindings, validMinorFindings,
                elasticIsolatedMajor, elasticIsolatedMinor,
                hasRedFlags: redFlags.atypicalLymphoid || redFlags.necrotizingGranulomas || redFlags.necrotizingVasculitis
            };
        };

        /* ── CATEGORIA DIAGNOSTICA ───────────────────────────────────────── */
        const _diagnosiGrezza = (scores, hardInconsistency) => {
            const { compositeScore, majorCount, minorCount, clinicalScore, hasCoreCriteria,
                    adequacyLevel, steroidOngoing, steroidDays, driver } = scores;

            if (adequacyLevel === 'inadequate') return { key:'inadeguato', blocked:'inadequate' };

            if (hardInconsistency) {
                return {
                    blocked:'inconsistent',
                    key:'inconsistente', category:'VALUTAZIONE NON AFFIDABILE',
                    color:'bg-gray-100 border-gray-500',
                    icon:'ban',
                    text:'Incoerenze interne da correggere prima di procedere',
                    recommendation:'Una o più selezioni sono logicamente incompatibili (vedi Avvisi di coerenza). Correggere le incoerenze: il numero composito attuale non è interpretabile.'
                };
            }

            let suboptimalWarning = '';
            if (adequacyLevel === 'unknown') suboptimalWarning = ' | ⚠ Dimensioni campione non inserite.';
            else if (adequacyLevel === 'suboptimal') suboptimalWarning = ' | Campione subottimale: se negativo con sospetto elevato → considerare nuovo prelievo.';

            const driverLabel = driver === 'morphology' ? '— peso prevalente: morfologia'
                              : driver === 'clinical'   ? '— peso prevalente: clinica'
                              : '— morfologia e clinica bilanciate';

            // ── MODALITÀ SOLO ISTOLOGIA: soglie ricalibrate ─────────────────
            // Razionale: senza ancoraggio clinico le soglie sono più stringenti
            // per gli score bassi ma non penalizzano la morfologia positiva forte.
            // Soglie: DIAGNOSTICA ≥55 + ≥2 maggiori + core criteria
            //         ALTAMENTE SUGGESTIVA ≥40 + ≥1 maggiore
            //         COMPATIBILE ≥20 + (≥1 maggiore o ≥2 minori)
            //         BASSA CONCORDANZA ≥10
            //         NEGATIVA <10
            if (clinicalMode === 'none') {
                const modeNote = ' | Diagnosi basata esclusivamente su criteri morfologici — notizie cliniche non disponibili al momento della refertazione.';
                if (compositeScore >= 55 && majorCount >= 2 && hasCoreCriteria) {
                    return {
                        key:'diagnostica', category:'ISTOLOGIA DIAGNOSTICA PER GCA',
                        color:'bg-red-100 border-red-500',
                        icon:'alert',
                        text:'Arterite a cellule giganti — diagnosi basata su soli criteri morfologici',
                        driverLabel:'— morfologia (notizie cliniche non disponibili)',
                        recommendation:'Core criteria presenti (CG e/o granulomatosa organizzata centrata sulla LEI) con reperti morfologici complessivi fortemente concordanti. La diagnosi è istologicamente sostenibile in assenza di dati clinici. Il quadro morfologico è da integrare nel contesto clinico-reumatologico/vascolare.' + suboptimalWarning + modeNote
                    };
                }
                if (compositeScore >= 40 && majorCount >= 1) {
                    return {
                        key:'altamente_suggestiva', category:'ISTOLOGIA ALTAMENTE SUGGESTIVA PER GCA',
                        color:'bg-orange-100 border-orange-500',
                        icon:'alert',
                        text:'Reperti morfologici altamente suggestivi — notizie cliniche non disponibili',
                        driverLabel:'— morfologia (notizie cliniche non disponibili)',
                        recommendation: (steroidOngoing
                            ? 'Biopsia sotto steroidi: sensibilità ridotta già dopo 3–5 gg. Reperti istologici altamente suggestivi — interpretare con cautela in assenza di contesto clinico.'
                            : 'Reperti morfologici altamente suggestivi. In assenza di dati clinici non è possibile raggiungere la soglia diagnostica piena. Richiedere urgentemente correlazione clinica (almeno età, VES/PCR, sintomi oculari).') + suboptimalWarning + modeNote
                    };
                }
                if (compositeScore >= 20 && (majorCount >= 1 || minorCount >= 2)) {
                    return {
                        key:'compatibile', category:'ISTOLOGIA COMPATIBILE CON GCA — NON DIAGNOSTICA',
                        color:'bg-yellow-100 border-yellow-500',
                        icon:'info',
                        text:'Reperti morfologici compatibili ma non diagnostici. Notizie cliniche non disponibili.',
                        driverLabel:'— morfologia (notizie cliniche non disponibili)',
                        recommendation:'Quadro compatibile ma aspecifico senza ancoraggio clinico. Possibile variante senza cellule giganti (20–30% dei casi). Richiedere dati clinici minimi (età, indici infiammatori, sintomi).' + suboptimalWarning + modeNote
                    };
                }
                if (compositeScore >= 10) {
                    return {
                        key:'bassa_concordanza', category:'BASSA CONCORDANZA MORFOLOGICA CON GCA',
                        color:'bg-blue-100 border-blue-400',
                        icon:'info',
                        text:'Scarsa concordanza morfologica con GCA. Notizie cliniche non disponibili.',
                        driverLabel:'— morfologia (notizie cliniche non disponibili)',
                        recommendation:'Alterazioni aspecifiche o scarsamente rappresentative. DD: vasculite ANCA-associata, arterite di Takayasu, vasculite IgG4-correlata, aterosclerosi accelerata.' + suboptimalWarning + modeNote
                    };
                }
                return {
                    key:'negativa', category:'BIOPSIA NEGATIVA / NON CONCLUSIVA',
                    color:'bg-green-100 border-green-500',
                    icon:'check',
                    text:'Non concordante con GCA (soli criteri morfologici)',
                    driverLabel:'— morfologia (notizie cliniche non disponibili)',
                    recommendation: (steroidOngoing
                        ? 'Reperti non diagnostici. Biopsia sotto steroidi — sensibilità ridotta. Se sospetto clinico persiste: eco-Doppler bilaterale, biopsia controlaterale, PET-TC.'
                        : 'Biopsia negativa per GCA. Skip lesions nel ~10–15% dei casi. Se sospetto clinico elevato: eco-Doppler bilaterale, biopsia controlaterale.') + suboptimalWarning + modeNote
                };
            }

            // ── MODALITÀ PARZIALE: soglie standard ma nota esplicita ────────
            const partialNote = clinicalMode === 'partial'
                ? ' | ⚠ Dati clinici incompleti: score conservativo (pesi 80/20). I parametri clinici non inseriti sono conteggiati come assenti — lo score composito sottostima la probabilità reale.'
                : '';

            // ── MODALITÀ COMPLETA + PARZIALE: logica standard ───────────────
            if (compositeScore >= 70 && majorCount >= 2 && hasCoreCriteria) {
                return {
                    key:'diagnostica', category:'ISTOLOGIA DIAGNOSTICA PER GCA',
                    color:'bg-red-100 border-red-500',
                    icon:'alert',
                    text:'Arterite a cellule giganti — diagnosi istologica',
                    driverLabel,
                    recommendation:'Il quadro istologico supporta la diagnosi di arterite a cellule giganti. Core criteria presenti (CG e/o granulomatosa organizzata centrata sulla LEI). Integrare nel contesto clinico-reumatologico/vascolare per le decisioni terapeutiche.' + suboptimalWarning + partialNote
                };
            }
            // Hard lock: "ALTAMENTE SUGGESTIVO" richiede almeno 1 criterio morfologico maggiore.
            // Se la categoria è guidata solo dalla clinica (nessun maggiore, pochi minori) → decade a COMPATIBILE.
            const hasAnyMajor = majorCount >= 1;
            if (compositeScore >= 55 && (hasAnyMajor || (minorCount >= 3 && clinicalScore >= 50))) {
                const isClinicallyDriven = driver === 'clinical';
                // Hard lock: senza criteri morfologici maggiori la categoria non può essere "altamente suggestiva"
                if (!hasAnyMajor && isClinicallyDriven) {
                    return {
                        key:'aspecifica_clinica_suggestiva', category:'ISTOLOGIA ASPECIFICA — CLINICA SUGGESTIVA',
                        color:'bg-yellow-100 border-yellow-500',
                        icon:'info',
                        text:'Nessun criterio morfologico maggiore. Quadro istologico aspecifico; contesto clinico suggestivo.',
                        driverLabel,
                        recommendation:'In assenza di criteri morfologici maggiori il quadro istologico non è attribuibile a GCA indipendentemente dal contesto clinico. Raccomandati: eco-Doppler temporale/ascellare bilaterale, eventuale biopsia controlaterale o imaging grandi vasi.' + suboptimalWarning + partialNote
                    };
                }
                return {
                    key: isClinicallyDriven ? 'compatibile_clinica_suggestiva' : 'altamente_suggestiva',
                    category: isClinicallyDriven ? 'ISTOLOGIA COMPATIBILE — CLINICA ALTAMENTE SUGGESTIVA' : 'ALTAMENTE SUGGESTIVO PER GCA',
                    color:'bg-orange-100 border-orange-500',
                    icon:'alert',
                    text: isClinicallyDriven ? 'Biopsia con reperti morfologici presenti ma non patognomonici; clinica fortemente suggestiva' : 'Reperti istologici altamente suggestivi per GCA',
                    driverLabel,
                    recommendation: (steroidOngoing
                        ? 'Biopsia sotto steroidi (sensibilità ridotta già dopo 3–5 gg). Reperti morfologici compatibili — interpretare con cautela nel contesto clinico. Considerare eco-Doppler e/o PET-TC.'
                        : 'Il quadro istologico supporta la correlazione con GCA nel contesto clinico. Integrare con valutazione reumatologica/vascolare per le decisioni terapeutiche.') + suboptimalWarning + partialNote
                };
            }
            if (compositeScore >= 40 && clinicalScore >= 40) {
                return {
                    key:'non_diagnostica_clinica_suggestiva', category:'ISTOLOGIA NON DIAGNOSTICA — CLINICA SUGGESTIVA',
                    color:'bg-yellow-100 border-yellow-500',
                    icon:'info',
                    text:'Biopsia compatibile, non diagnostica. Contesto clinico suggestivo.',
                    driverLabel,
                    recommendation:'Reperti compatibili ma non diagnostici. Possibile variante senza cellule giganti (20–30% dei casi). Raccomandati: eco-Doppler temporale/ascellare, eventuale PET-TC, biopsia controlaterale.' + suboptimalWarning + partialNote
                };
            }
            if (compositeScore >= 25) {
                return {
                    key:'bassa_concordanza', category:'BIOPSIA A BASSA CONCORDANZA CON GCA',
                    color:'bg-blue-100 border-blue-400',
                    icon:'info',
                    text:'Scarsa concordanza morfologica e clinica con GCA',
                    driverLabel,
                    recommendation:'Alterazioni aspecifiche o scarsamente rappresentative. DD: vasculite ANCA-associata, arterite di Takayasu, vasculite IgG4-correlata, aterosclerosi accelerata.' + suboptimalWarning + partialNote
                };
            }
            return {
                key:'negativa', category:'BIOPSIA NEGATIVA / NON CONCLUSIVA',
                color:'bg-green-100 border-green-500',
                icon:'check',
                text:'Non concordante con GCA',
                driverLabel,
                recommendation: (steroidOngoing
                    ? 'Reperti non diagnostici. Biopsia sotto steroidi — sensibilità ridotta dopo 7–14 gg. Se sospetto clinico persiste: eco-Doppler bilaterale, biopsia controlaterale, PET-TC.'
                    : 'Biopsia negativa per GCA. Skip lesions nel ~10–15% dei casi. Se sospetto clinico elevato: eco-Doppler bilaterale, biopsia controlaterale, imaging grandi vasi.') + suboptimalWarning + partialNote
            };
        };

        // v3.7.0: i reperti inattesi non arrivavano a getDiagnosis. Una vasculite
        // necrotizzante con necrosi fibrinoide di parete usciva sotto il cartello
        // "ISTOLOGIA DIAGNOSTICA PER GCA" mentre il referto, che invece li leggeva,
        // diceva che la GCA era diagnosi subordinata: due organi dello stesso strumento
        // che dicevano cose diverse. La categoria non viene cancellata — i criteri
        // applicati restano quelli — ma viene dichiarata subordinata.
        const getDiagnosis = (scores, hardInconsistency) =>
            subordinaRedFlag(_diagnosiGrezza(scores, hardInconsistency), scores);

        /* ── RACCOMANDAZIONI IHC ─────────────────────────────────────────── */
        const getIhcRecommendations = (scores) => {
            const { majorCount, minorCount, compositeScore } = scores;
            const recs = [];
            if (!ihcMarkers.cd68) {
                recs.push(majorCount===0||(majorCount===1&&minorCount<3) ? {
                    marker:'CD68', priority:'ALTA', color:'text-red-600',
                    reason:'CD68 supporta la documentazione dell\'infiltrato macrofagico a livello intima-media, ma non è criterio diagnostico autonomo. Sensibile ma non specifico — presente in altre vasculiti granulomatose e macrofagiche.'
                } : {
                    marker:'CD68', priority:'OPZIONALE', color:'text-blue-600',
                    reason:'Core criteria già presenti. CD68 può documentare la distribuzione intima-media dell\'infiltrato macrofagico.'
                });
            }
            if (!ihcMarkers.cd4 && !ihcMarkers.cd8) {
                if ((compositeScore >= 40 && compositeScore < 70) || clinicalData.onSteroids) {
                    let reason = '';
                    if ((compositeScore>=40&&compositeScore<70)&&clinicalData.onSteroids)
                        reason='Caso borderline + biopsia sotto steroidi: la distribuzione compartimentale CD4/CD8 (pattern descritto: CD4 prevalente in media, CD8 in avventizia) può supportare la DD. Più resistente alla terapia steroidea rispetto alle CG. Non specifico se isolato.';
                    else if (compositeScore>=40&&compositeScore<70)
                        reason='Caso borderline: il rapporto CD4/CD8 e la distribuzione compartimentale possono supportare la DD (pattern descritto in GCA: CD4 in media, CD8 in avventizia). Non specifico se isolato.';
                    else
                        reason='Biopsia sotto steroidi: la caratterizzazione CD4/CD8 può compensare parzialmente la riduzione di sensibilità morfologica. Non specifico se isolato.';
                    recs.push({ marker:'CD4 + CD8', priority:'ALTA', color:'text-red-600', reason });
                } else if (majorCount < 2) {
                    recs.push({ marker:'CD4', priority:'MEDIA', color:'text-orange-600',
                        reason:'Può supportare la diagnosi evidenziando predominanza T helper nella media. Pattern descritto in GCA: CD4+ prevalente a livello intima-media (Weyand & Goronzy, Circ Res 2023). Non specifico se isolato.' });
                }
            } else if (ihcMarkers.cd4 && !ihcMarkers.cd8) {
                recs.push({ marker:'CD8', priority:'MEDIA', color:'text-orange-600',
                    reason:'Per calcolare il rapporto CD4/CD8. In GCA il rapporto è tipicamente >2:1 nella media; CD8+ può prevalere in avventizia. Pattern può supportare la diagnosi, non discriminante isolato.' });
            }
            if (!ihcMarkers.cd20 && majorCount===0 && minorCount<2) {
                recs.push({ marker:'CD20', priority:'MEDIA', color:'text-orange-600',
                    reason:'CD20 è utile se si sospetta componente B prominente atipica. In GCA la componente B è tipicamente assente o minima; un infiltrato B-ricco deve far riconsiderare la diagnosi (IgG4-correlata, vasculiti linfocitarie). Per IgG4 sono necessari morfologia + plasmacellule + IgG4/IgG ratio su IHC dedicata.' });
            }
            if (!ihcMarkers.cd3 && (ihcMarkers.cd4||ihcMarkers.cd8) && majorCount<2) {
                recs.push({ marker:'CD3', priority:'BASSA', color:'text-gray-600',
                    reason:'Opzionale: quantifica la popolazione T totale. Non essenziale per diagnosi routinaria.' });
            }
            return recs;
        };

        /* ── GENERAZIONE REFERTO ─────────────────────────────────────────── */
        const generateReferto = (sc, diag, mode, smplAdq, majF, minF, clinData, ihcMk, hardIncons) => {
            const vMaj = sc.validMajorFindings || {};
            const vMin = sc.validMinorFindings || {};

            // Campione non refertabile
            if (!smplAdq.arterialStructure) {
                return `ARTERIA TEMPORALE — BIOPSIA\n\nADEGUATEZZA DEL CAMPIONE:\nIl campione non contiene struttura arteriosa identificabile (intima, media e avventizia non riconoscibili). Non refertabile per arterite a cellule giganti.\n\nCONCLUSIONE:\nIl campione non è valutabile istologicamente per assenza di struttura vascolare. La diagnosi di arterite a cellule giganti non può essere applicata. Si raccomanda nuovo prelievo adeguato.`;
            }

            // Adeguatezza
            const len = parseFloat(smplAdq.length);
            const sec = parseInt(smplAdq.sections);
            let adeqText = '';
            if (!isNaN(len) && !isNaN(sec)) adeqText = `Frammento di ${len} mm; ${sec} sezioni analizzate serialmente.`;
            else if (!isNaN(len)) adeqText = `Frammento di ${len} mm; numero di sezioni non specificato.`;
            else if (!isNaN(sec)) adeqText = `${sec} sezioni analizzate; lunghezza frammento non specificata.`;
            else adeqText = `Dimensioni campione non specificate.`;
            adeqText += ` Struttura arteriosa presente (intima-media-avventizia identificabili).`;
            adeqText += ` Colorazione elastica ${smplAdq.elasticStain ? 'eseguita (Verhoeff-Van Gieson o equivalente)' : 'non eseguita'}.`;

            // Reperti istologici
            const findings = [];
            if (vMaj.giantCells)             findings.push('— Cellule giganti multinucleate a livello della giunzione intima-media');
            if (vMaj.granulomatous)           findings.push('— Infiammazione granulomatosa organizzata: aggregati macrofagici centrati sulla lamina elastica interna con distruzione elastica');
            if (vMaj.transmuralInflammation)  findings.push('— Infiammazione transmurale (intima, media e avventizia)');
            if (vMaj.elasticFragmentation)    findings.push('— Frammentazione della lamina elastica interna (>30%) in associazione con infiltrato infiammatorio attivo');
            if (sc.elasticIsolatedMajor)      findings.push('— Frammentazione della lamina elastica interna (>30%) in assenza di infiltrato infiammatorio attivo identificabile nelle sezioni esaminate [contributo ridotto: 3 pt — DD: aterosclerosi, involuzione da invecchiamento, artefatto; non escludere skip lesion o effetto steroidi]');
            if (vMin.lymphocyticInfiltrate)   findings.push('— Infiltrato linfocitario nella media e nell\'intima');
            if (vMin.intimalThickening)       findings.push('— Ispessimento intimale concentrico');
            if (vMin.adventitialInflammation) findings.push('— Infiltrato infiammatorio avventiziale/periavventiziale');
            if (vMin.neovascularization)      findings.push('— Neovascolarizzazione della parete vascolare');
            if (vMin.focalElasticFragmentation) findings.push('— Frammentazione focale della lamina elastica interna (<30%) in associazione con infiltrato infiammatorio');
            if (sc.elasticIsolatedMinor)        findings.push('— Frammentazione focale della lamina elastica interna (<30%) in assenza di infiltrato infiammatorio attivo [contributo ridotto: 2 pt — con riserva]');
            if (minF.eosinophils)             findings.push('— Eosinofili intraparietali (reperto atipico per GCA; escludere EGPA e vasculiti ANCA-eosinofiliche)');

            // Red flag findings
            const rfFindings = [];
            if (diag.blocked !== 'inadequate') {
                if (redFlags.atypicalLymphoid)     rfFindings.push('— Cellule linfoidi atipiche intravascolari (sospetto linfoma intravascolare — IHC urgente: CD20, CD3, MUM1, Ki67)');
                if (redFlags.necrotizingGranulomas) rfFindings.push('— Granulomi con necrosi centrale (escludere arterite infettiva: ZN, PAS+GMS)');
                if (redFlags.necrotizingVasculitis) rfFindings.push('— Vasculite necrotizzante/necrosi fibrinoide di parete con infiltrato neutrofilico prominente (escludere vasculite ANCA-associata, PAN)');
            }

            // IHC
            const ihcDone = [];
            if (ihcMk.cd68) ihcDone.push('CD68');
            if (ihcMk.cd4)  ihcDone.push('CD4');
            if (ihcMk.cd8)  ihcDone.push('CD8');
            if (ihcMk.cd3)  ihcDone.push('CD3');
            if (ihcMk.cd20) ihcDone.push('CD20');

            // Conclusione — calibrata sulla categoria
            let concl = '';
            if (hardIncons) {
                concl = 'NOTA: Sono presenti incoerenze logiche nei dati inseriti. Il referto automatico non è affidabile nella versione attuale. Correggere le incoerenze prima di procedere alla refertazione definitiva.';
            } else if (rfFindings.length > 0) {
                concl = 'Il quadro morfologico presenta reperti inattesi che orientano verso diagnosi alternative (vedere sezione reperti inattesi). La diagnosi di arterite a cellule giganti, ove applicabile, è da considerarsi diagnosi secondaria subordinata all\'esclusione dei pattern morfologici alternativi identificati.';
            } else {
                // v3.7.0: la conclusione si sceglie sulla CHIAVE della categoria.
                // Prima era `cat.includes('DIAGNOSTICA')`, vero anche per
                // 'ISTOLOGIA NON DIAGNOSTICA — CLINICA SUGGESTIVA' e per
                // 'ISTOLOGIA COMPATIBILE CON GCA — NON DIAGNOSTICA': in quei due casi
                // il referto copiabile diceva "e' diagnostico per GCA".
                concl = CONCLUSIONI[diag.key];
                if (concl === undefined) {
                    concl = CONCLUSIONI.negativa;
                    if (typeof console !== 'undefined' && console.warn)
                        console.warn('[GCA] categoria senza conclusione associata:', diag.key, diag.category);
                }
            }

            // Note aggiuntive
            const notes = [];
            if (mode === 'none') {
                notes.push('Referto emesso in assenza di notizie cliniche. La diagnosi si basa esclusivamente sui reperti morfologici. Si raccomanda integrazione con il contesto clinico-anamnestico al momento della valutazione clinica.');
            } else if (mode === 'partial') {
                notes.push('Dati clinici incompleti al momento della refertazione. La valutazione è basata prevalentemente sui reperti morfologici (pesi 80/20). Ogni integrazione anamnestica potrà modificare la categoria diagnostica.');
            }
            if (clinData.onSteroids) {
                const days = parseInt(clinData.steroidDays) || 0;
                notes.push(`Il paziente è in terapia corticosteroidea${days > 0 ? ` da ${days} giorno/i` : ''}. La sensibilità bioptica è ridotta${days >= 7 ? ' in misura significativa' : ' già a partire dai primi giorni di terapia'}; una biopsia negativa o con reperti aspecifici non esclude la diagnosi di GCA in questo contesto clinico.`);
            }

            // Assemblaggio
            let r = `ARTERIA TEMPORALE — BIOPSIA\n\n`;
            r += `ADEGUATEZZA DEL CAMPIONE:\n${adeqText}\n\n`;
            r += `REPERTI ISTOLOGICI:\n`;
            r += findings.length > 0 ? findings.join('\n') : '— Non si identificano reperti infiammatori specifici nelle sezioni esaminate.';
            if (rfFindings.length > 0) {
                r += `\n\nREPERTI INATTESI / RED FLAG:\n${rfFindings.join('\n')}`;
            }
            if (ihcDone.length > 0) {
                r += `\n\nIMMUNOISTOCHIMICA ESEGUITA: ${ihcDone.join(', ')}`;
                // Nota humility IHC — solo se IHC eseguita
                const isPositiveCase = sc.hasCoreCriteria || (sc.majorCount >= 1);
                if (isPositiveCase) {
                    r += `\nNota: Le colorazioni immunoistochimiche hanno valore documentativo della composizione e topografia dell'infiltrato e non sostitutivo dei criteri morfologici su EE/VVG.`;
                }
            }
            r += `\n\nCONCLUSIONE:\n${concl}`;
            if (notes.length > 0) {
                r += `\n\nNOTE:\n${notes.map((n,i) => `${i+1}. ${n}`).join('\n')}`;
            }
            // Blocco LIMITI — obbligatorio, calibrato sul caso
            const isPositiveConclusion = sc.hasCoreCriteria || (sc.majorCount >= 1);
            r += `\n\nLIMITI INTERPRETATIVI:\n`;
            r += `La valutazione istologica della biopsia dell'arteria temporale è soggetta a fenomeni di skip lesion (presenti nel 10–15% dei casi), variabilità del campionamento e modificazioni indotte da terapia corticosteroidea precoce.`;
            if (!isPositiveConclusion) {
                r += ` La negatività istologica non esclude la diagnosi clinica di GCA in presenza di elevato sospetto clinico-radiologico: nei casi con biopsia negativa e clinica suggestiva si raccomanda eco-Doppler bilaterale e/o biopsia controlaterale.`;
            } else {
                r += ` La diagnosi istologica si basa su topografia e qualità dell'infiltrato infiammatorio, integrità della lamina elastica interna e coinvolgimento parietale valutati su EE e colorazione elastica. I numeri compositi della griglia decisionale hanno valore orientativo, non di score validato.`;
            }
            return r;
        };

  return { getWeights, getValidationWarnings, calculateScore, getDiagnosis,
           getIhcRecommendations, generateReferto,
           hasArterialStructure, hasActiveInflammation, canUseElastic,
           canUseElasticFull, canUseElasticIsolated };
}

// Un solo punto di verita': tutti i riquadri della pagina leggono questo oggetto.
function runCase(st){
  const E = makeEngine(st);
  const validationWarnings = E.getValidationWarnings();
  // v3.7.0: `hardInconsistency` nasceva da warning che implicano gia' l'inadeguatezza,
  // e getDiagnosis usciva prima con blocked:'inadequate'. Il ramo era irraggiungibile.
  const hardInconsistency  = validationWarnings.some(w => w.level === 'error' && !w.daInadeguatezza);
  const scores             = E.calculateScore();
  const diagnosis          = E.getDiagnosis(scores, hardInconsistency);
  const ihcRecs            = E.getIhcRecommendations(scores);
  const referto            = E.generateReferto(scores, diagnosis, st.clinicalMode, st.sampleAdequacy,
                               st.majorFindings, st.minorFindings, st.clinicalData, st.ihcMarkers, hardInconsistency);
  return { engine: E, validationWarnings, hardInconsistency, scores, diagnosis, ihcRecs, referto };
}

const API = { HISTO_POINTS, HISTO_MAX, CLINICAL_MAX, CONCLUSIONI,
              subordinaRedFlag, suggestClinicalMode, makeEngine, runCase };
if (typeof globalThis !== 'undefined') Object.assign(globalThis, API);
if (typeof module !== 'undefined' && module.exports) module.exports = API;
