# Changelog — Checklist per la biopsia dell'arteria temporale

## v4.0.0 (Ottobre 2026) — riallineamento al consensus SCVP 2023

Cambio di impianto, non retrocompatibile negli output. Fonte: Nair V, Fishbein GA, Padera R, et al. Cardiovasc Pathol 2023;67:107574. Piano e decisioni: `docs/PIANO_riallineamento_consensus_SCVP2023.md`.

**Terminologia nuova dei referti: valida dal 24 ottobre 2026. I referti emessi con v3.x restano scritti con la vecchia terminologia.**

### Cosa cambia
- **La categoria dipende solo dall'istologia (D1).** Una domanda decide: la media è infiammata (asse o ramo)? Sì → A, *arterite attiva*, con o senza cellule giganti. Poi B (infiammazione extramediale), C (aspetti suggestivi di esiti di danno arterioso), D (fibrosi intimale), E (negativo). Struttura assente → inadeguato; infiltrato della media non valutato → nessuna conclusione.
- **Eliminati lo score istologico (0-81), lo score clinico, il composito e i pesi 60/40-80/20 (D2).** La clinica resta come pannello di contesto senza numero: nota sul cortisone oltre 7 giorni («come da notizie cliniche») e avviso per età <50 anni.
- **Terminologia (D3).** Nel referto non compaiono «arterite temporale», «Horton», «atipica»; «arterite a cellule giganti» non compare nella riga di diagnosi (resta solo nella nota: la classificazione è clinica).
- **Adeguatezza (D4).** Protocollo del consensus: in toto, sezioni a 1-2 mm, almeno 5 livelli, elastiche. Non conforme → criticità, non cambia la categoria. La lunghezza è un dato descritto; la soglia <10 mm è stata tolta (nessuna fonte).
- **Tolte le raccomandazioni cliniche dal referto (D5):** eco-Doppler, PET-TC, biopsia controlaterale, nuovo prelievo, blocco «Limiti interpretativi».
- **Tolte le cifre senza fonte (D6):** «skip lesion 10-15%», «variante senza giganti 20-30%», «7-14 gg», «3-5 gg», rapporto CD4/CD8 «>2:1».
- **Tre stati per ogni reperto** (non valutato / assente / presente): un campo non compilato non vale «assente». Se solo la media è valutata come non infiammata, E/D/B/C escono con la criticità «classe provvisoria».
- **Mantenuti**: segnali d'allarme (categoria subordinata alla DD), raccomandazioni IHC come supporto (riscritte senza composito, mai criterio), importazione dei dati clinici (ora solo contesto). I suggerimenti IHC non dipendono dalla clinica: il trigger «cortisone oltre 7 giorni» ipotizzato nel piano operativo è stato tolto per coerenza con D2.
- Il referto riporta anche i reperti della media inseriti quando la media non è infiammata o non è valutata (epitelioidi, giganti); reperti di DD con media non infiammata generano una criticità (aggiunta dopo la review: da approvare o togliere).
- Rami collaterali non valutati → criticità «classe provvisoria» (potrebbero cambiare la classe in A). Livelli non interi non vengono troncati; i giorni di cortisone decimali non perdono la frazione.
- Bibliografia: aggiunte 11 referenze del consensus (voci 13, 14, 21, 24, 33, 40, 50, 56, 58, 59, 60), trascritte dall'elenco del PDF; testate per presenza.
- Rimosso l'ex ramo «Valutazione non affidabile»: l'elastica interna è una scelta unica, l'incoerenza diffusa/focale non esiste più.

### Prima e dopo: i sei casi del piano
| Caso | v3.7.0 | v4.0.0 |
|---|---|---|
| Infiammazione transmurale, senza giganti (solo istologia) | Bassa concordanza, alterazioni aspecifiche | **A** — Arterite attiva |
| Infiltrato linfocitario medio-intimale isolato (solo istologia) | Biopsia negativa / non conclusiva | **A** — Arterite attiva |
| Lo stesso, con clinica piena | Istologia non diagnostica — clinica suggestiva («compatibile con GCA») | **A** — Arterite attiva (identica: la clinica non incide) |
| Solo infiammazione avventiziale, clinica piena | Istologia non diagnostica — clinica suggestiva («compatibile con GCA») | **B** — Segmento di arteria muscolare senza arterite attiva. Infiammazione cronica avventiziale e periavventiziale (+ criticità: livelli più profondi) |
| Frammentazione elastica + ispessimento intimale + neovasi, senza infiltrato | Bassa concordanza | **C** (con fibrosi della media) — aspetti suggestivi di esiti di danno arterioso; senza fibrosi della media: D/E |
| Istologia del tutto negativa, clinica piena | «Il quadro istologico è compatibile con arterite a cellule giganti» | **E** — Segmento di arteria muscolare negativo per arterite |

Il sesto caso era un difetto a prescindere dal consensus: un referto istologico che affermava compatibilità senza alcun reperto istologico.

### Dati del consensus
Discordanza fra biopsie bilaterali 4,4-13% nelle serie, 5,5% nella revisione di 1935 casi: riportati dal piano, non verificati sul testo del consensus e non usati nel motore. La soglia dei 7 giorni dall'inizio del cortisone è usata solo nella nota «come da notizie cliniche». Le soglie IgG4 (>50/HPF, >40%) sono i criteri aortici della Tab. 2 del consensus, dichiarati come tali nelle criticità.

### Infrastruttura
- `engine.js` riscritto: `classify()`, `CONCLUSIONI` per chiave (A-E, inadeguato, incompleto), `criticita()`, `avvisi()`, `generateReferto()`; `runCase()` resta l'unico punto di ingresso di pagina e test.
- `tests/run.mjs` riscritto prima del motore (falliva per intero su v3.7.0): un input per ogni classe, i sei casi di regressione, classificazione verificata contro un oracolo indipendente su 2 125 764 combinazioni, sette invarianti anche su un campione di 92 451 referti completi. 237 asserzioni.

### Aperto
- Campo «Lato» (destra/sinistra) della checklist di riferimento non portato nel referto: non è nel piano §3, da decidere.
- Revisioni: subagente Claude (non cross-model) e Codex con `gpt-6-sol` (il modello di default `gpt-6.1-sol` non è accettato dall'account ChatGPT).
- Il piano non prevede C da sola elastica interrotta (senza fibrosi della media): scelta mantenuta come da piano §4.
- `bigino_gca_clinici.html`, `flowchart_clinici.html`, `richiesta_biopsia_temporale.html` non sono ancora allineati (Horton, cifre, raccomandazioni): passaggio separato.

## v3.7.0 (Settembre 2026) — «non diagnostica» non deve uscire come «diagnostica»

### Il difetto principale
La conclusione del referto veniva scelta con un test di sottostringa:

```js
if (cat.includes('DIAGNOSTICA')) {
    concl = 'Il quadro istologico è diagnostico per arterite a cellule giganti…';
}
```

`'ISTOLOGIA NON DIAGNOSTICA — CLINICA SUGGESTIVA'.includes('DIAGNOSTICA')` è `true`.
Due categorie su dieci — e sono le due che nella pratica escono più spesso — finivano
nel primo ramo, producendo un referto **copiabile** che affermava il contrario del
cartello mostrato a schermo:

| categoria a schermo | testo nel referto (v3.6.1) |
|---|---|
| ISTOLOGIA COMPATIBILE CON GCA — **NON DIAGNOSTICA** | «Il quadro istologico **è diagnostico** per GCA» |
| ISTOLOGIA **NON DIAGNOSTICA** — CLINICA SUGGESTIVA | «Il quadro istologico **è diagnostico** per GCA» |

Caso limite verificato: zero reperti istologici (`histoScore = 0`, nessun criterio
maggiore né minore) con clinica completa → referto «*Il quadro istologico è diagnostico
per arterite a cellule giganti (GCA / arterite temporale di Horton)*».

**Correzione.** Ogni categoria porta una chiave esplicita (`diagnostica`,
`non_diagnostica_clinica_suggestiva`, `compatibile`, …) e la conclusione si sceglie
sulla chiave. Un test percorre **12 288 combinazioni** di reperti, modalità e dati
clinici e verifica che nessuna categoria produca una conclusione che la contraddice,
che ogni chiave raggiungibile abbia una conclusione e che la mappa non abbia voci morte.

### Le altre
1. **La modalità dati clinici non parte più da «Dati completi».** Era `useState('full')`:
   i campi clinici mai compilati venivano contati come **assenti**, col 40% del peso.
   Una GCA istologicamente piena — cellule giganti, granulomatosa organizzata sulla LEI,
   infiammazione transmurale, frammentazione elastica — senza dati clinici inseriti usciva
   `BIOPSIA A BASSA CONCORDANZA CON GCA`. Ora la modalità segue i campi effettivamente
   compilati finché l'utente non ne fissa una a mano, ed è dichiarato in pagina che i
   campi non compilati contano come assenti.
2. **Il composito dichiara la propria scala.** `histoScore` non arriva a 100: il massimo
   è **81** (22 + 11 + 15 + 13 fra i maggiori, 5 × 4 fra i minori; la frammentazione
   focale <30% e quella diffusa >30% descrivono la stessa lamina e si escludono). In
   modalità «solo istologia» il composito *è* quel numero, e veniva mostrato come
   `61/100` su una barra riempita al 61%. Ora si legge `61/81`, con il massimo della
   modalità corrente esplicitato. Le soglie non sono state toccate: dichiarare il
   denominatore, non spostare i pali.
3. **Frammentazione diffusa e focale insieme** erano contate due volte (15 + 5 punti per
   la stessa lamina). Ora è un'incoerenza bloccante e i punti si contano una volta sola.
4. **Il ramo «VALUTAZIONE NON AFFIDABILE» era irraggiungibile.** `hardInconsistency`
   nasceva da warning che richiedono tutti l'assenza di struttura arteriosa, ma
   `getDiagnosis` esce prima con `blocked:'inadequate'`. Erano codice morto il cartello
   grigio, lo score barrato e il relativo testo del referto. I warning da inadeguatezza
   sono ora marcati come tali; l'incoerenza del punto 3 rende il ramo raggiungibile.
5. **I reperti inattesi arrivano alla categoria.** `getDiagnosis` non li riceveva: la
   categoria restava «ISTOLOGIA DIAGNOSTICA PER GCA» anche con una vasculite
   necrotizzante documentata, e solo il referto ne teneva conto. Ora la categoria viene
   dichiarata *subordinata a DD alternativa* — non cancellata: i criteri applicati
   restano quelli. (L'interfaccia già declassava il riquadro; il dato no.)
6. **L'avviso sul declassamento della frammentazione elastica isolata** era condizionato
   all'esecuzione della VVG, mentre il declassamento (3 pt / 2 pt) avviene comunque.
7. **readme**: lo score istologico non è «0-100, maggiori 25 pt».

### Scelte esplicite, non correzioni
- Le **dimensioni del campione non inserite** non declassano la categoria. È una lacuna
  di documentazione, non morfologica; declassare la diagnosi per un campo di metadati
  sarebbe lo stesso errore del punto 1. Restano dichiarate nel referto e nella categoria.
- Le **soglie** e i **pesi** non sono stati ricalibrati. Restano euristici e non validati,
  come la pagina dichiara.

### Infrastruttura
- Logica estratta in **`engine.js`**: nessun DOM, nessun JSX, eseguibile da Node. La
  pagina e i test percorrono la stessa identica funzione, `runCase()`.
- **`npm test`** → `tests/run.mjs`, 89 asserzioni, nessun framework. Oltre al
  comportamento, le invarianti strutturali: il motore non è duplicato nella pagina, ogni
  icona che il motore può emettere ha un componente in pagina, la versione è allineata a
  `package.json`, e `HISTO_MAX` è verificato per forza bruta contro il massimo davvero
  raggiungibile invece che dichiarato a mano.

### Aperto
- Campo «Lato» (destra/sinistra) della checklist di riferimento non portato nel referto: non è nel piano §3, da decidere.
- Revisioni: subagente Claude (non cross-model) e Codex con `gpt-6-sol` (il modello di default `gpt-6.1-sol` non è accettato dall'account ChatGPT).
In modalità «dati completi» la sola morfologia arriva al massimo a 81 × 0,6 = 49, contro
una soglia diagnostica di 70: senza almeno 46 punti clinici nessun quadro morfologico,
per quanto conclusivo, raggiunge la categoria diagnostica. Si può sostenere che sia
corretto — la GCA è diagnosi clinico-patologica e ACR/EULAR 2022 pone l'età ≥50 come
requisito di classificazione — ma allora la categoria non dovrebbe chiamarsi
«ISTOLOGIA (non) diagnostica», perché non è l'istologia a decidere. Da discutere.
