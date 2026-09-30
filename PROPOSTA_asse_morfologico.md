# Proposta — asse morfologico «stato della lesione» (SCVP 2023)

Stato: **proposta, nessuna modifica al motore.** Fonti: Nair et al., *Consensus statement on the processing, interpretation and reporting of temporal artery biopsy for arteritis*, Cardiovasc Pathol 2023 (`10.1016/j.carpath.2023.107574`); Taze et al., J Clin Pathol 2024;77:464 (Delphi UK). Di SCVP ho il testo integrale; del Delphi solo il testo principale, non il supplemento con i 67 statement.

## 1. Il problema, misurato sul motore v3.7.0

Solo istologia salvo dove indicato (lunghezza 15 mm, 10 sezioni, VVG eseguita).

| Caso | Punti | Categoria oggi | Secondo SCVP |
|---|---|---|---|
| T1 transmurale + linfocitario, **senza** cellule giganti | 18 | bassa concordanza | arterite attiva |
| T5 cellule giganti + transmurale | 35 | compatibile, non diagnostica | arterite attiva |
| T4 sole cellule giganti | 22 | compatibile | non sufficiente (amiloide, calcificazione) |
| T6/T7 sola infiammazione avventiziale | 5 | negativa / (clinica piena) non diagnostica, clinica suggestiva | aspecifica: altri livelli, non arterite attiva |
| T8 intima + neovasc. + elastica focale, nessuna infiammazione | 12 | bassa concordanza, con testo «alterazioni infiammatorie aspecifiche» | danno arterioso guarito (DD trauma/età/arteriosclerosi) |

Causa: il criterio «core» è *cellule giganti o granulomatosa*. SCVP definisce l'arterite attiva come infiltrato nella **media**; le cellule giganti non sono né necessarie né sufficienti. Nota a parte: in T8 il referto scrive «alterazioni infiammatorie» senza che nessuna infiammazione sia selezionata (testo di `bassa_concordanza`).

## 2. Proposta

### 2.1 Asse morfologico (nuovo, indipendente da clinica, modalità e steroidi)

Campo `morph` calcolato dai soli reperti, con questa precedenza:

| `morph` | Regola | Riga diagnostica (stile SCVP) |
|---|---|---|
| `inadeguato` | struttura arteriosa assente | non valutabile |
| `attiva` | interessamento della media: **transmurale** OR **granulomatosa** OR **infiltrato linfocitario** | segmento di arteria muscolare con **arterite attiva** |
| `giganti_senza_media` | cellule giganti senza interessamento della media | **non soddisfa i criteri di arterite attiva**; vedere commento (Rosso Congo, calcificazione, reazione da corpo estraneo) |
| `solo_avventiziale` | solo infiammazione avventiziale/periavventiziale | **senza arterite attiva**; infiltrato avventiziale aspecifico, da sottoporre a ulteriori livelli |
| `danno_guarito` | nessuna infiammazione della media, nessuna cellula gigante, **≥2** fra ispessimento intimale, neovascolarizzazione, frammentazione elastica | **negativo per arterite attiva**; reperti suggestivi di danno arterioso guarito (DD: trauma, invecchiamento, arteriosclerosi) |
| `negativa` | nessuno dei precedenti | segmento di arteria muscolare negativo per arterite |

Il danno guarito è **descrittivo, senza punteggio**: SCVP segnala assenza di criteri universali, errore con arteriosclerosi fra il 6 e il 64% e riproducibilità scarsa.

### 2.2 Rapporto con le categorie attuali

- **Punteggi e soglie non si toccano** (stessa linea del changelog: dichiarare, non spostare i pali).
- **Pavimento:** se `morph = attiva`, la categoria non può essere inferiore a `compatibile`. Risolve T1 (da bassa concordanza a compatibile) e mantiene coerenti i due livelli.
- Il criterio `hasCoreCriteria` resta per «diagnostica» e «altamente suggestiva»; l'asse morfologico si affianca, non lo sostituisce.
- Le categorie diventano «integrazione clinico-patologica orientativa»; la **riga morfologica è il dato primario** del referto. Questo attenua il punto aperto del changelog (in modalità completa la categoria dipende dalla clinica).

### 2.3 Nomenclatura (scelta tua)

SCVP raccomanda «arterite attiva» come diagnosi principale ed evita «temporal arteritis» e, nella riga diagnostica, «GCA». Il referto oggi scrive «arterite a cellule giganti (GCA / arterite temporale di Horton)».
Proposta: opzione `nomenclatura: 'scvp' | 'classica'`; con `scvp` la riga principale è quella della tabella sopra e la compatibilità con GCA passa in commento («da integrare con il quadro clinico»). Consiglio `scvp` come impostazione del referto, perché separa morfologia e nosologia; la tua preferenza prevale.

### 2.4 Testi e correzioni minori

- **Solo avventiziale:** la raccomandazione comincia con «non è arterite attiva; eseguire ulteriori livelli (≥5 per sezione); se invariata, riportare in commento». Sostituisce, come prima voce, l'invito a eco-Doppler/PET.
- **Cellule giganti senza media:** avviso di validazione (livello *warning*).
- **Nota steroidi:** togliere «in misura significativa»; citare la finestra ≤7 giorni (SCVP) e la persistenza dell'infiammazione (71% a 3 mesi, 25% a 1 anno).
- **Skip lesion:** «~10–15%» → «~5–13% di discordanza fra biopsie bilaterali» (SCVP: 4,4–13%, media 5,5%).
- **Diagnosi differenziale:** aggiungere amiloidosi (Rosso Congo), calcificazione, IgG4 (>50 plasmacellule/HPF, IgG4/IgG >40%, criteri da aorta).
- **Testo di `bassa_concordanza`:** non parlare di «alterazioni infiammatorie» se non ce ne sono (T8).

### 2.5 Fuori da questa proposta (fase 2, solo referto, senza punteggio)

Dal Delphi UK: fibrosi, occlusione luminale, presenza/assenza di iperplasia intimale, estensione dell'infiltrato, pattern di Hernández-Rodríguez. Da valutare con il supplemento del Delphi.

## 3. Decisioni che servono da te

| # | Decisione | Mia preferenza |
|---|---|---|
| D1 | Nomenclatura del referto: `scvp` o `classica` | `scvp` in riga principale, GCA in commento |
| D2 | L'**infiltrato linfocitario** basta da solo a far dire «arterite attiva»? La voce oggi è «medio-intimale»; un infiltrato solo intimale non è media | sì, ma rinominare la voce in «Infiltrato infiammatorio nella media» |
| D3 | Pavimento `compatibile` quando `morph = attiva` | sì |
| D4 | `danno_guarito` solo descrittivo, soglia «≥2 reperti» | sì |

D2 è il punto più delicato: con la regola attuale T3 (solo infiltrato linfocitario, 5 punti) diventa «arterite attiva» e sale a «compatibile».

## 4. Casi di test

Eseguibili con `node tests/proposta_scvp.mjs`. Il file **non è agganciato a `npm test`** e oggi segnala «non implementato», perché `morph` non esiste ancora. «Categoria» è la chiave attuale del motore, misurata.

| ID | Reperti | `morph` atteso | Categoria (oggi → proposta) | Altro atteso |
|---|---|---|---|---|
| T1 | transmurale + linfocitario, solo isto | `attiva` | `bassa_concordanza` → `compatibile` | |
| T2 | come T1, modalità completa, clinica piena | `attiva` | `non_diagnostica_clinica_suggestiva` (invariata) | |
| T3 | solo linfocitario (vedi D2) | `attiva` | `negativa` → `compatibile` | |
| T4 | sole cellule giganti | `giganti_senza_media` | `compatibile` (invariata) | avviso con «amiloid» |
| T5 | cellule giganti + transmurale | `attiva` | `compatibile` (invariata) | |
| T6 | solo avventiziale | `solo_avventiziale` | `negativa` (invariata) | raccomandazione con «livelli» |
| T7 | come T6, modalità completa, clinica piena | `solo_avventiziale` | `non_diagnostica_clinica_suggestiva` (invariata) | raccomandazione con «livelli» |
| T8 | intima + neovasc. + elastica focale | `danno_guarito` | `bassa_concordanza` (invariata) | referto con «danno arterioso guarito» e «arterite attiva» negata; niente «alterazioni infiammatorie» |
| T9 | solo ispessimento intimale | `negativa` | `negativa` (invariata) | commento sul verosimile significato età-correlato |
| T10 | nessun reperto | `negativa` | `negativa` (invariata) | commento sulle skip lesion |
| T11 | struttura arteriosa assente | `inadeguato` | `inadeguato` (invariata) | |
| T12 | transmurale + granulomatosa + vasculite necrotizzante | `attiva` | `compatibile` subordinata (invariata) | con `scvp` la riga principale **non** contiene «GCA/Horton/temporale» |
| T13 | quadro pieno, modalità completa, clinica piena | `attiva` | `diagnostica` (invariata) | |

**Proprietà**, da verificare sulle 12 288 combinazioni già usate dalla suite:

- P1 `morph` è identico al variare di modalità, dati clinici e steroidi.
- P2 `morph = attiva` implica categoria diversa da `negativa` e `bassa_concordanza`.
- P3 se `morph ≠ attiva`, la riga principale non dice «arterite attiva» (se non in forma negata).
- P4 con `nomenclatura = scvp`, la riga principale non contiene «GCA», «Horton» né «temporale».
- P5 ogni chiave di `morph` raggiungibile ha una riga principale e nessuna è senza uso.
- P6 `solo_avventiziale` implica una raccomandazione che cita i livelli aggiuntivi.
- P7 `danno_guarito` implica nessuna infiammazione della media e nessuna cellula gigante.

## 5. Impatto sul codice esistente

- Nuovo: calcolo di `morph` in `engine.js`, riga principale nel referto, opzione di nomenclatura, pavimento su `attiva`, avviso per `giganti_senza_media`, testi della §2.4.
- La pagina mostra `morph` come dato primario, sopra la categoria. D2 cambia l'etichetta di una voce.
- Test esistenti: stimo che si modifichino solo quelli che fissano i testi del referto («arterite a cellule giganti», skip lesion 10–15%, nota steroidi) e l'eventuale caso che assume `bassa_concordanza` per un quadro con infiltrato della media. Lo verifico al momento dell'implementazione, non prima.
- Versione: sarebbe una 3.8.0, con changelog.
