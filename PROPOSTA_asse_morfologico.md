# Proposta — asse morfologico «stato della lesione» (SCVP 2023)

Stato: **proposta (rev. 2: solo morfologia), nessuna modifica al motore.** Fonti: Nair et al., *Consensus statement on the processing, interpretation and reporting of temporal artery biopsy for arteritis*, Cardiovasc Pathol 2023 (`10.1016/j.carpath.2023.107574`); Taze et al., J Clin Pathol 2024;77:464 (Delphi UK). Di SCVP ho il testo integrale; del Delphi solo il testo principale, non il supplemento con i 67 statement.

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

### 2.2 Solo morfologia (rev. 2, su indicazione dell'utente)

I clinici spesso non forniscono dati; il referto deve reggersi sui reperti e la sintesi clinica la fa il clinico (è anche l'impostazione SCVP: il quesito della biopsia è se c'è arterite attiva). Quindi:

- **La categoria dipende solo dai reperti.** Esce il composito 60/40 e le tre modalità dei dati clinici; resta l'attuale regime «solo istologia» (soglie 55/40/20/10), che è già morfologico.
- Spariscono le categorie «… clinica suggestiva» (`non_diagnostica_clinica_suggestiva`, `aspecifica_clinica_suggestiva`, `compatibile_clinica_suggestiva`) e i testi sul «driver clinico».
- **I campi clinici restano, ma non entrano nel calcolo.** Servono come dati riportati nel referto («notizie cliniche fornite: …» / «non fornite») e per gli avvisi interpretativi: età <50, terapia steroidea con durata. La durata degli steroidi è per il Delphi il parametro clinico più importante, quindi la nota resta.
- **Pavimento:** se `morph = attiva`, la categoria non scende sotto `compatibile` (risolve T1).
- Il criterio `hasCoreCriteria` resta per «diagnostica» e «altamente suggestiva»; l'asse morfologico si affianca, non lo sostituisce.
- **Il dato primario del referto è la riga morfologica**; la categoria diventa un grado di concordanza morfologica, non una diagnosi di GCA. Risolve il punto aperto del changelog (in modalità completa la sola morfologia non poteva arrivare a «diagnostica»).
- Chiusura fissa del referto: «L'interpretazione nosologica (GCA o altra arterite) è demandata all'integrazione con il quadro clinico».

Cosa si perde, da sapere: un quadro morfologicamente negativo con clinica molto forte non può più uscire come «non diagnostico, clinica suggestiva»; resta negativo + nota su skip lesion e steroidi (già presente). È la conseguenza voluta.

### 2.3 Nomenclatura (scelta tua)

SCVP raccomanda «arterite attiva» come diagnosi principale ed evita «temporal arteritis» e, nella riga diagnostica, «GCA». Il referto oggi scrive «arterite a cellule giganti (GCA / arterite temporale di Horton)».
Proposta: opzione `nomenclatura: 'scvp' | 'classica'`; con `scvp` la riga principale è quella della tabella sopra e la compatibilità con GCA passa in commento («da integrare con il quadro clinico»). Con la scelta «solo morfologia» (§2.2) `scvp` diventa la scelta coerente: il referto non pone più la diagnosi nosologica. La tua preferenza prevale.

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
| D1 | Nomenclatura del referto: `scvp` o `classica` | `scvp` in riga principale, GCA in commento (ora più netta) |
| D2 | L'**infiltrato linfocitario** basta da solo a far dire «arterite attiva»? La voce oggi è «medio-intimale»; un infiltrato solo intimale non è media | sì, ma rinominare la voce in «Infiltrato infiammatorio nella media» |
| D3 | Pavimento `compatibile` quando `morph = attiva` | sì |
| D4 | `danno_guarito` solo descrittivo, soglia «≥2 reperti» | sì |
| D5 | Solo morfologia: eliminare composito e categorie «clinica suggestiva», tenendo i campi clinici come dati riportati e avvisi (§2.2) | sì (indicazione dell'utente, da confermare) |

D2 è il punto più delicato: con la regola attuale T3 (solo infiltrato linfocitario, 5 punti) diventa «arterite attiva» e sale a «compatibile».

## 4. Casi di test

Eseguibili con `node tests/proposta_scvp.mjs`. Il file **non è agganciato a `npm test`** e oggi segnala «non implementato», perché `morph` non esiste ancora. «Categoria oggi» è la chiave misurata sul motore.

| ID | Reperti | `morph` atteso | Categoria (oggi → proposta) | Altro atteso |
|---|---|---|---|---|
| T1 | transmurale + linfocitario, solo isto | `attiva` | `bassa_concordanza` → `compatibile` | |
| T2 | come T1 con dati clinici pieni | `attiva` | `non_diagnostica_clinica_suggestiva` → `compatibile` (identica a T1) | categoria indipendente dalla clinica |
| T3 | solo linfocitario (vedi D2) | `attiva` | `negativa` → `compatibile` | |
| T4 | sole cellule giganti | `giganti_senza_media` | `compatibile` (invariata) | avviso con «amiloid» |
| T5 | cellule giganti + transmurale | `attiva` | `compatibile` (invariata) | |
| T6 | solo avventiziale | `solo_avventiziale` | `negativa` (invariata) | raccomandazione con «livelli» |
| T7 | come T6 con dati clinici pieni | `solo_avventiziale` | `non_diagnostica_clinica_suggestiva` → `negativa` (identica a T6) | raccomandazione con «livelli» |
| T8 | intima + neovasc. + elastica focale | `danno_guarito` | `bassa_concordanza` (invariata) | referto con «danno arterioso guarito» e «arterite attiva» negata; niente «alterazioni infiammatorie» |
| T9 | solo ispessimento intimale | `negativa` | `negativa` (invariata) | commento sul verosimile significato età-correlato |
| T10 | nessun reperto | `negativa` | `negativa` (invariata) | commento sulle skip lesion |
| T11 | struttura arteriosa assente | `inadeguato` | `inadeguato` (invariata) | |
| T12 | transmurale + granulomatosa + vasculite necrotizzante | `attiva` | `compatibile` subordinata (invariata) | con `scvp` la riga principale **non** contiene «GCA/Horton/temporale» |
| T13 | quadro pieno con dati clinici pieni | `attiva` | `diagnostica` (invariata) | |

**Proprietà**, da verificare sulle 12 288 combinazioni già usate dalla suite:

- P1 `morph` **e categoria** sono identici al variare di modalità, dati clinici e steroidi (solo morfologia).
- P8 nessuna categoria contiene «clinica suggestiva» e il referto non contiene pesi 60/40 o 80/20.
- P2 `morph = attiva` implica categoria diversa da `negativa` e `bassa_concordanza`.
- P3 se `morph ≠ attiva`, la riga principale non dice «arterite attiva» (se non in forma negata).
- P4 con `nomenclatura = scvp`, la riga principale non contiene «GCA», «Horton» né «temporale».
- P5 ogni chiave di `morph` raggiungibile ha una riga principale e nessuna è senza uso.
- P6 `solo_avventiziale` implica una raccomandazione che cita i livelli aggiuntivi.
- P7 `danno_guarito` implica nessuna infiammazione della media e nessuna cellula gigante.

## 5. Impatto sul codice esistente

- Nuovo: calcolo di `morph` in `engine.js`, riga principale nel referto, opzione di nomenclatura, pavimento su `attiva`, avviso per `giganti_senza_media`, testi della §2.4.
- La pagina mostra `morph` come dato primario, sopra la categoria. D2 cambia l'etichetta di una voce.
- Con la rev. 2 si riducono le chiavi di categoria (da 9 a 6 raggiungibili) e l'esplorazione dei 12 288 casi si semplifica: i campi clinici non cambiano più l'esito.
- Test esistenti: stimo che si modifichino quelli sui pesi/modalità clinica, oltre a quelli che fissano i testi del referto («arterite a cellule giganti», skip lesion 10–15%, nota steroidi) e l'eventuale caso che assume `bassa_concordanza` per un quadro con infiltrato della media. Lo verifico al momento dell'implementazione, non prima.
- Versione: sarebbe una 3.8.0, con changelog.

## 6. Esempi di referto (template, stile SCVP tabella 3 adattato al reparto)

Sono template: misure, numero di livelli, gradi ed esiti delle colorazioni sono placeholder `[ ]` da compilare al vetro. Adattamento in italiano dello schema SCVP, non traduzione letterale.

**Intestazione comune**

- **Notizie cliniche:** [citazione del campo / non fornite]
- **Macroscopia:** segmento di arteria temporale [dx/sn] di [n] mm di lunghezza e [n] mm di diametro, incluso in toto e sezionato a intervalli di 1–2 mm dopo processazione.
- **Microscopia (metodo):** [n] livelli per sezione, colorazione EE e per le fibre elastiche ([VVG/Movat]).

### 6.1 Arterite attiva, con cellule giganti

- **Microscopia:** infiltrato linfoistiocitario che interessa la media, con [sede: giunzione intima-media / intero spessore], associato a cellule giganti multinucleate di tipo Langhans e a interruzioni della lamina elastica interna ([segmentarie/estese]). Ispessimento intimale [grado]. Infiltrato anche in avventizia e nel tessuto periavventiziale.
- **Diagnosi:** Arteria temporale [dx/sn], biopsia: segmento di arteria muscolare con arterite attiva.
- **Nota:** L'interpretazione nosologica (arterite a cellule giganti o altra arterite) è demandata all'integrazione con il quadro clinico.

### 6.2 Arterite attiva, senza cellule giganti

- **Microscopia:** infiltrato linfoistiocitario che interessa la media, [con/senza] interessamento intimale e avventiziale. Non si osservano cellule giganti. Lamina elastica interna: [integra / interrotta in modo segmentario].
- **Diagnosi:** Arteria temporale [dx/sn], biopsia: segmento di arteria muscolare con arterite attiva.
- **Nota:** L'assenza di cellule giganti non modifica la diagnosi: non sono necessarie. Interpretazione nosologica demandata all'integrazione con il quadro clinico.

Caso che il motore v3.7.0 classifica come «bassa concordanza» (T1).

### 6.3 Infiammazione limitata all'avventizia

- **Microscopia:** infiltrato infiammatorio cronico [focale/multifocale] nell'avventizia e nel tessuto periavventiziale, anche attorno ai vasa vasorum. La media non è interessata. Ulteriori livelli: [esito: invariato / evidenza di infiltrato nella media].
- **Diagnosi:** Arteria temporale [dx/sn], biopsia: segmento di arteria muscolare senza arterite attiva; infiltrato infiammatorio cronico limitato all'avventizia (vedi Nota).
- **Nota:** Il reperto è aspecifico e non costituisce di per sé arterite attiva; il suo significato è incerto. Data la segmentarietà della malattia, non si può escludere un coinvolgimento in altri tratti.

Se dopo i nuovi livelli compare l'infiltrato nella media, il referto diventa 6.1 o 6.2.

### 6.4 Reperti suggestivi di danno arterioso guarito

- **Microscopia:** ispessimento intimale fibrocellulare con deposizione di collagene, [interruzioni estese / perdita] della lamina elastica interna (colorazione elastica), fibrosi sostitutiva della media [presente/assente] (tricromica), [neovascolarizzazione], [ispessimento fibroso avventiziale]. Infiltrato infiammatorio [assente / scarso, avventiziale]. Non si osservano cellule giganti.
- **Diagnosi:** Arteria temporale [dx/sn], biopsia: segmento di arteria muscolare con reperti suggestivi di danno arterioso guarito; negativo per arterite attiva.
- **Nota:** Il quadro istologico induce a considerare, tra l'altro, anche un pregresso processo arteritico. Differenziale con esiti traumatici o iatrogeni e con alterazioni età-correlate: il significato clinico non è univoco.

### 6.5 Negativo, con ispessimento intimale

- **Microscopia:** ispessimento intimale concentrico senza infiammazione, con lamina elastica interna in gran parte conservata. Media e avventizia preservate. Non si repertano cellule giganti né infiltrato infiammatorio.
- **Diagnosi:** Arteria temporale [dx/sn], biopsia: segmento di arteria muscolare senza arterite attiva.
- **Nota:** L'ispessimento intimale è verosimilmente età-correlato. Data la segmentarietà dell'arterite, non si può escludere una skip lesion.

### 6.6 Cellule giganti senza arterite attiva

- **Microscopia:** cellule giganti multinucleate [sede], in assenza di infiltrato infiammatorio della media. [Materiale amorfo eosinofilo / calcificazione lungo la lamina elastica: presente/assente]. Rosso Congo: [positivo/negativo].
- **Diagnosi:** Arteria temporale [dx/sn], biopsia: segmento di arteria muscolare con cellule giganti in assenza di arterite attiva; [amiloide/calcificazione: presente/assente].
- **Nota:** Le cellule giganti sono presenti anche in amiloidosi e calcificazioni, e da sole non sono sufficienti per la diagnosi di arterite.

Punto aperto per i colleghi: in 6.2 l'infiltrato linfocitario nella media basta da solo? (decisione D2, §3).
