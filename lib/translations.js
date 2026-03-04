// ============================================================
// lib/translations.js — UI strings for i18n
// Add a new language by copying the "en" block and translating.
// ============================================================

export const translations = {
  en: {
    // Header
    headerSignIn: "SIGN IN",
    headerSignOut: "SIGN OUT",
    headerUpload: "+ UPLOAD",

    // Hero
    heroTag: "OPEN · FREE · COMMUNITY DRIVEN",
    heroHeading1: "SHARE A SPEC.",
    heroHeading2: "BUILD MUSIC TOOLS.",
    heroDesc1: "Community .md blueprints for VSTs, synths, effects & music apps.",
    heroDesc2: "Build with Claude, Gemini or ChatGPT — use your own key, contributor credits, or pay a few cents at cost price. No markup ever.",
    heroStatBlueprints: "blueprints",
    heroStatBuilds: "builds tracked",
    heroStatContributors: "community contributors",

    // How it works
    browseTitle: "BROWSE",
    browseDesc: "Find a music blueprint for what you want to build",
    buildTitle: "BUILD",
    buildDesc: "Pick your LLM and access mode. Build instantly.",
    contributeTitle: "CONTRIBUTE",
    contributeDesc: "Upload your own to earn build credits.",
    badgeHttps: "🔒 HTTPS",
    badgeGdpr: "🇪🇺 GDPR",
    badgeKeys: "🔑 Keys never stored",

    // Search
    searchPlaceholder: "search music blueprints, tags, categories...",
    filterAll: "All",
    results: "results",

    // Cards
    buildBtn: "BUILD →",
    cardBy: "by",

    // States
    loading: "Loading music blueprints...",
    nothingFound: "Nothing found.",
    beFirstUpload: "Be the first to upload →",

    // Upload modal
    uploadTitle: "SHARE A BLUEPRINT",
    uploadSubtitle: "Upload earns +1 karma & contributor build credits",
    uploadTitlePlaceholder: "Blueprint title",
    uploadDescPlaceholder: "What does this blueprint build? Be specific.",
    uploadTagsPlaceholder: "Tags: JUCE, bass, C++ ...",
    uploadDropzone: "drop .md file or click to browse",
    uploadOnly: "only .md accepted",
    uploadClickChange: "click to change",
    uploadScan: "🔍 SCAN BLUEPRINT",
    uploadScanning: "SCANNING",
    uploadScanningMsg: "Checking for security issues and completeness...",
    uploadRescan: "↻ RE-SCAN AFTER CHANGES",
    uploadScanError: "Scan failed. Check your connection and try again.",
    uploadCancel: "Cancel",
    uploadPublish: "PUBLISH",
    uploadFileFirst: "UPLOAD FILE FIRST",
    uploadScanRequired: "SCAN REQUIRED",
    uploadFixIssues: "FIX ISSUES FIRST",
    uploadSubmitting: "SUBMITTING...",
    uploadSuccess: "Blueprint submitted for review. It will appear in the music marketplace once approved.",

    // Validation
    validationTitle: "VALIDATION REPORT",
    validationPassed: "✓ PASSED",
    validationFailed: "✗ FAILED",
    validationSecurity: "SECURITY",
    validationQuality: "QUALITY",
    validationPass: "PASS",
    validationFail: "FAIL",
    validationNotice: "🔒 Used only for this session. Never stored or logged.",

    // Build modal
    buildModalTitle: "BUILD BLUEPRINT",
    buildStep1: "01 — SELECT MODEL",
    buildStep2: "02 — ACCESS MODE",
    buildModeOwnKey: "Own API Key",
    buildModeOwnKeySub: "Your key, your cost. Never stored.",
    buildModeCredits: "Contributor Credits",
    buildModeCreditsRemaining: "builds remaining",
    buildModePayg: "Pay as You Go",
    buildModePaygSub: "Coming soon — will charge at API cost, no markup.",
    buildModeUnlockHint: "Upload blueprints to unlock contributor access",
    buildApiKeyPlaceholder: "sk-...",
    buildSelectMode: "SELECT A MODE",
    buildStartBtn: "BUILD WITH",
    buildBuilding: "BUILDING...",
    buildComplete: "✓ BUILD COMPLETE",
    buildCopy: "COPY OUTPUT",
    buildAgain: "BUILD AGAIN",

    // Auth modal
    authSignIn: "SIGN IN",
    authCreateAccount: "CREATE ACCOUNT",
    authWelcome: "Welcome back.",
    authSubtitle: "Upload blueprints, earn karma, build things.",
    authUsername: "Username",
    authEmail: "Email",
    authPassword: "Password",
    authGitHub: "↗ Continue with GitHub",
    authNoAccount: "No account? ",
    authHaveAccount: "Already have one? ",
    authSignUpLink: "Sign up →",
    authSignInLink: "Sign in →",
    authCancel: "cancel",

    // Coffee modal
    coffeeTitle: "BUY ME A COFFEE",
    coffeeDesc1: "This platform is free and runs at cost price.",
    coffeeDesc2: "No VC money. No ads. Just the community.",
    coffeeDesc3: "Donors get a supporter badge + extra build credits.",
    coffeeTier1: "☕  One coffee",
    coffeeTier2: "☕☕  Two coffees",
    coffeeTier3: "🍺  A beer",
    coffeeDecline: "no thanks, maybe later",

    // Tiers
    tierLurker: "LURKER",
    tierContributor: "CONTRIBUTOR",
    tierSupporter: "SUPPORTER",
    tierAdmin: "ADMIN",

    // Footer
    footerTagline: "FREE · OPEN · BUILT TO DEMOCRATIZE AI BUILDING",
    footerPrivacy: "Privacy",
    footerTerms: "Terms",
    footerGitHub: "GitHub",
  },

  es: {
    // Header
    headerSignIn: "ENTRAR",
    headerSignOut: "SALIR",
    headerUpload: "+ SUBIR",

    // Hero
    heroTag: "ABIERTO · GRATIS · IMPULSADO POR LA COMUNIDAD",
    heroHeading1: "COMPARTE UN SPEC.",
    heroHeading2: "CONSTRUYE HERRAMIENTAS MUSICALES.",
    heroDesc1: "Blueprints .md de la comunidad para VSTs, sintes, efectos y apps de música.",
    heroDesc2: "Construye con Claude, Gemini o ChatGPT — usa tu propia clave, créditos de colaborador, o paga unos céntimos al precio de coste. Sin margen nunca.",
    heroStatBlueprints: "blueprints",
    heroStatBuilds: "builds registrados",
    heroStatContributors: "colaboradores",

    // How it works
    browseTitle: "EXPLORAR",
    browseDesc: "Encuentra un blueprint de música para lo que quieres construir",
    buildTitle: "CONSTRUIR",
    buildDesc: "Elige tu LLM y modo de acceso. Construye al instante.",
    contributeTitle: "CONTRIBUIR",
    contributeDesc: "Sube el tuyo para ganar créditos de construcción.",
    badgeHttps: "🔒 HTTPS",
    badgeGdpr: "🇪🇺 GDPR",
    badgeKeys: "🔑 Claves nunca guardadas",

    // Search
    searchPlaceholder: "buscar blueprints de música, etiquetas, categorías...",
    filterAll: "Todo",
    results: "resultados",

    // Cards
    buildBtn: "CONSTRUIR →",
    cardBy: "por",

    // States
    loading: "Cargando blueprints de música...",
    nothingFound: "Nada encontrado.",
    beFirstUpload: "Sé el primero en subir →",

    // Upload modal
    uploadTitle: "COMPARTIR UN BLUEPRINT",
    uploadSubtitle: "Subir gana +1 karma y créditos de colaborador",
    uploadTitlePlaceholder: "Título del blueprint",
    uploadDescPlaceholder: "¿Qué construye este blueprint? Sé específico.",
    uploadTagsPlaceholder: "Etiquetas: JUCE, bass, C++ ...",
    uploadDropzone: "suelta el .md o haz clic para buscar",
    uploadOnly: "solo se acepta .md",
    uploadClickChange: "haz clic para cambiar",
    uploadScan: "🔍 ESCANEAR BLUEPRINT",
    uploadScanning: "ESCANEANDO",
    uploadScanningMsg: "Verificando problemas de seguridad y completitud...",
    uploadRescan: "↻ RE-ESCANEAR TRAS CAMBIOS",
    uploadScanError: "Error al escanear. Comprueba tu conexión e inténtalo de nuevo.",
    uploadCancel: "Cancelar",
    uploadPublish: "PUBLICAR",
    uploadFileFirst: "SUBE UN ARCHIVO PRIMERO",
    uploadScanRequired: "ESCANEO REQUERIDO",
    uploadFixIssues: "CORRIGE LOS PROBLEMAS PRIMERO",
    uploadSubmitting: "ENVIANDO...",
    uploadSuccess: "Blueprint enviado para revisión. Aparecerá en el marketplace de música una vez aprobado.",

    // Validation
    validationTitle: "INFORME DE VALIDACIÓN",
    validationPassed: "✓ APROBADO",
    validationFailed: "✗ FALLIDO",
    validationSecurity: "SEGURIDAD",
    validationQuality: "CALIDAD",
    validationPass: "PASA",
    validationFail: "FALLA",
    validationNotice: "🔒 Usado solo para esta sesión. Nunca guardado ni registrado.",

    // Build modal
    buildModalTitle: "CONSTRUIR BLUEPRINT",
    buildStep1: "01 — SELECCIONAR MODELO",
    buildStep2: "02 — MODO DE ACCESO",
    buildModeOwnKey: "Mi Clave API",
    buildModeOwnKeySub: "Tu clave, tu coste. Nunca guardada.",
    buildModeCredits: "Créditos de Colaborador",
    buildModeCreditsRemaining: "builds restantes",
    buildModePayg: "Pago por Uso",
    buildModePaygSub: "Próximamente — al precio de la API, sin margen.",
    buildModeUnlockHint: "Sube blueprints para desbloquear el acceso de colaborador",
    buildApiKeyPlaceholder: "sk-...",
    buildSelectMode: "SELECCIONA UN MODO",
    buildStartBtn: "CONSTRUIR CON",
    buildBuilding: "CONSTRUYENDO...",
    buildComplete: "✓ CONSTRUCCIÓN COMPLETA",
    buildCopy: "COPIAR RESULTADO",
    buildAgain: "CONSTRUIR DE NUEVO",

    // Auth modal
    authSignIn: "ENTRAR",
    authCreateAccount: "CREAR CUENTA",
    authWelcome: "Bienvenido de nuevo.",
    authSubtitle: "Sube blueprints, gana karma, construye cosas.",
    authUsername: "Usuario",
    authEmail: "Correo electrónico",
    authPassword: "Contraseña",
    authGitHub: "↗ Continuar con GitHub",
    authNoAccount: "¿Sin cuenta? ",
    authHaveAccount: "¿Ya tienes una? ",
    authSignUpLink: "Regístrate →",
    authSignInLink: "Inicia sesión →",
    authCancel: "cancelar",

    // Coffee modal
    coffeeTitle: "INVÍTAME A UN CAFÉ",
    coffeeDesc1: "Esta plataforma es gratuita y funciona al precio de coste.",
    coffeeDesc2: "Sin inversores. Sin anuncios. Solo la comunidad.",
    coffeeDesc3: "Los donantes obtienen una insignia de supporter y créditos extra.",
    coffeeTier1: "☕  Un café",
    coffeeTier2: "☕☕  Dos cafés",
    coffeeTier3: "🍺  Una cerveza",
    coffeeDecline: "no gracias, quizás más tarde",

    // Tiers
    tierLurker: "OBSERVADOR",
    tierContributor: "COLABORADOR",
    tierSupporter: "SUPPORTER",
    tierAdmin: "ADMIN",

    // Footer
    footerTagline: "GRATIS · ABIERTO · CONSTRUIDO PARA DEMOCRATIZAR LA IA",
    footerPrivacy: "Privacidad",
    footerTerms: "Términos",
    footerGitHub: "GitHub",
  },
};

export const SUPPORTED_LANGS = [
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];
