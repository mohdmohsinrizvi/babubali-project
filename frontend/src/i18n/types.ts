export type LanguageCode = 'en' | 'hi' | 'ur' | 'ta' | 'te';

export type LanguageDirection = 'ltr' | 'rtl';

export interface LanguageInfo {
  code: LanguageCode;
  label: string;
  nativeName: string;
  dir: LanguageDirection;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', label: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'hi', label: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'ur', label: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  { code: 'ta', label: 'Tamil', nativeName: 'தமிழ்', dir: 'ltr' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు', dir: 'ltr' },
];

export interface TranslationSchema {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    back: string;
    loading: string;
    error: string;
    retry: string;
    close: string;
    confirm: string;
    confirmed: string;
    openFile: string;
    copyJson: string;
    viewFile: string;
    yes: string;
    no: string;
    actions: string;
    status: string;
    empty: string;
    size: string;
    kb: string;
    sqFt: string;
    ft: string;
    notSet: string;
  };
  nav: {
    brand: string;
    myProjects: string;
    newProject: string;
    footerTagline: string;
    footerSub: string;
  };
  home: {
    heroEyebrow: string;
    heroTitle: string;
    heroLead: string;
    heroSub: string;
    getStarted: string;
    viewMyProjects: string;
    modulesHeading: string;
    modulesSub: string;
    planned: string;
    capabilities: {
      plansTitle: string;
      plansDesc: string;
      analysisTitle: string;
      analysisDesc: string;
      quantityTitle: string;
      quantityDesc: string;
      costTitle: string;
      costDesc: string;
      labourTitle: string;
      labourDesc: string;
      interactive3dTitle: string;
      interactive3dDesc: string;
      reportsTitle: string;
      reportsDesc: string;
    };
  };
  workspace: {
    backToProjects: string;
    loadingProject: string;
    couldNotLoad: string;
    projectNotFound: string;
    comingSoon: string;
    projectDetails: string;
    projectModules: string;
    planned: string;
    tabs: {
      overview: string;
      plans: string;
      analysis: string;
      estimation: string;
      materials: string;
      labour: string;
      interactive3d: string;
      reports: string;
    };
    tabDescriptions: {
      overview: string;
      plans: string;
      analysis: string;
      estimation: string;
      materials: string;
      labour: string;
      interactive3d: string;
      reports: string;
    };
    details: {
      id: string;
      name: string;
      state: string;
      district: string;
      city: string;
      constructionType: string;
      landArea: string;
      builtUpArea: string;
      floors: string;
      budget: string;
      status: string;
      created: string;
      updated: string;
    };
  };
  plans: {
    pageTitle: string;
    pageSubtitle: string;
    uploadNewPlan: string;
    noDrawingUploaded: string;
    emptyCardDesc: string;
    uploadDrawing: string;
    viewFile: string;
    runAiAnalysis: string;
    viewAnalysis: string;
    deletePlan: string;
    confirmDeletePlan: string;
    modalTitle: string;
    floorLevel: string;
    level0: string;
    level1: string;
    level2: string;
    level3: string;
    level4: string;
    structuralFoundation: string;
    planType: string;
    architectural: string;
    structural: string;
    electrical: string;
    plumbing: string;
    drawingFile: string;
    selectFileNote: string;
    uploadButton: string;
    uploadingButton: string;
    validationSelectFile: string;
    validationError: string;
    groundFloor: string;
    firstFloor: string;
    secondFloor: string;
    floorN: string;
  };
  analysis: {
    pageTitle: string;
    pageSubtitle: string;
    confirmAnalysisBtn: string;
    confirmingBtn: string;
    analysisConfirmedBadge: string;
    emptyTitle: string;
    emptyDesc: string;
    goToPlansBtn: string;
    aiSettingsTitle: string;
    geminiConfiguredMsg: string;
    deterministicMsg: string;
    closeSettings: string;
    changeKey: string;
    configureKey: string;
    keyPlaceholder: string;
    saveKey: string;
    keySaved: string;
    freeKeyLink: string;
    activeDrawing: string;
    hideDrawing: string;
    showDrawing: string;
    member3Contract: string;
    hideContract: string;
    copyContractSuccess: string;
    contractTitle: string;
    contractDesc: string;
    readyTitle: string;
    readyDesc: string;
    runAiExtractionBtn: string;
    scanningExtractingBtn: string;
    reRunAiExtraction: string;
    reAnalyzing: string;
    metricStatus: string;
    metricArea: string;
    metricConfidence: string;
    metricRooms: string;
    drawingReference: string;
    roomsTitle: string;
    roomsSubtitle: string;
    addMissingRoomBtn: string;
    colRoomName: string;
    colType: string;
    colLength: string;
    colWidth: string;
    colArea: string;
    colAction: string;
    openingsTitle: string;
    openingsSubtitle: string;
    staircase: string;
    flights: string;
    count: string;
    addRoomModalTitle: string;
    fieldRoomName: string;
    placeholderRoomName: string;
    fieldRoomType: string;
    fieldLength: string;
    fieldWidth: string;
    saveRoomBtn: string;
    roomTypes: {
      bedroom: string;
      living: string;
      kitchen: string;
      bathroom: string;
      balcony: string;
      study: string;
      utility: string;
    };
  };
  estimation: {
    title: string;
    subtitle: string;
    costSummary: string;
    materialCost: string;
    labourCost: string;
    equipmentCost: string;
    overheads: string;
    totalCost: string;
    perSqFtCost: string;
    calculateEstimate: string;
    downloadEstimate: string;
  };
  materials: {
    title: string;
    subtitle: string;
    cement: string;
    steel: string;
    bricks: string;
    sand: string;
    aggregate: string;
    paint: string;
    tiles: string;
    quantity: string;
    unitRate: string;
    totalAmount: string;
  };
  labour: {
    title: string;
    subtitle: string;
    masons: string;
    carpenters: string;
    plumbers: string;
    electricians: string;
    painters: string;
    helpers: string;
    totalDays: string;
    crewSize: string;
  };
  visualization: {
    title: string;
    subtitle: string;
    model3d: string;
    rotateView: string;
    wireframe: string;
    walls: string;
    slab: string;
    exportGltf: string;
  };
  reports: {
    title: string;
    subtitle: string;
    generateReport: string;
    downloadPdf: string;
    costSummaryReport: string;
    structuralSummaryReport: string;
    clientPresentation: string;
  };
}
