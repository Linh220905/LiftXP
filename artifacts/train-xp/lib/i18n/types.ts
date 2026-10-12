export type SupportedLocale = 'vi' | 'en';

export interface TranslationDictionary {
  // Navigation & Tabs
  tabs: {
    home: string;
    plan: string;
    workout: string;
    stats: string;
    profile: string;
  };

  // Common UI
  common: {
    back: string;
    next: string;
    continue: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    done: string;
    start: string;
    finish: string;
    search: string;
    loading: string;
    all: string;
    rest: string;
    kg: string;
    lbs: string;
    reps: string;
    sets: string;
    rir: string;
    weight: string;
    day: string;
    days: string;
    week: string;
    month: string;
    year: string;
  };

  // Home Screen
  home: {
    trainingHub: string;
    readyPrompt: string;
    weeklyQuest: string;
    daysTrained: string;
    xpProgress: string;
    level: string;
    startTodayPlan: string;
    noPlanToday: string;
    restDay: string;
    quickLogWeight: string;
    recentWorkouts: string;
    activeTargetMap: string;
    recoveryStatus: string;
    streakCommitment: string;
    logBodyWeight: string;
    weightSubtitle: string;
  };

  // Plan Screen
  plan: {
    title: string;
    subtitle: string;
    weeklySchedule: string;
    tapToAssign: string;
    routines: string;
    createRoutine: string;
    loadStarterPlan: string;
    routineEditor: string;
    routineName: string;
    progressionPolicy: string;
    addExercise: string;
    superset: string;
    unlinkSuperset: string;
    linkSuperset: string;
    removeExercise: string;
    selectExercise: string;
    targetMuscles: string;
    restDayNotice: string;
    assignToDay: string;
  };

  // Workout Screen
  workout: {
    title: string;
    startChooserTitle: string;
    startChooserSub: string;
    todaysRoutine: string;
    startSession: string;
    otherRoutines: string;
    freestyleTitle: string;
    freestyleDesc: string;
    startFreestyle: string;
    liveSession: string;
    finishWorkout: string;
    cancelSession: string;
    addExercise: string;
    restTimer: string;
    skipRest: string;
    setNumber: string;
    targetWeight: string;
    targetReps: string;
    actualReps: string;
    markDone: string;
    effortRir: string;
    summaryTitle: string;
    summarySub: string;
    totalVolume: string;
    completedSets: string;
    musclesHit: string;
    newRecords: string;
    viewAnalytics: string;
  };

  // Stats Screen
  stats: {
    title: string;
    subtitle: string;
    totalWorkouts: string;
    thisMonth: string;
    weekStreak: string;
    weightChange: string;
    activityHeatmap: string;
    muscleBalance: string;
    allSets: string;
    hardSets: string;
    mostTrained: string;
    needsFocus: string;
    effortAnalytics: string;
    averageRir: string;
    nearFailurePct: string;
    bodyweightTrend: string;
    goalLine: string;
    logWeight: string;
    oneRepMaxProgression: string;
    selectExerciseToView: string;
    personalRecords: string;
    recentSessions: string;
  };

  // Profile Screen
  profile: {
    title: string;
    subtitle: string;
    personalInfo: string;
    fitnessGoal: string;
    experienceLevel: string;
    equipment: string;
    targetFocus: string;
    settings: string;
    language: string;
    unitSystem: string;
    proMembership: string;
    resetOnboarding: string;
    proUnlocked: string;
    upgradePro: string;
  };

  // Muscle groups
  muscles: Record<string, string>;

  // Progression names
  progression: {
    linear: string;
    linearDesc: string;
    greyskull: string;
    greyskullDesc: string;
    double: string;
    doubleDesc: string;
    off: string;
    offDesc: string;
  };

  // Onboarding Screen
  onboarding: {
    // Action Buttons
    continue: string;
    skip: string;
    confirmRoutine: string;
    enableNotifications: string;
    claimOffer: string;
    alreadyHaveAccount: string;
    logIn: string;

    // Motivations
    motivations: Record<string, string>;

    // Goals
    goals: Record<string, string>;

    // Sensitive Areas
    sensitiveAreas: Record<string, string>;

    // Experience Options
    experience: Record<string, { label: string; sub: string }>;

    // Body Types
    bodyTypes: Record<string, string>;

    // Equipment
    equipmentCategories: Record<string, string>;
    equipmentItems: Record<string, string>;

    // Muscle Targets
    workoutMuscles: Record<string, string>;

    // Step 0
    nameTitle: string;
    namePlaceholder: string;

    // Step 1
    unitTitle: string;
    unitSubtitle: string;
    imperialLabel: string;
    metricLabel: string;

    // Step 2
    weightTitle: string;
    weightSubtitle: string;

    // Step 3
    heightTitle: string;
    heightSubtitle: string;

    // Step 4
    thinkFitnessTitle: string;
    thinkNever: string;
    thinkSometimes: string;
    thinkOften: string;
    thinkAllTheTime: string;

    // Step 5
    strugglesTitle: string;
    strugglesSubtitle: string;

    // Step 6
    focusAreasTitle: string;
    focusAreasSubtitle: string;
    focusAreas: Record<string, string>;
    frontView: string;
    backView: string;

    // Step 7
    routineTitle: string;
    routineYes: string;
    routineNo: string;

    // Step 8
    equipmentTitle: string;
    equipmentSubtitle: string;

    // Step 9
    lastMusclesTitle: string;

    // Step 10
    durationTitle: string;
    duration45: string;
    duration45Sub: string;
    duration60: string;
    duration60Sub: string;
    duration90: string;
    duration90Sub: string;

    // Step 11
    frequencyTitle: string;
    daysPerWeekTab: string;
    specificDaysTab: string;
    daysPerWeekFmt: string;
    everyDay: string;
    freqSolid: string;
    freqGood: string;
    freqGreat: string;
    freqIncredible: string;
    freqOutstanding: string;

    // Step 12
    relateTitle: string;
    relateQuote: string;
    yes: string;
    no: string;

    // Step 13
    trackProgressTitle: string;
    muscleBalanceProfile: string;
    optimalTrainingSplit: string;
    balancedScore: string;
    trackBenefit1: string;
    trackBenefit2: string;
    trackBenefit3: string;

    // Step 14
    prSquatTitle: string;
    prSquatSubtitle: string;

    // Step 15
    trophyUnlockedTag: string;
    trophyUnlockedTitle: string;
    trophyBenchName: string;
    trophyBenchDesc: string;

    // Step 16
    trophiesProgressTag: string;
    trophiesProgressTitle: string;
    trophiesProgressSubtitle: string;
    trophyBenchMax: string;
    trophyDeadliftMax: string;
    trophySquatMax: string;
    trophyAllStarMax: string;

    // Step 17
    predictSilverTitle: string;
    todayLabel: string;
    dec28Label: string;
    youAreIncredible: string;
    incredibleSubtitle: string;

    // Step 18
    strongerGoalTitle: string;
    strongerGoalBadge: string;

    // Step 19
    speedGoalTitle: string;
    speedGoalHeader: string;
    speedGoalDesc: string;
    weeksLabel: string;

    // Step 20
    levelUpTag: string;
    levelUpTitle: string;
    levelUpSubtitle: string;
    levelProgress: string;

    // Step 21
    preparingRoutine: string;
    completedPct: string;

    // Step 22
    routineOverviewTitle: string;
    routineOverviewDesc: string;
    weeklyGoalLabel: string;
    workoutsCount: string;
    workoutTimeLabel: string;
    designedMuscleGrowth: string;
    designedMuscleGrowthDesc: string;
    workoutsListTitle: string;
    pushWorkoutSub: string;
    pullWorkoutSub: string;
    legsWorkoutSub: string;

    // Step 23
    streakStartTitle: string;
    streakStartHighlight: string;
    streakStartSubtitle: string;
    streakHint: string;

    // Step 24
    commitWorkoutTitle: string;
    commitWorkoutSubtitle: string;
    dayStreakFmt: string;
    moreLikelyGoal: string;

    // Step 25
    enableNotifTitle: string;
    enableNotifSubtitle: string;
    notifRestTitle: string;
    notifRestBody: string;
    notifStreakTitle: string;
    notifStreakBody: string;

    // Step 26
    trustedUsersTitle: string;
    trustedUsersHighlight: string;
    ratingsCount: string;
    ratingsLabel: string;
    workoutsCountStat: string;
    workoutsLabel: string;
    testimonialTitle: string;
    testimonialBody: string;
    testimonialAuthor: string;

    // Step 27
    pledgeTitle: string;
    pledgeBody: string;
    tapAndHoldCommit: string;

    // Step 28
    youAreReady: string;
  };

  // Paywall Modal
  paywall: {
    restorePurchases: string;
    heroTitle: string;
    heroSubtitle: string;
    featureTitle: string;
    feature1: string;
    feature2: string;
    feature3: string;
    feature4: string;
    discountBadge: string;
    discountSub: string;
    specialDeal: string;
    perYear: string;
    perMonth: string;
    perWeek: string;
    bestValueBadge: string;
    annualTitle: string;
    annualSub: string;
    annualDesc: string;
    annualPerMonth: string;
    monthlyTitle: string;
    monthlySub: string;
    monthlyDesc: string;
    weeklyTitle: string;
    weeklySub: string;
    weeklyDesc: string;
    startTrialCta: string;
    startCta: string;
    noCommitment: string;
    purchaseError: string;
    purchaseErrorDefault: string;
    restoreSuccess: string;
    restoreSuccessDesc: string;
    noSubFound: string;
    noSubFoundDesc: string;
    restoreFailed: string;
    restoreFailedDesc: string;
    termsOfUse: string;
    privacyPolicy: string;
    autoRenewDisclosure: string;
    downsellTitle: string;
    downsellDesc: string;
    downsellCta: string;
    downsellDismiss: string;
  };
}
