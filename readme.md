# GCA Diagnostic Scoring Tool

Algoritmo diagnostico integrato per **Arterite a Cellule Giganti (GCA)** — biopsia dell'arteria temporale.

## Scopo

Tool di supporto decisionale per la refertazione di biopsie temporali sospette per GCA. Integra dati istologici, contesto clinico e raccomandazioni IHC in uno scoring composito.

**Non sostituisce il giudizio clinico-patologico.**

## Utilizzo

Aprire `index.html` in un browser moderno. Nessuna installazione richiesta.

## Funzionalità

### Input

| Sezione | Parametri |
|---------|-----------|
| **Adeguatezza campione** | Lunghezza (mm), n° sezioni, struttura arteriosa, colorazione elastica |
| **Reperti maggiori** | Cellule giganti, infiammazione granulomatosa, frammentazione elastica diffusa, infiammazione transmurale |
| **Reperti minori** | Infiltrato linfocitario CD4+, ispessimento intimale, infiammazione avventiziale, neovascolarizzazione, frammentazione elastica focale |
| **Dati clinici** | Età, VES, cefalea, claudicatio mascellare, disturbi visivi, PCR, halo sign, terapia steroidea |
| **IHC eseguita** | CD68, CD4, CD8, CD3, CD20 |

### Output

- **Score istologico** (0-100): reperti maggiori 25 pt, minori 5 pt
- **Score clinico** (0-100): criteri ACR/EULAR pesati
- **Score composito**: 60% isto + 40% clinico − penalità steroidi
- **Categoria diagnostica**: Diagnostico / Altamente suggestivo / Compatibile / Sospetto basso / Negativo / Non valutabile
- **Raccomandazioni IHC**: marker suggeriti in base al quadro

## Metodologia

### Pesi scoring

| Categoria | Peso | Razionale |
|-----------|------|-----------|
| Reperti maggiori | 25 pt | Specificità >90% |
| Reperti minori | 5 pt | Aumentano sensibilità |
| Score composito | 60% isto / 40% clinico | Bilancia dati oggettivi e contesto |
| Penalità steroidi | -10 a -30 pt | Riduzione sensibilità documentata |

### Soglie diagnostiche

| Score | Categoria | Probabilità |
|-------|-----------|-------------|
| ≥70 + ≥2 maggiori | Diagnostico | >95% |
| ≥55 + ≥1 maggiore | Altamente suggestivo | 75-95% |
| ≥40 + score clinico ≥40 | Compatibile | 50-75% |
| ≥25 | Sospetto basso | 25-50% |
| <25 | Negativo | <25% |

### Criteri adeguatezza

- Lunghezza ≥10 mm (ottimale 15-20 mm)
- ≥10 sezioni (raccomandato ≥15)
- Struttura arteriosa identificabile
- Colorazione elastica eseguita

## Fonti principali

- **ACR/EULAR 2023**: Criteri classificativi GCA (Ponte et al., Arthritis Rheumatol 2024)
- **EULAR 2023**: Raccomandazioni imaging vasculiti grandi vasi (Dejaco et al., Ann Rheum Dis 2023)
- **Ciccia et al. 2023**: Meta-analisi caratterizzazione istopatologica (Semin Arthritis Rheum)
- **Ing et al. 2023**: Sensibilità bioptica sotto steroidi (J Neuroophthalmol)

Bibliografia completa nel tool.

## Note tecniche

- HTML5 + React 18 + Tailwind CSS (CDN)
- Zero dipendenze server-side
- Funziona offline dopo il primo caricamento
- Testato su Chrome, Firefox, Safari, Edge

### Warning Tailwind

```
Warning: cdn.tailwindcss.com should not be used in production
```

Ignorabile per tool standalone. Non impatta funzionalità.

## Changelog

| Versione | Data | Modifiche |
|----------|------|-----------|
| 1.0.2 | 2024-12 | Fix score composito cappato a 100; validazione esplicita NaN su età/VES; aggiunto min="0" agli input numerici |
| 1.0.1 | 2024-12 | Fix validazione campi numerici vuoti; ottimizzazione calcolo IHC recommendations |
| 1.0.0 | 2024-10 | Release iniziale |

## Autore

Sviluppato per uso interno — Anatomia Patologica.

## Disclaimer

Strumento di supporto decisionale. La diagnosi finale rimane responsabilità del patologo refertante, integrata con il contesto clinico completo. I punteggi e le probabilità sono stime basate su dati di letteratura e non sostituiscono la valutazione esperta.
