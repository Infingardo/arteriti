# Piano di riallineamento al consensus SCVP 2023 — repo `arteriti`

Versione di destinazione: **v4.0.0** (cambio di impianto, non retrocompatibile negli output).
Fonte di riferimento: Nair V, Fishbein GA, Padera R, et al. *Consensus statement on the processing, interpretation and reporting of temporal artery biopsy for arteritis.* Cardiovasc Pathol 2023;67:107574. doi:10.1016/j.carpath.2023.107574.

Questo piano risponde alle regole di `CLAUDE.md`: il contenuto diagnostico cambia solo su indicazione di Filippo o da fonte citata; prima il piano, poi i test, poi il codice; `npm test` verde e revisione indipendente prima di chiudere; readme e changelog allineati.

---

## 1. Perché

Il motore attuale (v3.7.0) mescola morfologia e clinica in un punteggio composito, con cellule giganti e infiammazione granulomatosa come criteri «core». Il consensus SCVP 2023 dice altro:

| Punto | Consensus (sezione) | Motore attuale |
|---|---|---|
| Criterio diagnostico | Arterite attiva = infiammazione, di qualunque grado, che coinvolge la media; anche solo in un ramo (Tab. 1, rec. 3; §4.5) | Media infiammata = reperto minore da 5 punti; core = giganti / granulomatosa |
| Cellule giganti | Utili ma non necessarie; non sufficienti senza infiammazione della media (§4.5; §6.3) | 22 punti, criterio core |
| Clinica | La diagnosi istologica risponde a «arterite attiva sì/no»; la GCA è diagnosi clinica (§6.1) | Fino al 40% del composito: cambia la categoria istologica |
| Infiammazione solo avventiziale | Aspecifica, non è arterite attiva; impone livelli più profondi (§4.6) | +5 punti verso GCA |
| Frammentazione dell'elastica interna | Rotture focali o multifocali comuni anche senza arterite (§4.8) | Criterio maggiore (>30%), 15 punti |
| Esiti | «Healed arterial injury» → in italiano **esiti di danno arterioso**, con cautela (§4.8) | Categoria assente |
| Terminologia | Evitare «arterite temporale» e «arterite atipica»; preferire «arterite attiva» a «arterite a cellule giganti» (Tab. 1, rec. 4-6; §6.1) | Conclusione: «arterite a cellule giganti (GCA / arterite temporale di Horton)» |

Casi di prova sul motore v3.7.0, modalità indicata tra parentesi:

| Caso | Uscita v3.7.0 | Uscita attesa (consensus) |
|---|---|---|
| Infiammazione transmurale, senza giganti (solo istologia) | Bassa concordanza, alterazioni aspecifiche | Arterite attiva |
| Infiltrato linfocitario medio-intimale isolato (solo istologia) | Negativa / non conclusiva | Arterite attiva |
| Lo stesso, con clinica piena (completa) | Compatibile con GCA, non diagnostica | Arterite attiva |
| Solo infiammazione avventiziale, clinica piena (completa) | Compatibile con GCA | Senza arterite attiva; infiammazione extramediale |
| Frammentazione diffusa + ispessimento intimale + neovasi, senza infiltrato | Bassa concordanza | Aspetti suggestivi di esiti di danno arterioso |
| **Istologia del tutto negativa, clinica piena (completa)** | **«Il quadro istologico è compatibile con arterite a cellule giganti»** | Negativo per arterite |

L'ultimo caso è un difetto anche a prescindere dal consensus: un referto istologico che afferma compatibilità senza alcun reperto istologico.

---

## 2. Decisioni da confermare (Filippo)

Per ciascuna è indicata la mia preferenza. Tutto il resto del piano dipende da D1 e D2.

- **D1. Categoria solo morfologica.** La categoria e la conclusione dipendono esclusivamente dai reperti istologici. La clinica non può cambiarle. *Preferenza: sì (è il senso del consensus).*
- **D2. Punteggi.** Eliminare score istologico (0-81) e composito: il consensus non prevede score: decide un criterio qualitativo (la media infiammata), non una soglia di punteggio. La clinica resta come pannello di contesto, senza numero, per due usi: nota sul cortisone oltre 7 giorni e avviso età <50 anni (DD prioritaria). *Preferenza: eliminarli. Alternativa: tenere lo score clinico visibile ma separato, dichiarato euristico, senza effetto sulla categoria.*
- **D3. Terminologia del referto.** Diagnosi: «Arterite attiva» / «Segmento di arteria muscolare senza arterite attiva…» / «…con aspetti suggestivi di esiti di danno arterioso…» / «…negativo per arterite». Fuori dal referto: «arterite temporale», «Horton», «atipica», «GCA» come diagnosi. *Preferenza: sì; la classificazione GCA resta del clinico.*
- **D4. Adeguatezza.** Il consensus fissa il protocollo (in toto, sezioni trasversali a 1-2 mm, almeno 5 livelli, elastiche) ma non una lunghezza minima. *Preferenza: criterio principale «livelli ≥5»; la lunghezza resta come dato descritto, la soglia <10 mm solo come avviso informativo, citandone la fonte o togliendola.*
- **D5. Raccomandazioni cliniche nel referto** (eco-Doppler, PET-TC, biopsia controlaterale). Sono decisioni del clinico. *Preferenza: toglierle dal referto e lasciarle nel bigino per i clinici.*
- **D6. Cifre senza fonte nel codice** («skip lesion 10-15%», «variante senza giganti 20-30%», «sensibilità ridotta dopo 7-14 gg»). *Preferenza: sostituire con dati del consensus (biopsia bilaterale: discordanza 4,4-13% nelle serie, 5,5% nella revisione di 1935 casi; biopsia entro 7 giorni dall'inizio del cortisone) oppure togliere.*

---

## 3. Nuovo modello di input

| Area | Campi | Note |
|---|---|---|
| Adeguatezza | lunghezza (mm), livelli esaminati, incluso in toto (sì/no), elastiche (sì/no), livelli aggiuntivi (sì/no), struttura arteriosa identificabile (sì/no) | Struttura assente → inadeguato, come oggi |
| Intima | ispessimento fibroso (assente/presente + grado), infiltrato (assente/presente + grado) | |
| Elastica interna | conservata / frammentata-interrotta | Sostituisce diffusa >30% / focale <30% |
| Media | infiltrato (assente/presente + grado), istiociti epitelioidi, cellule giganti, necrosi fibrinoide, fibrosi sostitutiva (+ grado), eosinofili, plasmacellule | |
| Avventizia | infiltrato cronico (+ grado), vasa vasorum, ispessimento fibroso (+ grado), neovasi | |
| Calcificazioni | assenti / elastica interna / media / entrambe | |
| Rami collaterali | assenti / media indenne / media infiammata | Un solo campo: evita il difetto «ramo infiammato ignorato se non dichiarato presente» |
| DD | granulomi, neutrofili/microtrombi, materiale amorfo + rosso Congo, trombo/pseudoaneurisma, IgG4 IIC | |
| Segnali d'allarme | invariati: linfoidi atipiche intravascolari, granulomi necrotizzanti, vasculite necrotizzante | Restano: sono un punto forte |
| IIC eseguita | invariata | Raccomandazioni come supporto, mai come criterio |
| Clinica (contesto) | età, cortisone (giorni), altri campi solo descrittivi | Nessun effetto sulla categoria (D1) |

Stato a tre valori per ogni reperto: non valutato / assente / presente. Un campo non compilato non vale «assente» (oggi vale per la clinica: v. sezione test «una casella non spuntata non è una risposta negativa»).

---

## 4. Logica di classificazione

```
se struttura arteriosa assente            → INADEGUATO
se media infiammata (asse o ramo)          → A  arterite attiva
se infiltrato della media non valutato     → INCOMPLETO (nessuna conclusione)
se elastica interrotta e fibrosi media     → C  esiti di danno arterioso
se infiammazione intima/avventizia/vasa    → B  senza arterite attiva, infiammazione extramediale
se ispessimento intimale fibroso           → D  senza arterite attiva, fibrosi intimale
altrimenti                                 → E  negativo per arterite
segnali d'allarme presenti                 → categoria mantenuta ma subordinata alla DD (come oggi)
```

C prima di B: negli esiti l'infiammazione, se c'è, è scarsa e avventiziale (§4.8). In C con infiammazione extramediale compare una criticità che chiede livelli più profondi.

Note e criticità (separate dal testo diagnostico; le criticità non entrano nel referto copiato):

- **A + eosinofili / plasmacellule o IgG4+ / granulomi / necrosi fibrinoide / neutrofili** → Nota con «induce a considerare, tra l'altro, anche…» (EGPA, IgG4-RD, GPA, PAN, causa infettiva).
- **Giganti senza infiammazione della media** → criticità: non bastano per arterite attiva.
- **B senza livelli aggiuntivi** → criticità: eseguirli prima di chiudere.
- **Livelli <5**, **elastiche non eseguite**, **campione non in toto** → criticità di adeguatezza.
- **Materiale amorfo senza rosso Congo** → criticità; con rosso Congo positivo → «Depositi di amiloide» in diagnosi.
- **IgG4 positiva** → campi per conta IgG4+/HPF e rapporto IgG4/IgG (soglie >50/HPF e >40%, dalla Tab. 2 del consensus, criteri aortici).
- **Calcificazioni fuori da A** → Nota: spettro di Mönckeberg, non esiti di arterite.
- **Cortisone >7 giorni** → Nota «come da notizie cliniche».
- **Età <50** → avviso di DD (resta, è corretto).

Testi della diagnosi e della nota: quelli della check-list interattiva già rivista (A-E), che diventano la mappa `CONCLUSIONI` per chiave.

---

## 5. File da toccare

| File | Modifica |
|---|---|
| `engine.js` | Nuovo stato di input, `classify()` al posto di `calculateScore()` + `getDiagnosis()`, nuova mappa `CONCLUSIONI` (chiavi A-E, inadeguato, incompleto), `generateReferto()` riscritto (macro, micro, diagnosi, nota; criticità a parte). Restano `subordinaRedFlag`, segnali d'allarme, raccomandazioni IIC (testo rivisto) |
| `index.html` | Sezioni di input secondo §3; tolti barre e numeri dello score; pannello clinico separato e marcato «contesto, non entra nella diagnosi» |
| `tests/run.mjs` | Riscritto in buona parte: v. §6 |
| `readme.md` | Nuova descrizione (niente score, categorie A-E, fonte SCVP 2023) |
| `CHANGELOG.md` | Voce v4.0.0 con la tabella dei casi del §1 prima/dopo |
| `CLAUDE.md` + `AGENTS.md` | La descrizione «heuristic grid… composite number» non sarà più vera: aggiornarla in entrambi |
| `bigino_gca_clinici.html`, `richiesta_biopsia_temporale.html` | Materiale separato, da non accoppiare al motore. Passaggio a parte e facoltativo: «Horton», «skip lesion 10-15%», «7-14 giorni» da allineare a D3 e D6 |

---

## 6. Test

Almeno un input per ogni classe che cambia, più le invarianti.

**Per classe**
- A da media dell'asse; A da solo ramo (con criticità); A con ogni segnale DD (Nota corretta).
- B: avventizia sola; vasa vasorum soli; intima sola; con e senza livelli aggiuntivi.
- C: elastica interrotta + fibrosi media; C con infiammazione avventiziale (criticità, niente B).
- D: fibrosi intimale con elastica conservata.
- E: tutto assente; E con calcificazioni (Nota Mönckeberg); E con amiloide e rosso Congo positivo.
- Inadeguato; incompleto (media non valutata).
- I sei casi del §1 come test di regressione con l'uscita attesa.

**Invarianti (esplorazione esaustiva, come la suite attuale)**
1. La clinica non cambia mai la categoria: stessa istologia × tutte le combinazioni cliniche → stessa chiave.
2. Nessun reperto istologico presente → mai A, mai «compatibile».
3. Media infiammata (asse o ramo) → sempre A, salvo inadeguato.
4. Giganti senza media infiammata → mai A.
5. Ogni chiave raggiungibile ha una conclusione; nessuna voce morta nella mappa (test già presente, da adattare).
6. Il referto non contiene «arterite temporale», «Horton», «atipica»; «arterite a cellule giganti» non compare nella riga di diagnosi.
7. Le criticità non compaiono nel testo del referto.

**Da togliere o riscrivere:** «il composito dichiara la propria scala», «frammentazione elastica isolata» (punteggi 3/2), parti di «una casella non spuntata…» legate ai pesi clinici.

---

## 7. Sequenza di lavoro

1. Filippo conferma D1-D6.
2. Branch dedicato (es. `v4-consensus-scvp`).
3. Prima i test (§6), che falliscono sul motore v3.7.0: è la prova che misurano la cosa giusta.
4. Motore, poi interfaccia.
5. `npm test` verde.
6. Revisione indipendente contro questo piano e contro il consensus (`/verify-agent` in Claude Code, o passata separata in Codex).
7. Readme, changelog, CLAUDE.md e AGENTS.md allineati; controllo offline (pre-commit sul Mac).
8. Merge e pubblicazione.

---

## 8. Cosa può andare storto e chi può obiettare

- **Reumatologi e clinici** sono abituati a leggere «compatibile con GCA» o «positiva per GCA». «Arterite attiva» è più corretto ma va spiegato una volta: conviene una riga nel bigino per i clinici e un passaggio in riunione multidisciplinare. I criteri ACR/EULAR 2022 usano comunque la biopsia «positiva» come dato: «arterite attiva» è esattamente quel dato.
- **Colleghi** che apprezzavano l'integrazione clinica nel numero: il punto si recupera con il pannello clinico separato (D2, alternativa), che informa senza decidere.
- **Perdita dello storico**: referti emessi con v3.x restano scritti con la vecchia terminologia; il changelog deve dire da quale data vale la nuova.
- **Esiti di danno arterioso** restano la categoria più fragile (criteri non validati, scarsa riproducibilità secondo il consensus): la formula con «aspetti suggestivi» e la Nota prudente sono volute, non vanno «rafforzate» in seguito.
- **Rischio tecnico**: la riscrittura tocca motore, interfaccia e test insieme; senza i test scritti prima, è facile reintrodurre un difetto della stessa famiglia di quello corretto in v3.7.0.
