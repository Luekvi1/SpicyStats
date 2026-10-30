// SpicyStats v3 – lokale Hör-Analytics für Spicetify (ohne KI, ohne Server, alles lokal)
(function SpicyStats() {
  if (!window.Spicetify || !Spicetify.Player || !Spicetify.PopupModal) return setTimeout(SpicyStats, 300);
  if (window.__spicystatsLoaded) return;
  window.__spicystatsLoaded = true;
  // Alte Version (spiceitify.js) noch aktiv? Dann kollidiert sie mit dieser Datei.
  if (window.__spiceitifyLoaded) setTimeout(() => { try { Spicetify.showNotification("SpicyStats: Die alte Datei spiceitify.js ist noch aktiv – bitte entfernen (spicetify config extensions spiceitify.js-)", true); } catch {} }, 2500);

  /* ====================================================================
   *  Konstanten & Einstellungen
   * ==================================================================== */
  const SKEY = "spiceitify.settings", PKEY = "spiceitify.plays", V = 3, MAXPLAYS = 15000, DAY = 864e5;
  const RANGES = { "24h": 1, "7d": 7, "30d": 30, "90d": 90, "6m": 183, "12m": 365, all: 0 };
  const SECTIONS = ["overview", "trends", "artists", "tracks", "albums", "playlists", "history", "achievements", "settings"];
  const ACCENTS = ["#1db954", "#0a84ff", "#bf5af2", "#ff375f", "#ff9f0a", "#ff453a", "#64d2ff"];
  const PAL = ["var(--si-accent)", "#0a84ff", "#ff9f0a", "#bf5af2", "#ff375f", "#64d2ff", "#ffd60a", "#8e8e93"];

  const DEF = () => ({
    schemaVersion: V, theme: "dark", accent: "#1db954", language: "de", compact: false, animate: true,
    lastSection: "overview", range: "30d", chartType: "area", topN: 10, showGrid: true, showLegend: true,
    compare: true, dailyGoal: 60, tracking: true, minPlaySec: 2,
  });
  const oneOf = (v, a, d) => (a.includes(v) ? v : d);
  const bool = (v, d) => (typeof v === "boolean" ? v : d);
  const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  const pick = (...a) => a.find(x => x !== undefined);
  function validate(raw) {
    const d = DEF(), r = obj(raw), db = obj(r.dashboard), pv = obj(r.privacy), s = d;
    s.theme = oneOf(r.theme, ["dark", "light", "amoled"], d.theme);
    s.accent = typeof r.accent === "string" && /^#[0-9a-f]{6}$/i.test(r.accent) ? r.accent.toLowerCase() : d.accent;
    s.language = oneOf(r.language, ["de", "en", "it"], d.language);
    s.compact = bool(r.compact, false);
    s.animate = bool(pick(r.animate, db.animateCharts), true);
    s.lastSection = oneOf(r.lastSection === "listening" ? "trends" : r.lastSection, SECTIONS, "overview");
    s.range = oneOf(pick(r.range, db.defaultTimeRange), Object.keys(RANGES), "30d");
    s.chartType = oneOf(pick(r.chartType, db.preferredChartType), ["area", "line", "bar"], "area");
    s.topN = oneOf(Number(pick(r.topN, db.topN)), [5, 10, 20], 10);
    s.showGrid = bool(pick(r.showGrid, db.showGrid), true);
    s.showLegend = bool(pick(r.showLegend, db.showLegend), true);
    s.compare = bool(r.compare, true);
    const g = Number(r.dailyGoal);
    s.dailyGoal = Number.isFinite(g) ? Math.min(600, Math.max(5, Math.round(g))) : 60;
    s.tracking = bool(pick(r.tracking, pv.analyticsEnabled), true);
    s.minPlaySec = oneOf(Number(r.minPlaySec), [2, 10, 30], 2);
    return s;
  }
  let storageOk = true;
  function loadSettings() { try { const x = localStorage.getItem(SKEY); return x ? validate(JSON.parse(x)) : DEF(); } catch { return DEF(); } }
  const S = loadSettings();
  function save() { try { localStorage.setItem(SKEY, JSON.stringify(S)); storageOk = true; } catch { storageOk = false; } }
  save();

  /* ====================================================================
   *  Übersetzungen (de / en / it)
   * ==================================================================== */
  const L = {
    de: {
      nav_overview: "Übersicht", nav_trends: "Trends", nav_artists: "Künstler", nav_tracks: "Tracks", nav_albums: "Alben",
      nav_playlists: "Playlists", nav_history: "Verlauf", nav_achievements: "Erfolge", nav_settings: "Einstellungen",
      r_24h: "24 Std.", r_7d: "7 Tage", r_30d: "30 Tage", r_90d: "90 Tage", r_6m: "6 Mon.", r_12m: "12 Mon.", r_all: "Gesamt",
      noData: "Noch keine Hördaten. Sie werden ab jetzt in Echtzeit erfasst – oder importiere deinen Spotify-Export unter Einstellungen.",
      noDataShort: "Keine Daten im Zeitraum.", unkTrack: "Unbekannter Titel", unkArtist: "Unbekannter Künstler", others: "Sonstige",
      nowPlaying: "Jetzt läuft", idle: "Gerade läuft nichts.", paused: "Pausiert", listened: "Gehört", thisTrack: "{n}× in diesem Zeitraum gehört",
      kTime: "Hörzeit", kPlays: "Wiedergaben", kArtists: "Künstler", kTracks: "Tracks", kDays: "Aktive Tage", kAvg: "Ø pro aktivem Tag",
      kStreak: "Streak", kSkip: "Skip-Rate", kSessions: "Sessions", kSesAvg: "Ø Session", kSesMax: "Längste Session", kBest: "Rekord: {n} Tage",
      kBestDay: "Stärkster Tag", dayUnit: "Tage", vsPrev: "ggü. Vorperiode",
      goal: "Tagesziel", goalDone: "Ziel erreicht", goalLeft: "Noch {n} bis zum Ziel", goalOf: "von {n}", goalDays: "{n} Tage Ziel erreicht",
      insights: "Insights", insNone: "Sammle ein paar Hördaten – dann erscheinen hier automatisch Insights.",
      insPeak: "Du hörst am liebsten am {wd} gegen {h} Uhr.", insTop: "{a} macht {p}% deiner Hörzeit aus.",
      insNew: "{n} neue Künstler entdeckt.", insSkip: "Du überspringst {p}% aller Tracks.", insUp: "Deine Hörzeit liegt {p}% über der Vorperiode.",
      insDown: "Deine Hörzeit liegt {p}% unter der Vorperiode.", insNight: "Nachteule: {p}% deiner Wiedergaben laufen nach 22 Uhr.",
      insEarly: "Frühaufsteher: {p}% deiner Wiedergaben laufen vor 9 Uhr.", insLoyal: "„{t}“ lief {n}× – dein meistgehörter Track.",
      insSession: "Deine längste Session dauerte {d}.",
      cTrend: "Höraktivität", cWeekday: "Nach Wochentag", cHour: "Nach Tageszeit", cMonth: "Monatsvergleich", cHeat: "Wochentag × Uhrzeit",
      cCal: "Aktivitätskalender", cArtists: "Top Künstler", cDist: "Künstlerverteilung", cDiscover: "Neu entdeckt", cTracks: "Top Tracks",
      cSkipped: "Meist übersprungen", cAlbums: "Top Alben", cPlaylists: "Top Playlists", cSpot: "Spotify Top (offiziell)", cGenres: "Genres (Spotify)",
      cSessions: "Sessions", sortTime: "Zeit", sortPlays: "Wiedergaben", showAll: "Alle anzeigen", weekOf: "Woche ab {d}", discoverHint: "Entdeckungen brauchen etwas Verlauf vor dem Zeitraum.",
      ctArea: "Fläche", ctLine: "Linie", ctBar: "Balken", search: "Suche nach Titel, Künstler oder Album …", more: "Mehr laden",
      nothingFound: "Nichts gefunden.", today: "Heute", yesterday: "Gestern", skip: "Skip", live: "Live", del: "Eintrag löschen",
      playlistHint: "Playlist-Wiedergaben werden ab jetzt erfasst.", spotFetch: "Abrufen", spotErr: "API-Fehler: {e}", spotHint: "Ruft deine offiziellen Spotify-Tops ab.",
      term_short_term: "4 Wochen", term_medium_term: "6 Monate", term_long_term: "Gesamt",
      achUnlocked: "{a} von {b} Erfolgen freigeschaltet", achStreak: "Aktueller Streak",
      b0: "Warmlaufen", b1: "Stammhörer", b2: "Legende", b3: "Reinhören", b4: "Dauerbeschallung", b5: "Audiophil", b6: "Wochenläufer",
      b7: "Monatsmarathon", b8: "Unaufhaltsam", b9: "Weltenbummler", b10: "Nachteule", b11: "Frühaufsteher", b12: "Treue Seele", b13: "Marathon", b14: "Zielstrebig",
      d_plays: "{n} Wiedergaben", d_hours: "{n} Stunden gehört", d_streak: "{n} Tage in Folge", d_artists: "{n} verschiedene Künstler",
      d_night: "{n} Wiedergaben zwischen 0 und 5 Uhr", d_early: "{n} Wiedergaben zwischen 5 und 8 Uhr", d_loyal: "Einen Track {n}× gehört",
      d_marathon: "{n} Min. Hör-Session", d_goal: "{n} Tage Tagesziel erreicht",
      sAppear: "Darstellung", sTheme: "Design", thDark: "Dunkel", thLight: "Hell", thAmoled: "AMOLED", sAccent: "Akzentfarbe", sLang: "Sprache",
      sCompact: "Kompakte Ansicht", sAnim: "Animationen", sDash: "Dashboard", sRange: "Standard-Zeitraum", sTopN: "Einträge in Toplisten",
      sChartType: "Diagrammtyp", sGrid: "Gitterlinien", sLegend: "Legende", sCompare: "Vorperiode vergleichen", sGoals: "Ziele",
      sGoal: "Tagesziel (Minuten)", sTracking: "Tracking", sTrackOn: "Hörverlauf aufzeichnen", sMinPlay: "Mindest-Hördauer (Sek.)",
      sData: "Daten & Backup", sDrop: "Spotify-Datenexport (JSON) oder SpicyStats-Backup hierher ziehen oder klicken", sExportCsv: "Verlauf als CSV",
      sBackup: "Backup (JSON)", sPrune: "Ältere Einträge löschen als", sPruneBtn: "Löschen", sDays: "{n} Tage", sStorage: "{n} lokale Einträge ({kb} KB) · {m} importiert",
      sClear: "Gesamten Verlauf löschen", sReset: "Einstellungen zurücksetzen", sSure: "Sicher? Nochmal klicken", sDemo: "Demo-Modus (Testdaten)",
      sAbout: "Info", sAboutTxt: "Alle Daten bleiben lokal auf deinem Gerät – kein Server, keine KI, keine Cloud. Tastenkürzel zum Öffnen: Strg+Shift+A.",
      sStorageFull: "Speicher voll oder deaktiviert – Daten können verloren gehen.",
      imported: "{n} Einträge aus {f} Datei(en) importiert.", importErr: "Import fehlgeschlagen: {e}", restored: "Backup wiederhergestellt ({n} Einträge).",
      pruned: "{n} Einträge gelöscht.", cleared: "Verlauf gelöscht.", saved: "Datei gespeichert.",
      demoBanner: "DEMO-MODUS – simulierte Testdaten", trackPause: "Tracking pausieren", trackResume: "Tracking fortsetzen", trackPaused: "Tracking pausiert", trackActive: "Tracking aktiv",
    },
    en: {
      nav_overview: "Overview", nav_trends: "Trends", nav_artists: "Artists", nav_tracks: "Tracks", nav_albums: "Albums",
      nav_playlists: "Playlists", nav_history: "History", nav_achievements: "Achievements", nav_settings: "Settings",
      r_24h: "24 hrs", r_7d: "7 days", r_30d: "30 days", r_90d: "90 days", r_6m: "6 mo.", r_12m: "12 mo.", r_all: "All time",
      noData: "No listening data yet. It is recorded in real time from now on – or import your Spotify export in Settings.",
      noDataShort: "No data in this period.", unkTrack: "Unknown track", unkArtist: "Unknown artist", others: "Others",
      nowPlaying: "Now playing", idle: "Nothing is playing.", paused: "Paused", listened: "Listened", thisTrack: "Played {n}× in this period",
      kTime: "Listening time", kPlays: "Plays", kArtists: "Artists", kTracks: "Tracks", kDays: "Active days", kAvg: "Avg per active day",
      kStreak: "Streak", kSkip: "Skip rate", kSessions: "Sessions", kSesAvg: "Avg session", kSesMax: "Longest session", kBest: "Record: {n} days",
      kBestDay: "Best day", dayUnit: "days", vsPrev: "vs. previous period",
      goal: "Daily goal", goalDone: "Goal reached", goalLeft: "{n} to go", goalOf: "of {n}", goalDays: "{n} days goal reached",
      insights: "Insights", insNone: "Collect some listening data and insights will appear here automatically.",
      insPeak: "You listen most on {wd} around {h}:00.", insTop: "{a} makes up {p}% of your listening time.",
      insNew: "{n} new artists discovered.", insSkip: "You skip {p}% of all tracks.", insUp: "Your listening time is {p}% above the previous period.",
      insDown: "Your listening time is {p}% below the previous period.", insNight: "Night owl: {p}% of your plays happen after 10 pm.",
      insEarly: "Early bird: {p}% of your plays happen before 9 am.", insLoyal: "“{t}” played {n}× – your most played track.",
      insSession: "Your longest session lasted {d}.",
      cTrend: "Listening activity", cWeekday: "By weekday", cHour: "By time of day", cMonth: "Monthly comparison", cHeat: "Weekday × hour",
      cCal: "Activity calendar", cArtists: "Top artists", cDist: "Artist distribution", cDiscover: "Newly discovered", cTracks: "Top tracks",
      cSkipped: "Most skipped", cAlbums: "Top albums", cPlaylists: "Top playlists", cSpot: "Spotify Top (official)", cGenres: "Genres (Spotify)",
      cSessions: "Sessions", sortTime: "Time", sortPlays: "Plays", showAll: "Show all", weekOf: "Week of {d}", discoverHint: "Discoveries need some history before the period.",
      ctArea: "Area", ctLine: "Line", ctBar: "Bars", search: "Search title, artist or album …", more: "Load more",
      nothingFound: "Nothing found.", today: "Today", yesterday: "Yesterday", skip: "Skip", live: "Live", del: "Delete entry",
      playlistHint: "Playlist plays are recorded from now on.", spotFetch: "Fetch", spotErr: "API error: {e}", spotHint: "Fetches your official Spotify tops.",
      term_short_term: "4 weeks", term_medium_term: "6 months", term_long_term: "All time",
      achUnlocked: "{a} of {b} achievements unlocked", achStreak: "Current streak",
      b0: "Warming up", b1: "Regular", b2: "Legend", b3: "Getting started", b4: "Non-stop", b5: "Audiophile", b6: "Week runner",
      b7: "Month marathon", b8: "Unstoppable", b9: "Globetrotter", b10: "Night owl", b11: "Early bird", b12: "Loyal soul", b13: "Marathon", b14: "Goal getter",
      d_plays: "{n} plays", d_hours: "{n} hours listened", d_streak: "{n} days in a row", d_artists: "{n} different artists",
      d_night: "{n} plays between 12 and 5 am", d_early: "{n} plays between 5 and 8 am", d_loyal: "Played one track {n}×",
      d_marathon: "{n} min listening session", d_goal: "Daily goal reached {n} days",
      sAppear: "Appearance", sTheme: "Theme", thDark: "Dark", thLight: "Light", thAmoled: "AMOLED", sAccent: "Accent colour", sLang: "Language",
      sCompact: "Compact view", sAnim: "Animations", sDash: "Dashboard", sRange: "Default range", sTopN: "Entries in top lists",
      sChartType: "Chart type", sGrid: "Grid lines", sLegend: "Legend", sCompare: "Compare with previous period", sGoals: "Goals",
      sGoal: "Daily goal (minutes)", sTracking: "Tracking", sTrackOn: "Record listening history", sMinPlay: "Minimum listening time (sec.)",
      sData: "Data & backup", sDrop: "Drop your Spotify data export (JSON) or a SpicyStats backup here, or click", sExportCsv: "History as CSV",
      sBackup: "Backup (JSON)", sPrune: "Delete entries older than", sPruneBtn: "Delete", sDays: "{n} days", sStorage: "{n} local entries ({kb} KB) · {m} imported",
      sClear: "Delete entire history", sReset: "Reset settings", sSure: "Sure? Click again", sDemo: "Demo mode (test data)",
      sAbout: "About", sAboutTxt: "All data stays local on your device – no server, no AI, no cloud. Shortcut to open: Ctrl+Shift+A.",
      sStorageFull: "Storage full or disabled – data may be lost.",
      imported: "{n} entries imported from {f} file(s).", importErr: "Import failed: {e}", restored: "Backup restored ({n} entries).",
      pruned: "{n} entries deleted.", cleared: "History deleted.", saved: "File saved.",
      demoBanner: "DEMO MODE – simulated test data", trackPause: "Pause tracking", trackResume: "Resume tracking", trackPaused: "Tracking paused", trackActive: "Tracking active",
    },
    it: {
      nav_overview: "Panoramica", nav_trends: "Tendenze", nav_artists: "Artisti", nav_tracks: "Brani", nav_albums: "Album",
      nav_playlists: "Playlist", nav_history: "Cronologia", nav_achievements: "Traguardi", nav_settings: "Impostazioni",
      r_24h: "24 ore", r_7d: "7 giorni", r_30d: "30 giorni", r_90d: "90 giorni", r_6m: "6 mesi", r_12m: "12 mesi", r_all: "Totale",
      noData: "Ancora nessun dato. Viene registrato in tempo reale da ora – oppure importa il tuo export Spotify nelle Impostazioni.",
      noDataShort: "Nessun dato nel periodo.", unkTrack: "Brano sconosciuto", unkArtist: "Artista sconosciuto", others: "Altri",
      nowPlaying: "In riproduzione", idle: "Nessuna riproduzione.", paused: "In pausa", listened: "Ascoltato", thisTrack: "Ascoltato {n}× nel periodo",
      kTime: "Tempo d'ascolto", kPlays: "Riproduzioni", kArtists: "Artisti", kTracks: "Brani", kDays: "Giorni attivi", kAvg: "Media per giorno attivo",
      kStreak: "Serie", kSkip: "Tasso di salto", kSessions: "Sessioni", kSesAvg: "Sessione media", kSesMax: "Sessione più lunga", kBest: "Record: {n} giorni",
      kBestDay: "Giorno migliore", dayUnit: "giorni", vsPrev: "rispetto al periodo prec.",
      goal: "Obiettivo giornaliero", goalDone: "Obiettivo raggiunto", goalLeft: "Mancano {n}", goalOf: "di {n}", goalDays: "{n} giorni obiettivo raggiunto",
      insights: "Insight", insNone: "Raccogli qualche dato d'ascolto e gli insight appariranno qui.",
      insPeak: "Ascolti di più il {wd} verso le {h}.", insTop: "{a} rappresenta il {p}% del tuo tempo d'ascolto.",
      insNew: "{n} nuovi artisti scoperti.", insSkip: "Salti il {p}% dei brani.", insUp: "Il tuo tempo d'ascolto è {p}% sopra il periodo precedente.",
      insDown: "Il tuo tempo d'ascolto è {p}% sotto il periodo precedente.", insNight: "Nottambulo: il {p}% delle riproduzioni dopo le 22.",
      insEarly: "Mattiniero: il {p}% delle riproduzioni prima delle 9.", insLoyal: "“{t}” ascoltato {n}× – il tuo brano più ascoltato.",
      insSession: "La tua sessione più lunga è durata {d}.",
      cTrend: "Attività d'ascolto", cWeekday: "Per giorno", cHour: "Per ora del giorno", cMonth: "Confronto mensile", cHeat: "Giorno × ora",
      cCal: "Calendario attività", cArtists: "Artisti top", cDist: "Distribuzione artisti", cDiscover: "Appena scoperti", cTracks: "Brani top",
      cSkipped: "Più saltati", cAlbums: "Album top", cPlaylists: "Playlist top", cSpot: "Spotify Top (ufficiale)", cGenres: "Generi (Spotify)",
      cSessions: "Sessioni", sortTime: "Tempo", sortPlays: "Riproduzioni", showAll: "Mostra tutto", weekOf: "Settimana dal {d}", discoverHint: "Le scoperte richiedono cronologia precedente al periodo.",
      ctArea: "Area", ctLine: "Linea", ctBar: "Barre", search: "Cerca titolo, artista o album …", more: "Carica altro",
      nothingFound: "Nessun risultato.", today: "Oggi", yesterday: "Ieri", skip: "Salto", live: "Live", del: "Elimina voce",
      playlistHint: "Le riproduzioni da playlist vengono registrate da ora.", spotFetch: "Carica", spotErr: "Errore API: {e}", spotHint: "Carica i tuoi top ufficiali di Spotify.",
      term_short_term: "4 settimane", term_medium_term: "6 mesi", term_long_term: "Totale",
      achUnlocked: "{a} di {b} traguardi sbloccati", achStreak: "Serie attuale",
      b0: "Riscaldamento", b1: "Habitué", b2: "Leggenda", b3: "Primi ascolti", b4: "Non-stop", b5: "Audiofilo", b6: "Corridore settimanale",
      b7: "Maratona mensile", b8: "Inarrestabile", b9: "Giramondo", b10: "Nottambulo", b11: "Mattiniero", b12: "Anima fedele", b13: "Maratona", b14: "Determinato",
      d_plays: "{n} riproduzioni", d_hours: "{n} ore ascoltate", d_streak: "{n} giorni di fila", d_artists: "{n} artisti diversi",
      d_night: "{n} riproduzioni tra 0 e 5", d_early: "{n} riproduzioni tra 5 e 8", d_loyal: "Un brano ascoltato {n}×",
      d_marathon: "{n} min di sessione", d_goal: "Obiettivo raggiunto {n} giorni",
      sAppear: "Aspetto", sTheme: "Tema", thDark: "Scuro", thLight: "Chiaro", thAmoled: "AMOLED", sAccent: "Colore accento", sLang: "Lingua",
      sCompact: "Vista compatta", sAnim: "Animazioni", sDash: "Dashboard", sRange: "Periodo predefinito", sTopN: "Voci nelle classifiche",
      sChartType: "Tipo di grafico", sGrid: "Linee della griglia", sLegend: "Legenda", sCompare: "Confronta con periodo precedente", sGoals: "Obiettivi",
      sGoal: "Obiettivo giornaliero (minuti)", sTracking: "Tracciamento", sTrackOn: "Registra cronologia d'ascolto", sMinPlay: "Durata minima (sec.)",
      sData: "Dati e backup", sDrop: "Trascina qui l'export dati Spotify (JSON) o un backup SpicyStats, oppure clicca", sExportCsv: "Cronologia come CSV",
      sBackup: "Backup (JSON)", sPrune: "Elimina voci più vecchie di", sPruneBtn: "Elimina", sDays: "{n} giorni", sStorage: "{n} voci locali ({kb} KB) · {m} importate",
      sClear: "Elimina tutta la cronologia", sReset: "Ripristina impostazioni", sSure: "Sicuro? Clicca di nuovo", sDemo: "Modalità demo (dati di prova)",
      sAbout: "Info", sAboutTxt: "Tutti i dati restano locali sul tuo dispositivo – nessun server, nessuna IA, nessun cloud. Scorciatoia: Ctrl+Shift+A.",
      sStorageFull: "Memoria piena o disattivata – i dati potrebbero andare persi.",
      imported: "{n} voci importate da {f} file.", importErr: "Importazione fallita: {e}", restored: "Backup ripristinato ({n} voci).",
      pruned: "{n} voci eliminate.", cleared: "Cronologia eliminata.", saved: "File salvato.",
      demoBanner: "MODALITÀ DEMO – dati simulati", trackPause: "Metti in pausa il tracciamento", trackResume: "Riprendi il tracciamento", trackPaused: "Tracciamento in pausa", trackActive: "Tracciamento attivo",
    },
  };
  const T = (k, v) => {
    let s = (L[S.language] && L[S.language][k]) || L.de[k] || k;
    if (v) for (const x in v) s = s.split("{" + x + "}").join(v[x]);
    return s;
  };
  const WD = { de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"] };
  const WDL = {
    de: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"],
    en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    it: ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"],
  };
  const MON = {
    de: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    it: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
  };

  /* ====================================================================
   *  Hilfsfunktionen
   * ==================================================================== */
  const pad = n => String(n).padStart(2, "0");
  const dkOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const dayKey = t => dkOf(new Date(t));
  const toMin = ms => Math.round(ms / 600) / 100;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hue = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const argmax = a => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);
  const sum = a => a.reduce((x, y) => x + y, 0);
  const pct = (c, p) => (p > 0 ? Math.round(((c - p) / p) * 100) : null);
  const fmtDur = ms => {
    if (!ms || ms < 0) return "0 min";
    if (ms < 60000) return Math.round(ms / 1000) + " s";
    const m = Math.round(ms / 60000);
    if (m < 60) return m + " min";
    const h = Math.floor(m / 60);
    return h >= 100 ? h + " h" : h + " h " + pad(m % 60) + " min";
  };
  const fmtShort = k => { const [, m, d] = k.split("-"); return S.language === "en" ? m + "/" + d : d + "." + m + "."; };
  const fmtFull = k => { const [y, m, d] = k.split("-"); return S.language === "en" ? m + "/" + d + "/" + y : d + "." + m + "." + y; };
  const monthLabel = k => { const [y, m] = k.split("-"); return MON[S.language][Number(m) - 1] + " " + y.slice(2); };
  const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const tickMin = v => (v >= 60 ? (v / 60).toFixed(1).replace(/\.0$/, "") + "h" : Math.round(v * 10) / 10 + "m");
  const lum = h => { const [r, g, b] = hexRgb(h).split(",").map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(",");
  const imgHash = u => { if (!u || typeof u !== "string") return ""; const m = u.match(/image[:/]([0-9a-f]{20,})/i); return m ? m[1] : ""; };
  const isSkip = p => p.ms < 30000 && !(p.d && p.ms >= p.d - 3000);
  const notify = (m, err) => { try { Spicetify.showNotification?.(m, !!err); } catch {} };
  const empty = m => `<div class="si-empty">${esc(m)}</div>`;
  const ic = (p, s = 16, sw = 1.75) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONS = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    trends: '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/>',
    artists: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    tracks: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    albums: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
    playlists: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
    history: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    achievements: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    spark: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2"/>',
    trendUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    trendDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
    skip: '<path d="M5 5l9 7-9 7z"/><path d="M19 5v14"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sunrise: '<path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 5v4M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8"/>',
    repeat: '<path d="M17 3l3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="M7 21l-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>',
    headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4l3 5 3-5M12 9v11"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
    hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
    crown: '<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    logo: '<path d="M5 19v-7M12 19V5M19 19v-4"/>',
  };

  /* ====================================================================
   *  Persistenz (localStorage für Verlauf, IndexedDB für Importe)
   * ==================================================================== */
  let demo = false, plays = [], imported = [];
  function loadPlays() {
    try {
      const a = JSON.parse(localStorage.getItem(PKEY) || "[]");
      return Array.isArray(a) ? a.filter(p => p && Number.isFinite(p.t) && Number.isFinite(p.ms) && p.ms > 0 && typeof p.id === "string") : [];
    } catch { return []; }
  }
  plays = loadPlays();
  function savePlays() {
    if (plays.length > MAXPLAYS) plays = plays.slice(-MAXPLAYS);
    for (let k = 0; k < 3; k++) {
      try { localStorage.setItem(PKEY, JSON.stringify(plays)); storageOk = true; return; }
      catch { storageOk = false; plays = plays.slice(Math.ceil(plays.length * 0.2)); }
    }
  }
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open("spiceitify-vault", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const kv = async (mode, fn) => { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction("kv", mode), r = fn(tx.objectStore("kv")); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }); };
  const saveImported = () => kv("readwrite", s => s.put(imported, "imported")).catch(() => {});
  kv("readonly", s => s.get("imported")).then(a => { if (Array.isArray(a)) { imported = a; render(); } }).catch(() => {});
  // Alte KI-Schlüssel aus früheren Versionen restlos entfernen
  kv("readwrite", s => { s.delete("k:gemini"); s.delete("k:nvidia"); s.delete("mk"); }).catch(() => {});

  /* ====================================================================
   *  Live-Tracking (zählt nur echte Wiedergabezeit)
   * ==================================================================== */
  let cur = null, tickLast = Date.now();
  function readItem() {
    const data = Spicetify.Player.data, item = data?.item;
    if (!item) return null;
    const md = item.metadata || {};
    const title = item.name || md.title || T("unkTrack");
    const artist = item.artists?.[0]?.name || md.artist_name || T("unkArtist");
    return {
      id: item.uri || title + "|" + artist, title, artist,
      album: item.album?.name || md.album_title || "",
      img: imgHash(item.album?.images?.[0]?.url || item.images?.[0]?.url || md.image_url || md.image_large_url || ""),
      dur: item.duration_ms || item.duration?.milliseconds || Number(md.duration) || 0,
      ctx: data.context_uri || data.context?.uri || "",
    };
  }
  function startCur(it) {
    cur = { ...it, start: Date.now(), acc: 0, lastProg: 0 };
    if (/^spotify:playlist:/.test(it.ctx)) { const c0 = cur; Spicetify.Platform?.PlaylistAPI?.getMetadata?.(it.ctx).then(x => { c0.pl = x?.name; }).catch(() => {}); }
  }
  function closeCur() {
    if (!cur) return;
    const c = cur; cur = null;
    if (!S.tracking) return;
    let ms = c.acc; if (c.dur) ms = Math.min(ms, c.dur);
    if (ms >= S.minPlaySec * 1000) {
      plays.push({ t: c.start, id: c.id, title: c.title, artist: c.artist, album: c.album || undefined, i: c.img || undefined, ms: Math.round(ms), d: c.dur || undefined, pl: c.pl });
      savePlays();
    }
  }
  function tick() {
    const now = Date.now(), dt = Math.min(now - tickLast, 3000); tickLast = now;
    if (!S.tracking) return;
    let it = null; try { it = readItem(); } catch {}
    if (!it) return;
    if (cur && cur.id !== it.id) closeCur();
    if (!cur) startCur(it);
    let pr = 0; try { pr = Spicetify.Player.getProgress?.() || 0; } catch {}
    if (cur.lastProg > pr + 10000 && cur.acc >= Math.min(30000, (cur.dur || 30000) * 0.5)) { closeCur(); startCur(it); }
    cur.lastProg = pr;
    let playing = false; try { playing = Spicetify.Player.isPlaying(); } catch {}
    if (playing) cur.acc += dt;
  }
  setInterval(tick, 1000);
  Spicetify.Player.addEventListener("songchange", () => { try { tick(); scheduleRender(); } catch {} });
  addEventListener("beforeunload", closeCur);

  /* ====================================================================
   *  Demo-Daten (deterministisch)
   * ==================================================================== */
  let demoCache = null;
  function demoData() {
    if (demoCache) return demoCache;
    let seed = 1337; const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const artists = [["Twenty One Pilots", ["Stressed Out", "Ride", "Heathens", "Chlorine", "Jumpsuit"], "Trench"], ["The Weeknd", ["Blinding Lights", "Starboy", "Save Your Tears", "Out of Time"], "After Hours"], ["Dua Lipa", ["Levitating", "Houdini", "Physical", "Training Season"], "Future Nostalgia"], ["Arctic Monkeys", ["Do I Wanna Know?", "R U Mine?", "505", "Fluorescent Adolescent"], "AM"], ["Milky", ["Just The Way You Are", "Sunrise"], "Milky Way"], ["Depri", ["Nachtfahrt", "Regen"], "Depri EP"], ["Temper City", ["Midnight Run", "Chrome"], "Chrome"], ["Kendrick Lamar", ["HUMBLE.", "Alright", "DNA."], "DAMN."]];
    const pls = ["Lieblingssongs", "Drums Mix", "Konzrtz Mix", "HolyPhonk", "Chill", null, null];
    const out = [], hourW = [1, 1, 1, 1, 1, 2, 3, 4, 3, 3, 3, 4, 5, 4, 4, 5, 6, 7, 8, 10, 12, 12, 8, 4];
    const hsum = sum(hourW);
    for (let n = 0; n < 1800; n++) {
      const day = Math.floor(Math.pow(rnd(), 1.35) * 240);
      let r = rnd() * hsum, h = 0; while (r > hourW[h]) { r -= hourW[h]; h++; }
      const d = new Date(); d.setDate(d.getDate() - day); d.setHours(h, Math.floor(rnd() * 60), 0, 0);
      const wd = (d.getDay() + 6) % 7; if (wd >= 5 && rnd() < 0.3) continue;
      const ar = artists[Math.floor(Math.pow(rnd(), 1.6) * artists.length)], tk = ar[1][Math.floor(rnd() * ar[1].length)];
      const dur = 150000 + Math.floor(rnd() * 120000), skip = rnd() < 0.16;
      out.push({ t: d.getTime(), id: "demo:" + ar[0] + ":" + tk, title: tk, artist: ar[0], album: ar[2], ms: skip ? 4000 + Math.floor(rnd() * 20000) : dur, d: dur, pl: pls[Math.floor(rnd() * pls.length)] || undefined });
    }
    return (demoCache = out);
  }

  function getAll() {
    if (demo) return demoData();
    const list = plays.concat(imported);
    if (cur && S.tracking) {
      const ms = cur.dur ? Math.min(cur.acc, cur.dur) : cur.acc;
      if (ms >= 1000) list.push({ t: cur.start, id: cur.id, title: cur.title, artist: cur.artist, album: cur.album || undefined, i: cur.img || undefined, ms, d: cur.dur || undefined, pl: cur.pl, live: true });
    }
    return list;
  }

  /* ====================================================================
   *  Analyse
   * ==================================================================== */
  function bounds(r) {
    const days = RANGES[r];
    if (!days) return { days: 0, from: 0, prevFrom: 0, prevTo: 0 };
    let from;
    if (days === 1) from = Date.now() - DAY;
    else { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (days - 1)); from = d.getTime(); }
    return { days, from, prevFrom: from - days * DAY, prevTo: from };
  }
  function dailyOf(list) { const m = new Map(); for (const p of list) { const k = dayKey(p.t); m.set(k, (m.get(k) || 0) + p.ms); } return m; }
  function streaks(days) {
    const keys = [...days.keys()].sort(); let best = 0, run = 0, prev = null;
    for (const k of keys) { const t = Date.parse(k + "T12:00:00"); run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1; prev = t; if (run > best) best = run; }
    let cur2 = 0; const d = new Date(); d.setHours(12, 0, 0, 0);
    if (!days.has(dkOf(d))) d.setDate(d.getDate() - 1);
    while (days.has(dkOf(d))) { cur2++; d.setDate(d.getDate() - 1); }
    return { cur: cur2, best };
  }
  function analyze(list) {
    const o = { total: 0, count: 0, skips: 0, tracks: new Map(), artists: new Map(), albums: new Map(), pls: new Map(), days: new Map(), months: new Map(),
      hours: Array(24).fill(0), hp: Array(24).fill(0), wd: Array(7).fill(0), heat: Array.from({ length: 7 }, () => Array(24).fill(0)) };
    for (const p of list) {
      const d = new Date(p.t), h = d.getHours(), w = (d.getDay() + 6) % 7, dk = dkOf(d), ms = p.ms, sk = isSkip(p);
      o.total += ms; o.count++; if (sk) o.skips++;
      o.days.set(dk, (o.days.get(dk) || 0) + ms);
      const mk = dk.slice(0, 7); o.months.set(mk, (o.months.get(mk) || 0) + ms);
      o.hours[h] += ms; o.hp[h]++; o.wd[w] += ms; o.heat[w][h] += ms;
      let a = o.artists.get(p.artist); if (!a) { a = { name: p.artist, ms: 0, plays: 0, i: "" }; o.artists.set(p.artist, a); }
      a.ms += ms; a.plays++; if (!a.i && p.i) a.i = p.i;
      let tr = o.tracks.get(p.id); if (!tr) { tr = { id: p.id, title: p.title, artist: p.artist, album: p.album, i: p.i, ms: 0, plays: 0, skips: 0 }; o.tracks.set(p.id, tr); }
      tr.ms += ms; tr.plays++; if (sk) tr.skips++; if (!tr.i && p.i) tr.i = p.i;
      if (p.album) {
        const ak = p.album + "|" + p.artist; let al = o.albums.get(ak);
        if (!al) { al = { name: p.album, artist: p.artist, i: p.i, ms: 0, plays: 0 }; o.albums.set(ak, al); }
        al.ms += ms; al.plays++; if (!al.i && p.i) al.i = p.i;
      }
      if (p.pl) { let pl = o.pls.get(p.pl); if (!pl) { pl = { name: p.pl, ms: 0, plays: 0 }; o.pls.set(p.pl, pl); } pl.ms += ms; pl.plays++; }
    }
    o.artistsR = [...o.artists.values()].sort((a, b) => b.ms - a.ms);
    o.tracksR = [...o.tracks.values()].sort((a, b) => b.plays - a.plays || b.ms - a.ms);
    o.albumsR = [...o.albums.values()].sort((a, b) => b.ms - a.ms);
    o.plsR = [...o.pls.values()].sort((a, b) => b.ms - a.ms);
    o.uniqueTracks = o.tracks.size; o.uniqueArtists = o.artists.size; o.activeDays = o.days.size;
    const sorted = [...list].sort((a, b) => a.t - b.t); let ses = 0, cs = 0, longest = 0, lastEnd = -Infinity;
    for (const p of sorted) { if (p.t - lastEnd > 18e5) { if (cs > longest) longest = cs; ses++; cs = 0; } cs += p.ms; lastEnd = Math.max(lastEnd, p.t + p.ms); }
    if (cs > longest) longest = cs;
    o.sessions = ses; o.sessionAvg = ses ? o.total / ses : 0; o.sessionMax = longest;
    o.peakHour = argmax(o.hours); o.peakDay = argmax(o.wd);
    let bd = null; for (const [k, v] of o.days) if (!bd || v > bd[1]) bd = [k, v];
    o.bestDay = bd;
    return o;
  }

  function series(A, b, list) {
    if (b.days === 1) {
      const start = Date.now() - DAY, arr = Array(24).fill(0);
      for (const p of list) { const i = Math.floor((p.t - start) / 36e5); if (i >= 0 && i < 24) arr[i] += p.ms; }
      return arr.map((v, i) => { const h = pad(new Date(start + i * 36e5).getHours()); return [h, toMin(v), h + ":00"]; });
    }
    const keys = [...A.days.keys()].sort(); if (!keys.length) return [];
    const now = new Date(); now.setHours(12, 0, 0, 0);
    const startD = b.days ? new Date(b.from) : new Date(keys[0] + "T12:00:00"); startD.setHours(12, 0, 0, 0);
    const span = Math.round((now - startD) / DAY) + 1, rows = [];
    if (span <= 92) {
      for (const d = new Date(startD); d <= now; d.setDate(d.getDate() + 1)) { const k = dkOf(d); rows.push([fmtShort(k), toMin(A.days.get(k) || 0), fmtFull(k)]); }
    } else if (span <= 400) {
      const wk = new Map();
      for (const [k, ms] of A.days) { const d = new Date(k + "T12:00:00"); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const w = dkOf(d); wk.set(w, (wk.get(w) || 0) + ms); }
      const d = new Date(startD); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      for (; d <= now; d.setDate(d.getDate() + 7)) { const k = dkOf(d); rows.push([fmtShort(k), toMin(wk.get(k) || 0), T("weekOf", { d: fmtFull(k) })]); }
    } else {
      const y0 = startD.getFullYear(), m0 = startD.getMonth();
      for (let y = y0, m = m0; y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth()); m++) {
        if (m > 11) { m = 0; y++; if (y > now.getFullYear()) break; }
        const k = y + "-" + pad(m + 1); rows.push([monthLabel(k), toMin(A.months.get(k) || 0), monthLabel(k)]);
      }
    }
    return rows;
  }

  /* ====================================================================
   *  SVG-Charts
   * ==================================================================== */
  let gid = 0;
  function trendChart(rows, o) {
    o = o || {};
    const type = o.type || "area", fmt = o.fmt || (v => fmtDur(v * 6e4)), tick = o.tick || tickMin;
    if (!rows.length || rows.every(r => !r[1])) return empty(T("noDataShort"));
    const W = 640, H = 230, pl = 42, pr = 8, pt = 10, pb = 24, iw = W - pl - pr, ih = H - pt - pb, n = rows.length;
    const mx = niceMax(Math.max(...rows.map(r => r[1])));
    const step = iw / n, x = i => (type === "bar" ? pl + step * i + step / 2 : pl + (n === 1 ? iw / 2 : (iw * i) / (n - 1))), y = v => pt + ih - (v / mx) * ih;
    let s = "";
    if (S.showGrid) for (let k = 0; k <= 4; k++) { const v = (mx * k) / 4, yy = y(v); s += `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" class="si-gl"/><text x="${pl - 6}" y="${yy + 3}" text-anchor="end" class="si-ax">${tick(v)}</text>`; }
    if (type === "bar") {
      const bw = Math.max(1.5, step * 0.68);
      s += rows.map((r, i) => `<rect class="si-b" x="${(x(i) - bw / 2).toFixed(1)}" y="${y(r[1]).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, pt + ih - y(r[1])).toFixed(1)}" rx="${Math.min(3, bw / 2)}" data-tip="${esc(r[2])}|${esc(fmt(r[1]))}"/>`).join("");
    } else {
      const pts = rows.map((r, i) => x(i).toFixed(1) + "," + y(r[1]).toFixed(1)), id = "sg" + ++gid;
      if (type === "area") s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--si-accent);stop-opacity:.28"/><stop offset="1" style="stop-color:var(--si-accent);stop-opacity:0"/></linearGradient></defs><polygon points="${x(0).toFixed(1)},${pt + ih} ${pts.join(" ")} ${x(n - 1).toFixed(1)},${pt + ih}" fill="url(#${id})"/>`;
      s += `<polyline points="${pts.join(" ")}" class="si-ln"/>`;
      s += rows.map((r, i) => `<circle class="si-pt${n <= 31 ? " on" : ""}" cx="${x(i).toFixed(1)}" cy="${y(r[1]).toFixed(1)}" r="${n > 45 ? 4.5 : 3.5}" data-tip="${esc(r[2])}|${esc(fmt(r[1]))}"/>`).join("");
    }
    const st = Math.ceil(n / 8);
    s += rows.map((r, i) => (i % st ? "" : `<text x="${x(i).toFixed(1)}" y="${H - 7}" text-anchor="middle" class="si-ax">${esc(r[0])}</text>`)).join("");
    return `<svg class="si-svg" viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
  }
  function donut(rows, center, fmt) {
    const tot = sum(rows.map(r => r[1]));
    if (!tot) return empty(T("noDataShort"));
    const top = rows.slice(0, 7), rest = sum(rows.slice(7).map(r => r[1])), seg = rest > 0 ? [...top, [T("others"), rest]] : top;
    const R = 62, C = 2 * Math.PI * R; let acc = 0;
    const arcs = seg.map((r, i) => {
      const len = (r[1] / tot) * C;
      const el = `<circle cx="80" cy="80" r="${R}" fill="none" class="si-arc" style="stroke:${PAL[i]}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-acc).toFixed(2)}" transform="rotate(-90 80 80)" data-tip="${esc(r[0])}|${esc(fmt(r[1]))} · ${((r[1] / tot) * 100).toFixed(1)}%"/>`;
      acc += len; return el;
    }).join("");
    const leg = S.showLegend ? `<ul class="si-leg">${seg.map((r, i) => `<li><i style="background:${PAL[i]}"></i><span>${esc(r[0])}</span><b>${Math.round((r[1] / tot) * 100)}%</b></li>`).join("")}</ul>` : "";
    return `<div class="si-donut"><svg viewBox="0 0 160 160" class="si-svg-d" role="img">${arcs}<text x="80" y="76" text-anchor="middle" class="si-dc">${esc(center)}</text></svg>${leg}</div>`;
  }
  function calendar(daily) {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - ((today.getDay() + 6) % 7) - 52 * 7);
    let mx = 0; for (const v of daily.values()) if (v > mx) mx = v;
    const cs = 11, st = 14, W = 24 + 53 * st, H = 18 + 7 * st; let cells = "", labels = "", lastM = -1;
    for (let c = 0; c < 53; c++) for (let r = 0; r < 7; r++) {
      const d = new Date(start); d.setDate(start.getDate() + c * 7 + r); if (d > today) continue;
      const k = dkOf(d), v = daily.get(k) || 0, lvl = v && mx ? Math.max(1, Math.ceil((v / mx) * 4)) : 0;
      cells += `<rect x="${24 + c * st}" y="${16 + r * st}" width="${cs}" height="${cs}" rx="2.5" class="si-cell l${lvl}" data-tip="${esc(fmtFull(k))}|${esc(fmtDur(v))}"/>`;
      if (r === 0 && d.getMonth() !== lastM) { labels += `<text x="${24 + c * st}" y="10" class="si-ax">${MON[S.language][d.getMonth()]}</text>`; lastM = d.getMonth(); }
    }
    [0, 2, 4].forEach(r => { labels += `<text x="0" y="${16 + r * st + 9}" class="si-ax">${WD[S.language][r]}</text>`; });
    return `<div class="si-scroll"><svg class="si-svg si-cal" viewBox="0 0 ${W} ${H}" role="img">${labels}${cells}</svg></div>`;
  }
  function heatmap(heat) {
    let mx = 0; for (const r of heat) for (const v of r) if (v > mx) mx = v;
    const cw = 22, ch = 18, g = 2, ox = 30, W = ox + 24 * (cw + g), H = 7 * (ch + g) + 20; let s = "";
    for (let w = 0; w < 7; w++) {
      s += `<text x="0" y="${w * (ch + g) + 13}" class="si-ax">${WD[S.language][w]}</text>`;
      for (let h = 0; h < 24; h++) {
        const v = heat[w][h];
        s += `<rect x="${ox + h * (cw + g)}" y="${w * (ch + g)}" width="${cw}" height="${ch}" rx="3" class="si-cell ${v ? "" : "l0"}" style="${v ? `fill:var(--si-accent);fill-opacity:${(0.14 + (0.86 * v) / mx).toFixed(2)}` : ""}" data-tip="${esc(WDL[S.language][w] + ", " + pad(h) + ":00")}|${esc(fmtDur(v))}"/>`;
      }
    }
    for (let h = 0; h < 24; h += 3) s += `<text x="${ox + h * (cw + g) + cw / 2}" y="${H - 4}" text-anchor="middle" class="si-ax">${pad(h)}</text>`;
    return `<div class="si-scroll"><svg class="si-svg si-heat" viewBox="0 0 ${W} ${H}" role="img">${s}</svg></div>`;
  }
  function ring(frac, big, small) {
    const R = 50, C = 2 * Math.PI * R, f = Math.max(0, Math.min(1, frac));
    return `<svg viewBox="0 0 120 120" class="si-ring"><circle cx="60" cy="60" r="${R}" class="si-ring-bg"/><circle cx="60" cy="60" r="${R}" class="si-ring-fg" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="58" text-anchor="middle" class="si-ring-t">${esc(big)}</text><text x="60" y="76" text-anchor="middle" class="si-ring-s">${esc(small)}</text></svg>`;
  }

  /* ====================================================================
   *  UI-Bausteine
   * ==================================================================== */
  const cvHtml = (i, name, round) => i
    ? `<span class="si-cv${round ? " round" : ""}" style="background-image:url('https://i.scdn.co/image/${esc(i)}')"></span>`
    : `<span class="si-cv si-av${round ? " round" : ""}" style="--h:${hue(name || "?")}">${esc((name || "?").trim().charAt(0).toUpperCase())}</span>`;
  const cvUrl = (u, name, round) => u
    ? `<span class="si-cv${round ? " round" : ""}" style="background-image:url('${esc(u)}')"></span>`
    : `<span class="si-cv si-av${round ? " round" : ""}" style="--h:${hue(name || "?")}">${esc((name || "?").trim().charAt(0).toUpperCase())}</span>`;

  function toplist(items) {
    if (!items.length) return empty(T("noDataShort"));
    const mx = Math.max(...items.map(i => i.val)) || 1;
    return `<ol class="si-tl">${items.map((it, i) => `<li class="si-li"><span class="si-rk">${i + 1}</span>${it.url !== undefined ? cvUrl(it.url, it.name, it.round) : cvHtml(it.img, it.name, it.round)}<div class="si-li-main"><div class="si-li-t">${esc(it.name)}</div><div class="si-li-s">${esc(it.sub || "")}</div>${it.val !== undefined && it.meter !== false ? `<div class="si-meter"><i style="width:${Math.max(2, (it.val / mx) * 100).toFixed(1)}%"></i></div>` : ""}</div>${it.txt ? `<span class="si-li-v">${esc(it.txt)}</span>` : ""}</li>`).join("")}</ol>`;
  }
  const seg = (k, opts, cur2) => `<div class="si-seg">${opts.map(([v, l]) => `<button data-seg="${k}:${esc(v)}" class="${String(v) === String(cur2) ? "on" : ""}">${l}</button>`).join("")}</div>`;
  const sw = (k, v) => `<label class="si-sw"><input type="checkbox" data-chk="${k}" ${v ? "checked" : ""}><span></span></label>`;
  const srow = (l, ctl, hint) => `<div class="si-srow"><div><div class="si-sl">${l}</div>${hint ? `<div class="si-sh">${hint}</div>` : ""}</div><div class="si-sc">${ctl}</div></div>`;
  const kpi = (l, v, s, d) => `<div class="si-kpi"><small>${l}</small><b>${esc(v)}</b><span class="si-kpi-s">${s || ""}${d || ""}</span></div>`;
  let csvCache = {};
  const card = (title, body, o) => { o = o || {}; return `<section class="si-card ${o.cls || ""}"><h3><span>${title}</span><span class="sp"></span>${o.extra || ""}${o.csv ? `<button class="si-mini" data-csv="${o.csv}" title="CSV">CSV</button>` : ""}</h3>${body}</section>`; };
  const csvSet = (id, head, rows) => { csvCache[id] = { head, rows }; return id; };

  const artistItems = (A, n) => A.artistsR.slice(0, n).map(a => ({ name: a.name, sub: a.plays + "×", val: a.ms, txt: fmtDur(a.ms), img: a.i, round: true }));
  const trackItems = (A, n, sort) => {
    const arr = sort === "time" ? [...A.tracksR].sort((x, y) => y.ms - x.ms) : A.tracksR;
    return arr.slice(0, n).map(x => ({ name: x.title, sub: x.artist, val: sort === "time" ? x.ms : x.plays, txt: sort === "time" ? fmtDur(x.ms) : x.plays + "×", img: x.i }));
  };
  const albumItems = (A, n) => A.albumsR.slice(0, n).map(a => ({ name: a.name, sub: a.artist + " · " + a.plays + "×", val: a.ms, txt: fmtDur(a.ms), img: a.i }));
  const plItems = (A, n) => A.plsR.slice(0, n).map(p => ({ name: p.name, sub: p.plays + "×", val: p.ms, txt: fmtDur(p.ms) }));

  /* ====================================================================
   *  Spotify-Top-API
   * ==================================================================== */
  const spotifyTop = {}; let topTerm = "medium_term", topMsg = "";
  async function loadTop(type) {
    try { const j = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/top/${type}?limit=20&time_range=${topTerm}`); spotifyTop[type] = j.items || []; topMsg = ""; }
    catch (e) { topMsg = T("spotErr", { e: e.message || e }); }
    render();
  }
  const genreRows = () => { const m = new Map(); for (const a of spotifyTop.artists || []) for (const g of a.genres || []) m.set(g, (m.get(g) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1]); };
  function topCard(type) {
    const items = (spotifyTop[type] || []).map(i => ({ name: i.name, sub: type === "artists" ? (i.genres || []).slice(0, 2).join(", ") : (i.artists || []).map(a => a.name).join(", "), url: (i.images || i.album?.images || [])[0]?.url || "", round: type === "artists", meter: false }));
    const chips = seg("_term", [["short_term", T("term_short_term")], ["medium_term", T("term_medium_term")], ["long_term", T("term_long_term")]], topTerm);
    return card(T("cSpot") + " · " + T("nav_" + type), `<div class="si-row">${chips}<button class="si-btn pri" data-top="${type}">${T("spotFetch")}</button></div>${topMsg ? `<p class="si-err">${esc(topMsg)}</p>` : ""}${items.length ? toplist(items) : `<div class="si-sh">${T("spotHint")}</div>`}`);
  }

  /* ====================================================================
   *  Ansichten
   * ==================================================================== */
  let range = S.range, section = S.lastSection, q = "", histLimit = 50, trackSort = "plays", pruneDays = 365, armed = "", importMsg = "";

  function insights(c) {
    const A = c.A, out = [];
    if (!A.count) return [["bulb", T("insNone")]];
    out.push(["clock", T("insPeak", { wd: WDL[S.language][A.peakDay], h: A.peakHour })]);
    const ta = A.artistsR[0]; if (ta && A.total) out.push(["mic", T("insTop", { a: ta.name, p: Math.round((ta.ms / A.total) * 100) })]);
    if (c.newArtists > 0) out.push(["spark", T("insNew", { n: c.newArtists })]);
    const d = pct(A.total, c.prev.total);
    if (S.compare && c.b.days && d !== null && Math.abs(d) >= 3) out.push([d > 0 ? "trendUp" : "trendDown", T(d > 0 ? "insUp" : "insDown", { p: Math.abs(d) })]);
    out.push(["skip", T("insSkip", { p: Math.round((A.skips / A.count) * 100) })]);
    const late = sum(A.hp.slice(22)) + sum(A.hp.slice(0, 4)), early = sum(A.hp.slice(5, 9));
    if (late / A.count > 0.25) out.push(["moon", T("insNight", { p: Math.round((sum(A.hp.slice(22)) / A.count) * 100) })]);
    else if (early / A.count > 0.25) out.push(["sunrise", T("insEarly", { p: Math.round((early / A.count) * 100) })]);
    const lt = A.tracksR[0]; if (lt && lt.plays > 2) out.push(["repeat", T("insLoyal", { t: lt.title, n: lt.plays })]);
    if (A.sessionMax > 0) out.push(["headphones", T("insSession", { d: fmtDur(A.sessionMax) })]);
    return out;
  }
  const delta = (c, cu, pr) => { const d = pct(cu, pr); return S.compare && c.b.days && d !== null ? ` <em class="si-delta ${d >= 0 ? "up" : "down"}" title="${esc(T("vsPrev"))}">${ic(d >= 0 ? ICONS.arrowUp : ICONS.arrowDown, 11, 2.5)} ${Math.abs(d)}%</em>` : ""; };

  function heroHtml(c) {
    let np = null, playing = false; try { np = readItem(); playing = Spicetify.Player.isPlaying(); } catch {}
    if (!np) return `<section class="si-card si-hero"><div class="si-hero-in"><span class="si-cv big si-av" style="--h:150">${ic(ICONS.tracks, 30)}</span><div><div class="si-hero-k">${T("nowPlaying")}</div><div class="si-sh">${T("idle")}</div></div></div></section>`;
    const n = c.A.tracks.get(np.id)?.plays || 0;
    return `<section class="si-card si-hero"><div class="si-hero-in"><span class="si-cv big" style="${np.img ? `background-image:url('https://i.scdn.co/image/${esc(np.img)}')` : ""}"></span><div class="si-hero-t"><div class="si-hero-k">${playing ? `<span class="si-eq"><i></i><i></i><i></i></span> ${T("nowPlaying")}` : ic(ICONS.pause, 12, 2.4) + " " + T("paused")}</div><div class="si-hero-n">${esc(np.title)}</div><div class="si-li-s">${esc(np.artist)}${np.album ? " · " + esc(np.album) : ""}</div><div class="si-hero-m">${T("thisTrack", { n })}${cur && S.tracking ? ` · ${T("listened")}: <span data-live="listened">${fmtDur(cur.acc)}</span>` : ""}</div></div></div></section>`;
  }
  function goalHtml(c) {
    const today = c.allDays.get(dayKey(Date.now())) || 0, goal = S.dailyGoal * 60000, done = today >= goal;
    const goalDays = [...c.allDays.values()].filter(v => v >= goal).length;
    return `<section class="si-card si-goal">${ring(today / goal, Math.round(Math.min(999, (today / goal) * 100)) + "%", fmtDur(today))}<div><div class="si-hero-k">${T("goal")}</div><div class="si-hero-n">${done ? ic(ICONS.checkCircle, 18, 2) + " " + T("goalDone") : T("goalLeft", { n: fmtDur(goal - today) })}</div><div class="si-sh">${T("goalOf", { n: fmtDur(goal) })} · ${T("goalDays", { n: goalDays })}</div></div></section>`;
  }

  function viewOverview(c) {
    const A = c.A;
    const head = `<div class="si-grid g21">${heroHtml(c)}${goalHtml(c)}</div>`;
    if (!A.count) return head + empty(T("noData"));
    const kp = [
      kpi(T("kTime"), fmtDur(A.total), "", delta(c, A.total, c.prev.total)),
      kpi(T("kPlays"), A.count, "", delta(c, A.count, c.prev.count)),
      kpi(T("kArtists"), A.uniqueArtists, esc(A.artistsR[0]?.name || "")),
      kpi(T("kTracks"), A.uniqueTracks, esc(A.tracksR[0]?.title || "")),
      kpi(T("kDays"), A.activeDays, T("kAvg") + ": " + fmtDur(A.activeDays ? A.total / A.activeDays : 0)),
      kpi(T("kStreak"), c.streak.cur + " " + T("dayUnit"), T("kBest", { n: c.streak.best })),
      kpi(T("kSkip"), Math.round((A.skips / A.count) * 100) + "%", ""),
      kpi(T("kSessions"), A.sessions, T("kSesAvg") + ": " + fmtDur(A.sessionAvg)),
    ].join("");
    const rows = series(A, c.b, c.list);
    const trend = card(T("cTrend"), trendChart(rows, { type: S.chartType }), { csv: csvSet("trend", ["label", "minutes"], rows.map(r => [r[2], r[1]])) });
    const ins = card(T("insights"), `<ul class="si-ins">${insights(c).map(([e, tx]) => `<li><span class="si-ins-i">${ic(ICONS[e], 16)}</span><span>${esc(tx)}</span></li>`).join("")}</ul>`);
    const ta = card(T("cArtists"), toplist(artistItems(A, 5)), { extra: `<button class="si-link" data-nav="artists">${T("showAll")}</button>` });
    const tt = card(T("cTracks"), toplist(trackItems(A, 5, "plays")), { extra: `<button class="si-link" data-nav="tracks">${T("showAll")}</button>` });
    return head + `<div class="si-grid g-kpi">${kp}</div>` + trend + `<div class="si-grid g2">${ins}${card(T("cWeekday"), trendChart(A.wd.map((v, i) => [WD[S.language][i], toMin(v), WDL[S.language][i]]), { type: "bar" }))}</div><div class="si-grid g2">${ta}${tt}</div>`;
  }

  function viewTrends(c) {
    const A = c.A; if (!A.count) return empty(T("noData"));
    const rows = series(A, c.b, c.list);
    const ctSeg = seg("chartType", [["area", T("ctArea")], ["line", T("ctLine")], ["bar", T("ctBar")]], S.chartType);
    const months = [...A.months].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [monthLabel(k), toMin(v), monthLabel(k)]);
    const sessions = `<div class="si-grid g-kpi">${kpi(T("kSessions"), A.sessions)}${kpi(T("kSesAvg"), fmtDur(A.sessionAvg))}${kpi(T("kSesMax"), fmtDur(A.sessionMax))}${A.bestDay ? kpi(T("kBestDay"), fmtDur(A.bestDay[1]), fmtFull(A.bestDay[0])) : ""}</div>`;
    return card(T("cTrend"), trendChart(rows, { type: S.chartType }), { extra: ctSeg, csv: csvSet("trend", ["label", "minutes"], rows.map(r => [r[2], r[1]])) })
      + card(T("cSessions"), sessions)
      + `<div class="si-grid g2">${card(T("cWeekday"), trendChart(A.wd.map((v, i) => [WD[S.language][i], toMin(v), WDL[S.language][i]]), { type: "bar" }), { csv: csvSet("weekday", ["weekday", "minutes"], A.wd.map((v, i) => [WDL[S.language][i], toMin(v)])) })}${card(T("cHour"), trendChart(A.hours.map((v, h) => [pad(h), toMin(v), pad(h) + ":00"]), { type: "bar" }), { csv: csvSet("hour", ["hour", "minutes"], A.hours.map((v, h) => [h, toMin(v)])) })}</div>`
      + card(T("cHeat"), heatmap(A.heat))
      + card(T("cMonth"), trendChart(months, { type: "bar" }), { csv: csvSet("months", ["month", "minutes"], months.map(r => [r[2], r[1]])) })
      + card(T("cCal"), calendar(c.allDays));
  }

  function viewArtists(c) {
    const A = c.A; if (!A.count) return empty(T("noData")) + topCard("artists");
    const items = artistItems(A, S.topN);
    const dist = donut(A.artistsR.map(a => [a.name, a.ms]), fmtDur(A.total), fmtDur);
    let disc = "";
    if (c.firstSeen && c.hasHistoryBefore) {
      const nw = A.artistsR.filter(a => (c.firstSeen.get(a.name) || 0) >= c.b.from).slice(0, 10);
      disc = card(T("cDiscover"), nw.length ? toplist(nw.map(a => ({ name: a.name, sub: a.plays + "×", val: a.ms, txt: fmtDur(a.ms), img: a.i, round: true }))) : empty(T("noDataShort")));
    } else disc = card(T("cDiscover"), `<div class="si-sh">${T("discoverHint")}</div>`);
    const genres = genreRows();
    return card(T("cArtists"), toplist(items), { csv: csvSet("artists", ["artist", "minutes", "plays"], A.artistsR.map(a => [a.name, toMin(a.ms), a.plays])) })
      + `<div class="si-grid g2">${card(T("cDist"), dist)}${disc}</div>`
      + (genres.length ? card(T("cGenres"), donut(genres, String(genres.length), v => v + "×")) : "")
      + topCard("artists");
  }

  function viewTracks(c) {
    const A = c.A; if (!A.count) return empty(T("noData")) + topCard("tracks");
    const sortSeg = seg("_sort", [["plays", T("sortPlays")], ["time", T("sortTime")]], trackSort);
    const skipped = [...A.tracksR].filter(x => x.plays >= 3 && x.skips > 0).sort((a, b) => b.skips / b.plays - a.skips / a.plays || b.skips - a.skips).slice(0, 5).map(x => ({ name: x.title, sub: x.artist, val: x.skips / x.plays, txt: Math.round((x.skips / x.plays) * 100) + "%", img: x.i }));
    return card(T("cTracks"), toplist(trackItems(A, S.topN, trackSort)), { extra: sortSeg, csv: csvSet("tracks", ["title", "artist", "plays", "minutes"], A.tracksR.map(x => [x.title, x.artist, x.plays, toMin(x.ms)])) })
      + (skipped.length ? card(T("cSkipped"), toplist(skipped)) : "")
      + topCard("tracks");
  }
  function viewAlbums(c) {
    const A = c.A; if (!A.albumsR.length) return empty(T("noData"));
    return card(T("cAlbums"), toplist(albumItems(A, S.topN)), { csv: csvSet("albums", ["album", "artist", "minutes", "plays"], A.albumsR.map(a => [a.name, a.artist, toMin(a.ms), a.plays])) });
  }
  function viewPlaylists(c) {
    const A = c.A; if (!A.plsR.length) return empty(T("playlistHint"));
    return card(T("cPlaylists"), toplist(plItems(A, S.topN)), { csv: csvSet("playlists", ["playlist", "minutes", "plays"], A.plsR.map(p => [p.name, toMin(p.ms), p.plays])) })
      + card(T("cDist"), donut(A.plsR.map(p => [p.name, p.ms]), fmtDur(sum(A.plsR.map(p => p.ms))), fmtDur));
  }

  function histBody(list) {
    const ql = q.trim().toLowerCase();
    let rows = [...list].sort((a, b) => b.t - a.t);
    if (ql) rows = rows.filter(p => ((p.title || "") + " " + (p.artist || "") + " " + (p.album || "")).toLowerCase().includes(ql));
    if (!rows.length) return empty(T("nothingFound"));
    let html = "", last = "";
    const today = dayKey(Date.now()), yest = dayKey(Date.now() - DAY);
    for (const p of rows.slice(0, histLimit)) {
      const k = dayKey(p.t), d = new Date(p.t);
      if (k !== last) { last = k; html += `<h4 class="si-dayh">${k === today ? T("today") : k === yest ? T("yesterday") : fmtFull(k)}</h4>`; }
      html += `<div class="si-hr">${cvHtml(p.i, p.title)}<div class="si-li-main"><div class="si-li-t">${esc(p.title)}${isSkip(p) ? ` <span class="si-tag">${T("skip")}</span>` : ""}${p.live ? ` <span class="si-tag live">${T("live")}</span>` : ""}</div><div class="si-li-s">${esc(p.artist)}${p.album ? " · " + esc(p.album) : ""}${p.pl ? " · " + esc(p.pl) : ""}</div></div><span class="si-time">${pad(d.getHours())}:${pad(d.getMinutes())}</span><span class="si-li-v">${fmtDur(p.ms)}</span>${p.live || demo ? "" : `<button class="si-x" data-delplay="${p.t}|${esc(p.id)}" title="${esc(T("del"))}">${ic(ICONS.x, 12, 2)}</button>`}</div>`;
    }
    if (rows.length > histLimit) html += `<div class="si-center"><button class="si-btn" data-act="more">${T("more")} (${rows.length - histLimit})</button></div>`;
    return html;
  }
  function viewHistory(c) {
    return card(T("nav_history"), `<input type="search" class="si-search" data-q placeholder="${esc(T("search"))}" value="${esc(q)}"><div class="si-hist">${histBody(c.list)}</div>`);
  }

  const BADGES = [["plays", 100, "headphones"], ["plays", 1000, "flame"], ["plays", 10000, "crown"], ["hours", 10, "timer"], ["hours", 100, "hourglass"], ["hours", 500, "achievements"], ["streak", 7, "calendar"], ["streak", 30, "bolt"], ["streak", 100, "gem"], ["artists", 100, "globe"], ["night", 50, "moon"], ["early", 50, "sunrise"], ["loyal", 25, "repeat"], ["marathon", 180, "flag"], ["goal", 30, "target"]];
  function viewAch(c) {
    const AA = c.getAA(), goal = S.dailyGoal * 60000;
    const vals = { plays: AA.count, hours: AA.total / 36e5, streak: c.streak.best, artists: AA.uniqueArtists, night: sum(AA.hp.slice(0, 5)), early: sum(AA.hp.slice(5, 8)), loyal: AA.tracksR[0]?.plays || 0, marathon: AA.sessionMax / 60000, goal: [...c.allDays.values()].filter(v => v >= goal).length };
    const unlocked = BADGES.filter(([k, n]) => vals[k] >= n).length;
    const grid = BADGES.map(([k, n, e], i) => {
      const v = vals[k], ok = v >= n, p = Math.min(1, v / n);
      return `<div class="si-bdg ${ok ? "on" : ""}"><div class="si-bdg-e">${ic(ICONS[e], 22)}</div><div class="si-bdg-t">${T("b" + i)}</div><div class="si-sh">${T("d_" + k, { n })}</div><div class="si-meter"><i style="width:${(p * 100).toFixed(0)}%"></i></div><div class="si-bdg-p">${ok ? ic(ICONS.check, 13, 2.5) : Math.floor(v) + " / " + n}</div></div>`;
    }).join("");
    return `<div class="si-grid g2">${goalHtml(c)}${card(T("achStreak"), `<div class="si-bigstat">${ic(ICONS.flame, 30)} ${c.streak.cur} <small>${T("dayUnit")}</small></div><div class="si-sh">${T("kBest", { n: c.streak.best })}</div>`)}</div>`
      + card(T("nav_achievements"), `<div class="si-sh" style="margin-bottom:12px">${T("achUnlocked", { a: unlocked, b: BADGES.length })}</div><div class="si-badges">${grid}</div>`);
  }

  function viewSettings() {
    const kb = Math.round((localStorage.getItem(PKEY) || "").length / 1024);
    const arm = (a, label) => `<button class="si-btn ${armed === a ? "dan" : ""}" data-act="${a}">${armed === a ? T("sSure") : label}</button>`;
    const appearance = card(T("sAppear"),
      srow(T("sTheme"), seg("theme", [["dark", T("thDark")], ["light", T("thLight")], ["amoled", T("thAmoled")]], S.theme))
      + srow(T("sAccent"), `<div class="si-sw-row">${ACCENTS.map(a => `<button class="si-dot ${a === S.accent ? "on" : ""}" style="background:${a}" data-seg="accent:${a}" aria-label="${a}"></button>`).join("")}<input type="color" value="${S.accent}" data-set="accent" class="si-color"></div>`)
      + srow(T("sLang"), seg("language", [["de", "Deutsch"], ["en", "English"], ["it", "Italiano"]], S.language))
      + srow(T("sCompact"), sw("compact", S.compact)) + srow(T("sAnim"), sw("animate", S.animate)));
    const dash = card(T("sDash"),
      srow(T("sRange"), seg("range", Object.keys(RANGES).map(r => [r, T("r_" + r)]), S.range))
      + srow(T("sTopN"), seg("topN", [[5, "5"], [10, "10"], [20, "20"]], S.topN))
      + srow(T("sChartType"), seg("chartType", [["area", T("ctArea")], ["line", T("ctLine")], ["bar", T("ctBar")]], S.chartType))
      + srow(T("sGrid"), sw("showGrid", S.showGrid)) + srow(T("sLegend"), sw("showLegend", S.showLegend)) + srow(T("sCompare"), sw("compare", S.compare)));
    const goals = card(T("sGoals") + " & " + T("sTracking"),
      srow(T("sGoal"), `<input type="number" class="si-num" min="5" max="600" step="5" value="${S.dailyGoal}" data-set="dailyGoal">`)
      + srow(T("sTrackOn"), sw("tracking", S.tracking))
      + srow(T("sMinPlay"), seg("minPlaySec", [[2, "2"], [10, "10"], [30, "30"]], S.minPlaySec)));
    const data = card(T("sData"),
      `<label class="si-drop">${T("sDrop")}<input type="file" accept=".json,application/json" multiple hidden data-import></label>${importMsg ? `<p class="si-sh">${esc(importMsg)}</p>` : ""}`
      + `<div class="si-row" style="margin-top:12px"><button class="si-btn" data-act="exportCsv">${T("sExportCsv")}</button><button class="si-btn" data-act="backup">${T("sBackup")}</button></div>`
      + `<div class="si-row">${T("sPrune")} ${seg("_prune", [[90, T("sDays", { n: 90 })], [180, T("sDays", { n: 180 })], [365, T("sDays", { n: 365 })]], pruneDays)}${arm("prune", T("sPruneBtn"))}</div>`
      + `<p class="si-sh">${T("sStorage", { n: plays.length, kb, m: imported.length })}</p>${storageOk ? "" : `<p class="si-err">${T("sStorageFull")}</p>`}`
      + `<div class="si-row">${arm("clearAll", T("sClear"))}${arm("resetPrefs", T("sReset"))}</div>`
      + srow(T("sDemo"), sw("_demo", demo)));
    const about = card(T("sAbout"), `<div class="si-sh">${T("sAboutTxt")}</div>`);
    return `<div class="si-grid g2">${appearance}${dash}</div><div class="si-grid g2">${goals}${about}</div>${data}`;
  }

  /* ====================================================================
   *  Rendering
   * ==================================================================== */
  let root = null, tipEl = null, liveTimer = null, liveCount = 0, resetScroll = false, renderQueued = false;
  const VIEWS = { overview: viewOverview, trends: viewTrends, artists: viewArtists, tracks: viewTracks, albums: viewAlbums, playlists: viewPlaylists, history: viewHistory, achievements: viewAch };

  function buildCtx() {
    const all = getAll(), b = bounds(range), list = b.days ? all.filter(p => p.t >= b.from) : all;
    const A = analyze(list);
    let ptot = 0, pcnt = 0;
    if (b.days) for (const p of all) if (p.t >= b.prevFrom && p.t < b.prevTo) { ptot += p.ms; pcnt++; }
    const allDays = dailyOf(all);
    const c = { all, b, list, A, prev: { total: ptot, count: pcnt }, allDays, streak: streaks(allDays), AA: null, firstSeen: null, hasHistoryBefore: false, newArtists: 0 };
    c.getAA = () => c.AA || (c.AA = b.days ? analyze(all) : A);
    if (b.days && (section === "artists" || section === "overview")) {
      const fs = new Map(); let first = Infinity;
      for (const p of all) { const f = fs.get(p.artist); if (f === undefined || p.t < f) fs.set(p.artist, p.t); if (p.t < first) first = p.t; }
      c.firstSeen = fs; c.hasHistoryBefore = first < b.from;
      if (c.hasHistoryBefore) c.newArtists = A.artistsR.filter(a => (fs.get(a.name) || 0) >= b.from).length;
    }
    return c;
  }

  function render() {
    if (!root || !document.body.contains(root)) return;
    const mainOld = root.querySelector(".si-main"), sc = resetScroll ? 0 : mainOld ? mainOld.scrollTop : 0, entering = resetScroll; resetScroll = false;
    csvCache = {};
    const c = buildCtx();
    root.className = "si-root " + S.theme + (S.compact ? " compact" : "") + (S.animate ? " anim" : "");
    root.style.setProperty("--si-on", lum(S.accent) > 0.45 ? "#000" : "#fff"); root.style.setProperty("--si-accent", S.accent); root.style.setProperty("--si-ar", hexRgb(S.accent));
    const body = section === "settings" ? viewSettings() : (VIEWS[section] || viewOverview)(c);
    const nav = SECTIONS.map(k => `<button class="si-nav-b ${k === section ? "on" : ""}" data-nav="${k}" title="${esc(T("nav_" + k))}">${ic(ICONS[k], 18)}<span class="lb">${T("nav_" + k)}</span></button>`).join("");
    const chips = Object.keys(RANGES).map(r => `<button class="si-chip ${r === range ? "on" : ""}" data-rng="${r}">${T("r_" + r)}</button>`).join("");
    root.innerHTML = `<div class="si-app"><aside class="si-side"><div class="si-logo">${ic(ICONS.logo, 22, 2.6)}<span class="lb">SpicyStats</span></div>${nav}<div class="si-side-foot"><button class="si-trk ${S.tracking ? "on" : ""}" data-act="toggleTracking" title="${esc(S.tracking ? T("trackPause") : T("trackResume"))}"><i></i><span class="lb">${S.tracking ? T("trackActive") : T("trackPaused")}</span></button></div></aside><section class="si-content"><header class="si-top"><h2>${T("nav_" + section)}</h2>${demo ? `<span class="si-demo">${T("demoBanner")}</span>` : ""}${section === "settings" ? "" : `<div class="si-chips">${chips}</div>`}</header><div class="si-main${entering ? " enter" : ""}">${demo && section === "settings" ? "" : ""}${body}</div></section></div>`;
    const m = root.querySelector(".si-main"); if (m) m.scrollTop = sc;
    if (tipEl) { tipEl.style.display = "none"; root.appendChild(tipEl); }
  }
  function scheduleRender() {
    if (renderQueued || !root) return; renderQueued = true;
    setTimeout(() => { renderQueued = false; if (!root || !document.body.contains(root)) return; const ae = document.activeElement; if (ae && root.contains(ae) && /INPUT|SELECT|TEXTAREA/.test(ae.tagName)) return; render(); }, 250);
  }
  function liveTick() {
    if (!root) return;
    const el = root.querySelector('[data-live="listened"]'); if (el && cur) el.textContent = fmtDur(cur.acc);
    if (++liveCount % 20 === 0 && ["overview", "trends", "history"].includes(section)) scheduleRender();
  }

  /* ====================================================================
   *  Aktionen
   * ==================================================================== */
  function download(name, mime, text) {
    const b = new Blob([text], { type: mime }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); notify(T("saved"));
  }
  const cell = x => `"${String(x ?? "").replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`;
  const csvText = (head, rows) => [head.map(cell).join(","), ...rows.map(r => r.map(cell).join(","))].join("\n");
  function setPref(k, v) {
    if (typeof DEF()[k] === "number") v = Number(v);
    S[k] = v; Object.assign(S, validate(S));
    if (k === "range") range = S.range;
    save(); render();
  }
  function arm(a, fn) {
    if (armed !== a) { armed = a; render(); setTimeout(() => { if (armed === a) { armed = ""; render(); } }, 4000); return; }
    armed = ""; fn(); render();
  }
  const ACTS = {
    toggleTracking() { closeCur(); S.tracking = !S.tracking; save(); render(); },
    more() { histLimit += 50; render(); },
    exportCsv() {
      const rows = [...plays, ...imported].sort((a, b) => a.t - b.t).map(p => [new Date(p.t).toISOString(), p.title, p.artist, p.album || "", toMin(p.ms), p.pl || ""]);
      download("spicystats_history.csv", "text/csv", csvText(["timestamp", "title", "artist", "album", "minutes", "playlist"], rows));
    },
    backup() { download("spicystats_backup_" + dayKey(Date.now()) + ".json", "application/json", JSON.stringify({ spiceitify: V, exported: new Date().toISOString(), settings: S, plays, imported })); },
    prune() { arm("prune", () => { const min = Date.now() - pruneDays * DAY, n = plays.length + imported.length; plays = plays.filter(p => p.t >= min); imported = imported.filter(p => p.t >= min); savePlays(); saveImported(); notify(T("pruned", { n: n - plays.length - imported.length })); }); },
    clearAll() { arm("clearAll", () => { plays = []; imported = []; cur = null; try { localStorage.removeItem(PKEY); } catch {} saveImported(); notify(T("cleared")); }); },
    resetPrefs() { arm("resetPrefs", () => { Object.assign(S, DEF()); range = S.range; section = S.lastSection; save(); }); },
  };
  function onClick(e) {
    // Wichtig: Render ersetzt das DOM – ohne stopPropagation hält Spotify den Klick für einen Klick "außerhalb" und schließt das Fenster.
    e.stopPropagation();
    const el = e.target.closest("[data-nav],[data-rng],[data-seg],[data-csv],[data-act],[data-top],[data-delplay]");
    if (!el) return;
    const d = el.dataset; e.preventDefault();
    if (d.nav) { section = d.nav; S.lastSection = section; save(); resetScroll = true; render(); }
    else if (d.rng) { range = d.rng; render(); }
    else if (d.seg) {
      const i = d.seg.indexOf(":"), k = d.seg.slice(0, i), v = d.seg.slice(i + 1);
      if (k === "_term") { topTerm = v; render(); }
      else if (k === "_sort") { trackSort = v; render(); }
      else if (k === "_prune") { pruneDays = Number(v); render(); }
      else setPref(k, v);
    }
    else if (d.csv) { const c = csvCache[d.csv]; if (c) download("spicystats_" + d.csv + ".csv", "text/csv", csvText(c.head, c.rows)); }
    else if (d.act) { ACTS[d.act]?.(); }
    else if (d.top) { loadTop(d.top); }
    else if (d.delplay) {
      const i = d.delplay.indexOf("|"), t0 = Number(d.delplay.slice(0, i)), id = d.delplay.slice(i + 1);
      plays = plays.filter(p => !(p.t === t0 && p.id === id)); imported = imported.filter(p => !(p.t === t0 && p.id === id));
      savePlays(); saveImported(); render();
    }
  }
  function onChange(e) {
    const t0 = e.target, d = t0.dataset;
    if ("import" in d) { if (t0.files && t0.files.length) importFiles([...t0.files]); return; }
    if (d.chk) { if (d.chk === "_demo") { demo = t0.checked; render(); } else { if (d.chk === "tracking") closeCur(); setPref(d.chk, t0.checked); } return; }
    if (d.set) setPref(d.set, t0.value);
  }
  function onInput(e) {
    if ("q" in e.target.dataset) { q = e.target.value; histLimit = 50; const h = root.querySelector(".si-hist"); if (h) h.innerHTML = histBody(getAll().filter(p => !RANGES[range] || p.t >= bounds(range).from)); }
  }

  async function importFiles(files) {
    let added = 0, fcount = 0;
    try {
      for (const file of files) {
        const data = JSON.parse(await file.text()); fcount++;
        if (data && !Array.isArray(data) && data.spiceitify) {
          const seen = new Set(plays.map(p => p.t + "|" + p.id)); let n = 0;
          for (const p of Array.isArray(data.plays) ? data.plays : []) if (p && Number.isFinite(p.t) && Number.isFinite(p.ms) && typeof p.id === "string" && !seen.has(p.t + "|" + p.id)) { plays.push(p); n++; }
          const seen2 = new Set(imported.map(p => p.t + "|" + p.id));
          for (const p of Array.isArray(data.imported) ? data.imported : []) if (p && Number.isFinite(p.t) && Number.isFinite(p.ms) && typeof p.id === "string" && !seen2.has(p.t + "|" + p.id)) { imported.push(p); n++; }
          plays.sort((a, b) => a.t - b.t); savePlays(); await saveImported();
          if (data.settings) { Object.assign(S, validate({ ...S, ...obj(data.settings) })); range = S.range; save(); }
          added += n; importMsg = T("restored", { n: added });
          continue;
        }
        if (!Array.isArray(data)) throw new Error("Format");
        const seen = new Set(imported.map(p => p.t + "|" + p.id));
        for (const x of data) {
          const ms = x.ms_played ?? x.msPlayed, title = x.master_metadata_track_name || x.trackName, artist = x.master_metadata_album_artist_name || x.artistName;
          const end = Date.parse(x.ts || (x.endTime ? x.endTime.replace(" ", "T") + "Z" : ""));
          if (!title || !(ms >= 5000) || !Number.isFinite(end)) continue;
          const id = x.spotify_track_uri || title + "|" + artist, t0 = end - ms;
          if (seen.has(t0 + "|" + id)) continue; seen.add(t0 + "|" + id);
          imported.push({ t: t0, id, title, artist: artist || "?", album: x.master_metadata_album_album_name || undefined, ms });
          added++;
        }
        await saveImported();
        importMsg = T("imported", { n: added, f: fcount });
      }
    } catch (e) { importMsg = T("importErr", { e: e.message }); }
    render();
  }

  /* ====================================================================
   *  Tooltip, Öffnen
   * ==================================================================== */
  function showTip(el, e) {
    const [a, ...b] = (el.getAttribute("data-tip") || "").split("|");
    tipEl.innerHTML = `<b>${esc(a)}</b>${esc(b.join("|"))}`; tipEl.style.display = "block"; moveTip(e);
  }
  function moveTip(e) {
    const r = root.getBoundingClientRect(), w = r.width;
    tipEl.style.left = Math.max(70, Math.min(w - 70, e.clientX - r.left)) + "px"; tipEl.style.top = e.clientY - r.top + "px";
  }
  function open() {
    document.getElementById("si-style")?.remove(); let st = document.getElementById("ss-style"); if (!st) { st = document.createElement("style"); st.id = "ss-style"; document.head.appendChild(st); } st.textContent = CSS;
    root = document.createElement("div"); root.className = "si-root";
    tipEl = document.createElement("div"); tipEl.className = "si-tip";
    root.addEventListener("click", onClick); root.addEventListener("change", onChange); root.addEventListener("input", onInput);
    root.addEventListener("mouseover", e => { const el = e.target.closest ? e.target.closest("[data-tip]") : null; if (el) showTip(el, e); else tipEl.style.display = "none"; });
    root.addEventListener("mousemove", e => { if (tipEl.style.display === "block") moveTip(e); });
    root.addEventListener("mouseleave", () => { tipEl.style.display = "none"; });
    root.addEventListener("dragover", e => { if (e.target.closest && e.target.closest(".si-drop")) e.preventDefault(); });
    root.addEventListener("drop", e => { if (e.target.closest && e.target.closest(".si-drop")) { e.preventDefault(); importFiles([...e.dataTransfer.files]); } });
    range = S.range; section = S.lastSection;
    Spicetify.PopupModal.display({ title: "SpicyStats", content: root, isLarge: true });
    render();
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(() => { if (!root || !document.body.contains(root)) { clearInterval(liveTimer); root = null; return; } liveTick(); }, 1000);
  }

  /* ====================================================================
   *  Button in der Playbar (neben Lyrics)
   * ==================================================================== */
  const ICON = `<path d="M2 9h3v5H2zM6.5 3h3v11h-3zM11 6h3v8h-3z"/>`;
  let mountTries = 0;
  function findBar() {
    return document.querySelector(".main-nowPlayingBar-extraControls")
      || document.querySelector('[data-testid="now-playing-bar"] [data-testid="volume-bar-toggle-mute-button"]')?.parentElement?.parentElement || null;
  }
  function ensureButton() {
    const existing = document.getElementById("ss-footer-btn"), bar = findBar();
    if (existing && existing.dataset.floating && bar) existing.remove(); else if (existing) return;
    mountTries++;
    const lyrics = document.querySelector('[data-testid="lyrics-button"], .main-nowPlayingBar-lyricsButton'), sample = lyrics || bar?.querySelector("button");
    const btn = document.createElement("button");
    btn.id = "ss-footer-btn"; btn.title = "SpicyStats Analytics"; btn.setAttribute("aria-label", "SpicyStats Analytics");
    btn.className = sample?.className || "";
    btn.style.cssText = "display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;background:transparent;border:none;cursor:pointer;color:var(--spice-subtext,#b3b3b3);";
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">${ICON}</svg>`;
    btn.onmouseenter = () => { btn.style.color = "var(--spice-text,#fff)"; };
    btn.onmouseleave = () => { btn.style.color = "var(--spice-subtext,#b3b3b3)"; };
    btn.onclick = e => { e.preventDefault(); e.stopPropagation(); open(); };
    if (lyrics?.parentNode) lyrics.parentNode.insertBefore(btn, lyrics);
    else if (bar) bar.prepend(btn);
    else if (mountTries > 10) {
      btn.dataset.floating = "1";
      btn.style.cssText += "position:fixed;right:16px;bottom:96px;z-index:99999;border-radius:50%;background:#1db954;color:#000;box-shadow:0 2px 8px rgba(0,0,0,.5);";
      btn.onmouseenter = btn.onmouseleave = null; document.body.appendChild(btn);
    }
  }
  ensureButton();
  setInterval(ensureButton, 1500);

  /* ====================================================================
   *  CSS
   * ==================================================================== */
  const CSS = `
  .si-root{--si-accent:#1db954;--si-ar:29,185,84;--si-on:#000;
    --si-bg:#0e0e10;--si-side:rgba(28,28,30,.7);--si-panel:#1c1c1e;--si-panel2:#2c2c2e;--si-line:rgba(255,255,255,.08);--si-hover:rgba(255,255,255,.07);
    --si-fg:#f5f5f7;--si-mut:#98989f;--si-cell:#2c2c2e;--si-segon:#636366;--si-danger:#ff453a;--si-ok:#30d158;--si-shadow:0 1px 0 rgba(255,255,255,.03) inset;
    position:relative;height:min(80vh,780px);background:var(--si-bg);color:var(--si-fg);border-radius:18px;overflow:hidden;
    font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text",Inter,"Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
    font-size:13px;letter-spacing:-.01em;line-height:1.4;-webkit-font-smoothing:antialiased;container-type:inline-size}
  .si-root.light{--si-bg:#f2f2f7;--si-side:rgba(255,255,255,.72);--si-panel:#fff;--si-panel2:#f2f2f7;--si-line:rgba(0,0,0,.08);--si-hover:rgba(0,0,0,.05);--si-fg:#1d1d1f;--si-mut:#6e6e73;--si-cell:#e9e9ee;--si-segon:#fff;--si-shadow:0 1px 2px rgba(0,0,0,.05)}
  .si-root.amoled{--si-bg:#000;--si-side:rgba(12,12,14,.8);--si-panel:#0c0c0e;--si-panel2:#1c1c1e;--si-cell:#1c1c1e;--si-line:rgba(255,255,255,.07)}
  .si-root *{box-sizing:border-box}
  .si-root button{font-family:inherit;letter-spacing:inherit}
  .si-app{display:grid;grid-template-columns:200px minmax(0,1fr);height:100%}

  /* Seitenleiste */
  .si-side{background:var(--si-side);backdrop-filter:blur(30px) saturate(1.8);-webkit-backdrop-filter:blur(30px) saturate(1.8);border-right:1px solid var(--si-line);display:flex;flex-direction:column;padding:18px 12px 14px;gap:2px;overflow-y:auto}
  .si-logo{display:flex;align-items:center;gap:9px;font-weight:700;font-size:15px;letter-spacing:-.02em;padding:2px 10px 18px;color:var(--si-accent)} .si-logo .lb{color:var(--si-fg)}
  .si-nav-b{display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:9px;border:0;background:transparent;color:var(--si-fg);opacity:.72;cursor:pointer;font-size:13.5px;font-weight:500;text-align:left;width:100%;transition:background .2s,opacity .2s}
  .si-nav-b svg{color:var(--si-mut);transition:color .2s}
  .si-nav-b:hover{background:var(--si-hover);opacity:1}
  .si-nav-b.on{background:var(--si-hover);opacity:1;font-weight:600} .si-nav-b.on svg{color:var(--si-accent)}
  .si-side-foot{margin-top:auto;padding-top:12px}
  .si-trk{display:flex;align-items:center;gap:9px;width:100%;border:0;background:transparent;color:var(--si-mut);border-radius:9px;padding:8px 10px;cursor:pointer;font-size:12px;font-weight:500} .si-trk:hover{background:var(--si-hover)}
  .si-trk i{width:7px;height:7px;border-radius:50%;background:var(--si-danger);flex:none} .si-trk.on i{background:var(--si-ok);box-shadow:0 0 0 3px rgba(48,209,88,.18)}

  /* Kopfzeile & Inhalt */
  .si-content{display:flex;flex-direction:column;min-width:0;min-height:0}
  .si-top{display:flex;align-items:center;gap:12px;padding:20px 28px 8px;flex-wrap:wrap}
  .si-top h2{margin:0;font-size:26px;font-weight:700;letter-spacing:-.03em}
  .si-demo{background:rgba(255,159,10,.14);color:#ff9f0a;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600}
  .si-chips{display:flex;gap:1px;margin-left:auto;background:var(--si-panel);border-radius:10px;padding:2px;flex-wrap:wrap}
  .si-chip{border:0;background:transparent;color:var(--si-mut);padding:5px 11px;border-radius:8px;font-size:12px;cursor:pointer;font-weight:600;transition:background .2s,color .2s}
  .si-chip:hover{color:var(--si-fg)} .si-chip.on{background:var(--si-segon);color:var(--si-fg);box-shadow:0 1px 3px rgba(0,0,0,.22)}
  .si-main{flex:1;overflow-y:auto;padding:14px 28px 28px;display:flex;flex-direction:column;gap:20px;min-height:0}
  .si-main::-webkit-scrollbar{width:12px} .si-main::-webkit-scrollbar-thumb{background:rgba(128,128,128,.35);border-radius:10px;border:4px solid transparent;background-clip:content-box}
  .anim .si-main.enter>*{animation:si-in .5s cubic-bezier(.2,.8,.2,1) both} .si-main.enter>*:nth-child(2){animation-delay:.04s} .si-main.enter>*:nth-child(3){animation-delay:.08s} .si-main.enter>*:nth-child(4){animation-delay:.12s} .si-main.enter>*:nth-child(n+5){animation-delay:.16s}
  @keyframes si-in{from{opacity:0;transform:translateY(10px)}}
  .si-grid{display:grid;gap:20px;min-width:0} .g2{grid-template-columns:repeat(2,minmax(0,1fr))} .g21{grid-template-columns:minmax(0,2fr) minmax(0,1.2fr)} .g-kpi{grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px}

  /* Karten */
  .si-card{background:var(--si-panel);border-radius:20px;padding:20px;min-width:0;box-shadow:var(--si-shadow)}
  .si-card h3{margin:0 0 14px;font-size:15px;font-weight:600;letter-spacing:-.02em;display:flex;align-items:center;gap:8px} .si-card h3 .sp{flex:1}
  .compact .si-card{padding:14px;border-radius:16px} .compact .si-main{gap:12px;padding:10px 20px 20px}
  .si-kpi{background:var(--si-panel);border-radius:18px;padding:16px 18px;display:flex;flex-direction:column;gap:2px;min-width:0;box-shadow:var(--si-shadow)}
  .si-kpi small{color:var(--si-mut);font-size:12px;font-weight:500}
  .si-kpi b{font-size:26px;font-weight:700;letter-spacing:-.035em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;line-height:1.2}
  .si-kpi-s{color:var(--si-mut);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .si-delta{font-style:normal;font-weight:600;margin-left:6px;padding:1px 6px 1px 4px;border-radius:999px;font-size:11px} .si-delta.up{color:var(--si-ok);background:rgba(48,209,88,.13)} .si-delta.down{color:var(--si-danger);background:rgba(255,69,58,.13)} .si-delta svg{vertical-align:-1px}

  /* Hero & Ziel */
  .si-hero{background:radial-gradient(120% 140% at 0% 0%,rgba(var(--si-ar),.2),transparent 60%),var(--si-panel)}
  .si-hero-in{display:flex;gap:18px;align-items:center}
  .si-hero-k{font-size:12px;color:var(--si-accent);font-weight:600;display:flex;align-items:center;gap:6px} .si-hero-k svg{flex:none}
  .si-hero-n{font-size:20px;font-weight:700;letter-spacing:-.03em;margin:2px 0} .si-hero-n svg{vertical-align:-3px;color:var(--si-accent)}
  .si-hero-t{min-width:0} .si-hero-m{color:var(--si-mut);font-size:12px;margin-top:8px}
  .si-hero-t .si-hero-n,.si-hero-t .si-li-s{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .si-cv.big{width:88px;height:88px;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  .si-eq{display:inline-flex;gap:2px;align-items:flex-end;height:11px} .si-eq i{width:2.5px;background:var(--si-accent);border-radius:2px;height:100%;transform-origin:bottom;animation:si-eq 1s infinite ease-in-out} .si-eq i:nth-child(2){animation-delay:.2s} .si-eq i:nth-child(3){animation-delay:.4s}
  @keyframes si-eq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
  .si-goal{display:flex;align-items:center;gap:18px} .si-ring{width:104px;height:104px;flex:none}
  .si-ring-bg{fill:none;stroke:var(--si-panel2);stroke-width:9} .si-ring-fg{fill:none;stroke:var(--si-accent);stroke-width:9;stroke-linecap:round} .anim .si-ring-fg{transition:stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)}
  .si-ring-t{fill:var(--si-fg);font-size:21px;font-weight:700;letter-spacing:-.04em} .si-ring-s{fill:var(--si-mut);font-size:9px}

  /* Diagramme */
  .si-svg{width:100%;height:auto;display:block;overflow:visible} .si-scroll{overflow-x:auto;padding-bottom:4px}
  .si-gl{stroke:var(--si-line);stroke-width:1} .si-ax{fill:var(--si-mut);font-size:9.5px}
  .si-ln{fill:none;stroke:var(--si-accent);stroke-width:2.25;stroke-linejoin:round;stroke-linecap:round}
  .si-pt{fill:var(--si-accent);opacity:0;cursor:pointer} .si-pt.on{opacity:.95} .si-pt:hover{opacity:1;stroke:var(--si-panel);stroke-width:2.5}
  .si-b{fill:var(--si-accent);fill-opacity:.9;transition:fill-opacity .15s} .si-b:hover{fill-opacity:1}
  .anim .si-ln{stroke-dasharray:2000;stroke-dashoffset:2000;animation:si-draw 1.2s cubic-bezier(.2,.8,.2,1) forwards} @keyframes si-draw{to{stroke-dashoffset:0}}
  .anim .si-b{transform-box:fill-box;transform-origin:bottom;animation:si-grow .7s cubic-bezier(.2,.8,.2,1) both} @keyframes si-grow{from{transform:scaleY(0)}}
  .si-cell{fill:var(--si-cell)} .si-cell.l1{fill:var(--si-accent);fill-opacity:.28} .si-cell.l2{fill:var(--si-accent);fill-opacity:.5} .si-cell.l3{fill:var(--si-accent);fill-opacity:.75} .si-cell.l4{fill:var(--si-accent)} .si-cell:hover{stroke:var(--si-fg);stroke-width:1}
  .si-cal{min-width:640px} .si-heat{min-width:560px}
  .si-donut{display:flex;align-items:center;gap:22px;flex-wrap:wrap} .si-svg-d{width:160px;height:160px;flex:none} .si-arc{cursor:pointer;transition:stroke-width .15s} .si-arc:hover{stroke-width:25}
  .si-dc{fill:var(--si-fg);font-size:13px;font-weight:700}
  .si-leg{list-style:none;margin:0;padding:0;flex:1;min-width:140px;display:flex;flex-direction:column;gap:7px}
  .si-leg li{display:flex;align-items:center;gap:9px;font-size:12.5px} .si-leg i{width:9px;height:9px;border-radius:50%;flex:none} .si-leg span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .si-leg b{color:var(--si-mut);font-weight:500}

  /* Listen */
  .si-tl{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:1px}
  .si-li,.si-hr{display:flex;align-items:center;gap:12px;padding:8px;border-radius:12px;transition:background .15s} .si-li:hover,.si-hr:hover{background:var(--si-hover)}
  .si-rk{width:18px;text-align:center;color:var(--si-mut);font-weight:500;font-size:12px;flex:none}
  .si-cv{width:40px;height:40px;border-radius:9px;background:var(--si-panel2) center/cover no-repeat;flex:none;display:inline-block} .si-cv.round{border-radius:50%}
  .si-av{display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;background:linear-gradient(145deg,hsl(var(--h) 55% 48%),hsl(var(--h) 55% 32%))}
  .si-li-main{flex:1;min-width:0} .si-li-t{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .si-li-s{color:var(--si-mut);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .si-li-v{font-weight:600;font-size:12.5px;white-space:nowrap;font-variant-numeric:tabular-nums} .si-time{color:var(--si-mut);font-size:12px;width:42px;text-align:right;flex:none;font-variant-numeric:tabular-nums}
  .si-meter{height:3px;background:var(--si-panel2);border-radius:3px;margin-top:6px;overflow:hidden} .si-meter i{display:block;height:100%;background:var(--si-accent);border-radius:3px} .anim .si-meter i{transition:width .8s cubic-bezier(.2,.8,.2,1)}
  .si-tag{font-size:10px;background:var(--si-panel2);color:var(--si-mut);padding:1px 6px;border-radius:5px;font-weight:600;margin-left:5px} .si-tag.live{background:rgba(var(--si-ar),.18);color:var(--si-accent)}
  .si-x{border:0;background:transparent;color:var(--si-mut);cursor:pointer;opacity:0;padding:5px;border-radius:8px;transition:opacity .15s,background .15s} .si-hr:hover .si-x{opacity:1} .si-x:hover{color:var(--si-danger);background:rgba(255,69,58,.12)} .si-x svg{display:block}
  .si-dayh{margin:16px 0 4px 8px;font-size:12px;color:var(--si-mut);font-weight:600}
  .si-ins{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px} .si-ins li{display:flex;gap:12px;align-items:flex-start;line-height:1.4} .si-ins-i{color:var(--si-accent);display:flex;padding-top:1px;flex:none}

  /* Steuerelemente */
  .si-seg{display:inline-flex;background:var(--si-panel2);border-radius:9px;padding:2px;gap:1px;flex-wrap:wrap}
  .si-seg button{border:0;background:transparent;color:var(--si-mut);padding:5px 12px;border-radius:7px;cursor:pointer;font-size:12px;font-weight:600;transition:background .2s,color .2s} .si-seg button:hover{color:var(--si-fg)}
  .si-seg button.on{background:var(--si-segon);color:var(--si-fg);box-shadow:0 1px 3px rgba(0,0,0,.22)}
  .si-sw input{display:none} .si-sw span{width:44px;height:26px;border-radius:26px;background:var(--si-panel2);position:relative;display:inline-block;cursor:pointer;transition:background .25s}
  .si-sw span::after{content:"";position:absolute;left:2px;top:2px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.3);transition:transform .25s cubic-bezier(.3,.8,.3,1)}
  .si-sw input:checked+span{background:var(--si-ok)} .si-sw input:checked+span::after{transform:translateX(18px)}
  .si-srow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--si-line)} .si-srow:last-child{border-bottom:0;padding-bottom:0} .si-srow:first-of-type{padding-top:0}
  .si-sl{font-weight:500} .si-sh{color:var(--si-mut);font-size:12px;margin-top:2px} .si-sc{display:flex;align-items:center}
  .si-sw-row{display:flex;gap:8px;align-items:center} .si-dot{width:22px;height:22px;border-radius:50%;border:0;cursor:pointer;padding:0;transition:transform .15s} .si-dot:hover{transform:scale(1.12)} .si-dot.on{box-shadow:0 0 0 2px var(--si-panel),0 0 0 4px var(--si-fg)}
  .si-color{width:26px;height:24px;border:0;background:transparent;padding:0;cursor:pointer}
  .si-btn,.si-mini{background:var(--si-panel2);color:var(--si-fg);border:0;padding:8px 14px;border-radius:10px;cursor:pointer;font-size:12.5px;font-weight:600;transition:filter .15s,opacity .15s} .si-btn:hover{filter:brightness(1.12)}
  .si-btn.pri{background:var(--si-accent);color:var(--si-on)} .si-btn.dan{background:rgba(255,69,58,.16);color:var(--si-danger)}
  .si-mini{padding:3px 9px;font-size:11px;color:var(--si-mut);opacity:0;border-radius:7px} .si-card:hover .si-mini{opacity:1} .si-mini:hover{color:var(--si-fg)}
  .si-link{background:none;border:0;color:var(--si-accent);cursor:pointer;font-weight:600;font-size:12.5px;padding:0}
  .si-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:12px 0}
  .si-num,.si-search{background:var(--si-panel2);border:0;color:var(--si-fg);border-radius:10px;padding:8px 12px;font-size:13px;outline:none;font-family:inherit} .si-num{width:90px} .si-search{width:100%;margin-bottom:6px}
  .si-num:focus,.si-search:focus{box-shadow:0 0 0 3px rgba(var(--si-ar),.35)}
  .si-drop{display:block;border:1.5px dashed var(--si-line);border-radius:16px;padding:22px;text-align:center;color:var(--si-mut);cursor:pointer;font-weight:500;transition:border-color .2s,color .2s} .si-drop:hover{border-color:var(--si-accent);color:var(--si-fg)}
  .si-badges{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px}
  .si-bdg{border-radius:16px;padding:14px;background:var(--si-panel2);opacity:.5;transition:opacity .2s} .si-bdg.on{opacity:1;background:linear-gradient(160deg,rgba(var(--si-ar),.18),var(--si-panel2))}
  .si-bdg-e{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--si-panel);color:var(--si-mut)} .si-bdg.on .si-bdg-e{background:rgba(var(--si-ar),.2);color:var(--si-accent)}
  .si-bdg-t{font-weight:600;margin-top:10px} .si-bdg-p{font-size:11.5px;color:var(--si-mut);margin-top:6px;font-weight:500;display:flex;align-items:center;gap:4px} .si-bdg.on .si-bdg-p{color:var(--si-accent)}
  .si-bigstat{font-size:38px;font-weight:700;letter-spacing:-.04em} .si-bigstat svg{vertical-align:-5px;color:var(--si-accent)} .si-bigstat small{font-size:14px;color:var(--si-mut);font-weight:500;letter-spacing:0}
  .si-empty{padding:40px 16px;text-align:center;color:var(--si-mut);font-size:13px} .si-err{color:var(--si-danger);font-size:12px} .si-center{text-align:center;margin-top:14px}
  .si-tip{position:absolute;display:none;pointer-events:none;z-index:50;background:rgba(30,30,32,.78);backdrop-filter:blur(16px) saturate(1.6);-webkit-backdrop-filter:blur(16px) saturate(1.6);color:#f5f5f7;border-radius:10px;padding:7px 11px;font-size:12px;font-weight:600;transform:translate(-50%,-135%);white-space:nowrap;box-shadow:0 8px 28px rgba(0,0,0,.35)}
  .si-tip b{display:block;font-size:11px;color:#a1a1a8;font-weight:500}
  @container (max-width:820px){.si-app{grid-template-columns:60px minmax(0,1fr)} .lb{display:none} .si-nav-b{justify-content:center;padding:11px 0} .si-logo{justify-content:center;padding:2px 0 16px} .si-trk{justify-content:center;padding:11px 0} .g21{grid-template-columns:1fr}}
  @container (max-width:640px){.g2{grid-template-columns:1fr} .si-main{padding:10px 16px 20px} .si-top{padding:16px 16px 6px}}
  `;

  window.addEventListener("keydown", e => {
    if (e.ctrlKey && e.shiftKey && (e.key === "A" || e.key === "a")) { e.preventDefault(); open(); }
  });
  console.log("[SpicyStats v3] bereit – Strg+Shift+A öffnet das Dashboard.");
})();
