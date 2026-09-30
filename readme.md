# Checklist morfologico-clinica — Arterite a Cellule Giganti (GCA)

Griglia decisionale strutturata per la refertazione della biopsia dell'arteria temporale: reperti istologici, contesto clinico e coerenza interna dei dati inseriti.

> **È una griglia euristica, non uno score validato.** Non è un calcolatore dei criteri ACR/EULAR 2022 né uno score clinico-patologico pubblicato; pesi e soglie non sono stati validati prospetticamente. Le categorie sono qualitative e il numero composito è un indice orientativo, non una probabilità calibrata. La diagnosi resta responsabilità del patologo e del clinico refertante.

## Utilizzo

Aprire `index.html` in un browser moderno (anche da `file://`). Nessuna installazione, nessun server, nessuna rete: React, Babel e Tailwind sono in `vendor/`.

Gli altri file HTML/PDF sono materiale collegato, indipendente dal calcolatore: `flowchart_clinici.html`, `bigino_gca_clinici.html`, `richiesta_biopsia_temporale.html` (modulo di richiesta clinica, da cui `index.html` può importare i dati). Questi tre caricano i font IBM Plex da Google Fonts; offline ripiegano sul font di sistema.

## Struttura

| File | Ruolo |
|------|-------|
| `engine.js` | Tutta la logica (scoring, categorie, referto, raccomandazioni IHC). Nessun DOM, nessun JSX, eseguibile da Node |
| `index.html` | Interfaccia React; chiama `runCase()` di `engine.js`, non duplica la logica |
| `tests/run.mjs` | Suite di test (nessun framework) |
| `vendor/` | Dipendenze locali (React 18, Babel, Tailwind) |
| `CHANGELOG.md` | Storia delle modifiche e scelte di progetto |

## Input

| Sezione | Parametri |
|---------|-----------|
| **Dati clinici** | Età, VES, cefalea di nuova insorgenza, claudicatio mascellare, disturbi visivi, PCR elevata, halo sign, terapia steroidea (con durata) |
| **Adeguatezza campione** | Lunghezza (mm), n° sezioni, struttura arteriosa identificabile, colorazione elastica (VVG) |
| **Reperti maggiori** | Cellule giganti, infiammazione granulomatosa, frammentazione elastica diffusa (>30%), infiammazione transmurale |
| **Reperti minori** | Infiltrato linfocitario medio-intimale, ispessimento intimale, infiammazione avventiziale, neovascolarizzazione, frammentazione elastica focale (<30%) |
| **Reperti inattesi** | Cellule linfoidi atipiche, granulomi necrotizzanti, vasculite necrotizzante |
| **IHC eseguita** | CD68, CD4, CD8, CD3, CD20 |

## Output

- **Score istologico, 0–81.** Cellule giganti 22; granulomatosa 22 da sola, 11 se associata alle cellule giganti; frammentazione elastica diffusa 15; infiammazione transmurale 13; ciascun minore 5. Il massimo non è 100: frammentazione diffusa e focale descrivono la stessa lamina e si escludono (la compresenza è un'incoerenza bloccante). Senza infiltrato attivo la frammentazione elastica vale solo 3 pt (diffusa) o 2 pt (focale), con riserva.
- **Score clinico, 0–100** (raw 135, cappato): età ≥50 (+15) e ≥70 (+10), cefalea 20, claudicatio 25, disturbi visivi 20, VES ≥50 (+10) e ≥80 (+10), PCR 10, halo sign 15.
- **Composito**: somma pesata di istologico e clinico, con il massimo della modalità corrente dichiarato (es. `61/81` in «solo istologia»). Nessuna penalità numerica per gli steroidi: l'effetto è gestito come avviso interpretativo e nota nel referto.
- **Categoria**, scelta da composito, n° di reperti maggiori, presenza di un criterio «core» (cellule giganti e/o granulomatosa) e score clinico.
- **Referto** testuale editabile, con conclusione selezionata sulla chiave della categoria.
- **Raccomandazioni IHC** in base al quadro e ai marker già eseguiti.
- **Avvisi di coerenza**: incompatibilità logiche tra selezioni, che portano a «Valutazione non affidabile».

### Modalità dei dati clinici

La modalità segue i campi clinici effettivamente compilati (finché non la si fissa a mano). I campi non compilati contano come assenti.

| Modalità | Pesi istologico / clinico |
|----------|---------------------------|
| Completa | 60% / 40% |
| Parziale | 80% / 20% |
| Solo istologia | 100% / 0%, con soglie dedicate |

## Categorie

Soglie sul composito (euristiche, non calibrate). Con dati clinici (completa/parziale):

| Categoria | Condizione |
|-----------|-----------|
| Istologia diagnostica per GCA | ≥70 e ≥2 maggiori, incluso un core criterion |
| Altamente suggestivo | ≥55 e ≥1 maggiore (o ≥3 minori con score clinico ≥50). Se il composito è guidato dalla clinica diventa «compatibile — clinica altamente suggestiva», o «aspecifica — clinica suggestiva» se non c'è alcun maggiore |
| Istologia non diagnostica — clinica suggestiva | ≥40 e score clinico ≥40 |
| Bassa concordanza | ≥25 |
| Negativa / non conclusiva | <25 |

Solo istologia: diagnostica ≥55 (≥2 maggiori + core); altamente suggestiva ≥40 (≥1 maggiore); compatibile non diagnostica ≥20 (≥1 maggiore o ≥2 minori); bassa concordanza ≥10; negativa <10.

Casi speciali: campione privo di struttura arteriosa → **inadeguato** (nessuno score istologico); selezioni incompatibili → **valutazione non affidabile**; reperti inattesi → la categoria resta ma è dichiarata **subordinata a DD alternativa**.

Limite noto, aperto nel changelog: in modalità completa la sola morfologia arriva a 81 × 0,6 ≈ 49, sotto la soglia diagnostica di 70; senza almeno ~46 punti clinici nessun quadro istologico raggiunge la categoria diagnostica.

### Adeguatezza del campione

Struttura arteriosa identificabile (obbligatoria, altrimenti inadeguato). Campione **subottimale** se <5 mm o <6 sezioni; dimensioni non inserite → «non note» (dichiarato nel referto, non declassa la categoria). La VVG è raccomandata per documentare la frammentazione elastica; senza VVG la stima su EE è accettata con avviso.

## Test

```
npm test
```

89 asserzioni, inclusa l'esplorazione esaustiva di 12 288 combinazioni di reperti, modalità e dati clinici (nessuna categoria senza conclusione né con conclusione contraddittoria) e la verifica per forza bruta del massimo istologico.

## Fonti principali

- Ponte C, et al. **2022 ACR/EULAR classification criteria for GCA.** Arthritis Rheumatol 2022;74:1881–89 · Ann Rheum Dis 2022;81:1647–53
- Dejaco C, et al. **EULAR recommendations for imaging in large vessel vasculitis: 2023 update.**
- Hellmich B, et al. **2018 update of the EULAR recommendations for the management of large vessel vasculitis.** Ann Rheum Dis 2020

Bibliografia completa nel tool.

## Disclaimer

Strumento di supporto decisionale per uso interno in Anatomia Patologica. Non sostituisce il giudizio clinico-patologico: la diagnosi finale spetta al patologo refertante, integrata con il contesto clinico completo.
