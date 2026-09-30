# Changelog — Checklist morfologico-clinica GCA

## Non rilasciato
- **Soglia di adeguatezza allineata alla pagina.** La pagina indica «ottimale ≥10 mm, minimo 6 sezioni», ma il motore dichiarava «adeguato» un frammento di 5–9 mm (soglia <5 mm). Ora «subottimale» = <10 mm o <6 sezioni. Nessun effetto su punteggio e categoria: cambiano solo badge e avviso.

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
In modalità «dati completi» la sola morfologia arriva al massimo a 81 × 0,6 = 49, contro
una soglia diagnostica di 70: senza almeno 46 punti clinici nessun quadro morfologico,
per quanto conclusivo, raggiunge la categoria diagnostica. Si può sostenere che sia
corretto — la GCA è diagnosi clinico-patologica e ACR/EULAR 2022 pone l'età ≥50 come
requisito di classificazione — ma allora la categoria non dovrebbe chiamarsi
«ISTOLOGIA (non) diagnostica», perché non è l'istologia a decidere. Da discutere.
