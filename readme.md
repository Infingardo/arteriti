# Checklist per la biopsia dell'arteria temporale

Classificazione qualitativa dei reperti istologici della biopsia dell'arteria temporale, allineata al consensus SCVP 2023: Nair V, Fishbein GA, Padera R, et al. *Consensus statement on the processing, interpretation and reporting of temporal artery biopsy for arteritis.* Cardiovasc Pathol 2023;67:107574 (doi:10.1016/j.carpath.2023.107574).

> **Nessun punteggio.** La categoria dipende solo dai reperti istologici inseriti. La clinica è contesto e non la modifica mai. La classificazione come arterite a cellule giganti resta una decisione clinica. Non è un calcolatore dei criteri ACR/EULAR 2022. La diagnosi resta responsabilità del patologo refertante.

## Utilizzo

Aprire `index.html` in un browser moderno (anche da `file://`). Nessuna installazione, nessun server, nessuna rete: React, Babel e Tailwind sono in `vendor/`.

Gli altri file HTML/PDF sono materiale collegato, indipendente dal calcolatore: `flowchart_clinici.html`, `bigino_gca_clinici.html`, `richiesta_biopsia_temporale.html` (modulo di richiesta clinica, da cui `index.html` può importare i dati). Non sono ancora allineati alla v4 (terminologia e cifre): vanno aggiornati in un passaggio separato. I tre caricano i font IBM Plex da Google Fonts; offline ripiegano sul font di sistema.

## Struttura

| File | Ruolo |
|------|-------|
| `engine.js` | Tutta la logica (classificazione, criticità, referto, suggerimenti IHC). Nessun DOM, nessun JSX, eseguibile da Node |
| `index.html` | Interfaccia React; chiama `runCase()` di `engine.js`, non duplica la logica |
| `tests/run.mjs` | Suite di test (nessun framework) |
| `vendor/` | Dipendenze locali (React 18, Babel, Tailwind) |
| `docs/PIANO_riallineamento_consensus_SCVP2023.md` | Piano e decisioni D1-D6 del riallineamento |
| `CHANGELOG.md` | Storia delle modifiche e scelte di progetto |

## Input

Ogni reperto ha tre stati: **non valutato / assente / presente**. Un campo non compilato non vale «assente»; i campi non valutati sono omessi dal referto.

| Sezione | Campi |
|---------|-------|
| Adeguatezza | lunghezza (mm), livelli esaminati, struttura arteriosa identificabile, incluso in toto, colorazione per le elastiche, livelli aggiuntivi |
| Media | infiltrato (+ grado), istiociti epitelioidi, cellule giganti, necrosi fibrinoide, fibrosi sostitutiva (+ grado), eosinofili, plasmacellule; rami collaterali (assenti / media indenne / media infiammata) |
| Intima, elastica interna | ispessimento fibroso (+ grado), infiltrato (+ grado); elastica conservata o frammentata/interrotta; calcificazioni |
| Avventizia | infiltrato cronico (+ grado), vasa vasorum, ispessimento fibroso (+ grado), neovasi |
| Diagnosi differenziale | granulomi, neutrofili/microtrombi, materiale amorfo + Congo red, trombo/pseudoaneurisma, IgG4 (conta e rapporto) |
| Segnali d'allarme | cellule linfoidi atipiche intravascolari, granulomi necrotizzanti, vasculite necrotizzante |
| IHC eseguita | CD68, CD4, CD8, CD3, CD20 |
| Contesto clinico | età, cortisone (e giorni), VES, PCR, sintomi, halo sign: **non entrano nella diagnosi** |

## Classificazione

```
struttura arteriosa assente                 → inadeguato
media infiammata (asse o ramo collaterale)  → A  Arterite attiva
infiltrato della media non valutato         → incompleto (nessuna conclusione)
elastica interrotta + fibrosi della media   → C  aspetti suggestivi di esiti di danno arterioso
infiammazione intimale/avventiziale/vasa    → B  senza arterite attiva, infiammazione extramediale
ispessimento intimale fibroso               → D  senza arterite attiva, fibrosi intimale
altrimenti                                  → E  negativo per arterite
```

- **A** vale con o senza cellule giganti; le cellule giganti senza infiammazione della media non bastano (criticità).
- **C** precede B: negli esiti l'infiammazione, se c'è, è scarsa e avventiziale; con infiammazione extramediale compare una criticità (livelli più profondi). È la categoria più fragile (criteri non validati, scarsa riproducibilità secondo il consensus): la formula prudente è voluta.
- **Segnali d'allarme**: la categoria resta, ma è dichiarata subordinata all'esclusione dei pattern alternativi.
- **IHC**: supporto, mai criterio; non cambiano la categoria.

## Output

- **Referto** (editabile): Macroscopia, Microscopia, Diagnosi, Nota. Senza raccomandazioni cliniche e senza cifre senza fonte.
- **Nota**: DD da considerare in A (eosinofili, plasmacellule/IgG4, granulomi, necrosi fibrinoide, neutrofili); spettro di Mönckeberg per le calcificazioni fuori da A; cortisone oltre 7 giorni «come da notizie cliniche».
- **Criticità**, **avvisi** (età <50 anni: DD prioritaria) e **suggerimenti IHC**: mostrati a parte, mai nel testo copiato.
- **Adeguatezza**: protocollo del consensus (in toto, sezioni a 1-2 mm, almeno 5 livelli, elastiche). Non conforme → criticità, mai un cambio di categoria. La lunghezza è un dato descritto, senza soglia.

### Dati del consensus citati nei documenti (non nel referto)
Discordanza fra biopsie bilaterali 4,4-13% nelle serie e 5,5% nella revisione di 1935 casi; biopsia entro 7 giorni dall'inizio del cortisone (dal piano di riallineamento, che li riporta dal consensus).

## Test

```
npm test
```

226 asserzioni. La classificazione è confrontata con la regola del §4 del piano (riscritta nel test, senza riusare il motore) su 2 125 764 combinazioni di reperti, rami, elastica interna e struttura. Su tutto lo spazio la clinica (cinque profili) non cambia categoria né riga di diagnosi. Su un campione di 92 451 casi con referto completo (che varia anche DD, calcificazioni, IgG4, Congo red, segnali d'allarme, adeguatezza, cortisone, età) si verifica che: la clinica non cambia i suggerimenti IHC; nessun reperto → mai A né «compatibile»; nessun termine vietato né raccomandazione clinica nel referto; le criticità non compaiono nel testo. Invarianti sull'intero spazio: media infiammata (asse o ramo) → sempre A salvo inadeguato; giganti senza media infiammata → mai A; nessuna voce morta in `CONCLUSIONI`. Il test è stato provato con mutazioni del motore (C senza elastica, D prima di B, soglia età, cortisone, stati non valutati scritti come presenti): tutte intercettate.

## Fonti principali

- Nair V, Fishbein GA, Padera R, et al. **Consensus statement on the processing, interpretation and reporting of temporal artery biopsy for arteritis.** Cardiovasc Pathol 2023;67:107574
- Ponte C, et al. **2022 ACR/EULAR classification criteria for GCA.** Arthritis Rheumatol 2022;74:1881–89 · Ann Rheum Dis 2022;81:1647–53
- Dejaco C, et al. **EULAR recommendations for imaging in large vessel vasculitis: 2023 update.**
- Hellmich B, et al. **2018 update of the EULAR recommendations for the management of large vessel vasculitis.** Ann Rheum Dis 2020

Bibliografia completa nel tool.

## Disclaimer

Strumento di supporto decisionale per uso interno in Anatomia Patologica. Non sostituisce il giudizio clinico-patologico: la diagnosi finale spetta al patologo refertante, integrata con il contesto clinico completo.
