const STORAGE_KEY = "progress-tracker-pro.v1";
const DEFAULT_THEME = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
const PRIORITY_VALUES = ["Critical", "High", "Medium", "Low"];
const VIEW_NAMES = ["dashboard", "trackers", "graphs", "history"];
const AUTH_MODES = ["create", "login"];
const OTP_TTL_MINUTES = 10;
const MAIL_FEED_LIMIT = 60;
const BACKEND_API_BASE = window.PROGRESS_TRACKER_API_BASE || "https://progresstracker-1.onrender.com";
const BACKEND_ORIGIN = BACKEND_API_BASE.replace(/\/api\/?$/, "");
const BACKEND_FETCH_TIMEOUT_MS = 9000;
// REFACTOR
// Match backend Joi validation for paginated goal fetches so post-save sync never fails on limit overflow.
const BACKEND_PAGE_LIMIT = 50;
const FOCUS_TICK_MS = 1000;
const LOCAL_SYNC_MODE = "local";
const BACKEND_SYNC_MODE = "backend";
const TRACKER_TEMPLATE_LIBRARY = {
  Coding: {
    category: "Coding",
    goalType: "Deep work coverage",
    unitType: "hours",
    accentColor: "#63d3ff",
    icon: "💻",
    notes: "Track focused coding hours, problem-solving depth, and shipping consistency without cluttering the workflow.",
    customFields: [
      { label: "Language", value: "JavaScript" },
      { label: "Focus target", value: "Deep work" },
      { label: "Ship goal", value: "3 commits / week" }
    ]
  },
  Trading: {
    category: "Trading",
    goalType: "Execution quality",
    unitType: "custom",
    unitLabel: "trades",
    accentColor: "#ff8f6b",
    icon: "📈",
    notes: "Review setups, execution quality, and emotional discipline instead of only chasing outcomes.",
    customFields: [
      { label: "Entry price", value: "0.00" },
      { label: "Exit price", value: "0.00" },
      { label: "RR ratio", value: "1.5R" },
      { label: "Result", value: "Win / Loss" },
      { label: "Emotion", value: "Calm" }
    ]
  },
  Fitness: {
    category: "Fitness",
    goalType: "Training volume",
    unitType: "sessions",
    accentColor: "#6df1b1",
    icon: "🏋️",
    notes: "Build momentum with sessions, lifts, recovery notes, and short reflections after each workout.",
    customFields: [
      { label: "Workout split", value: "Upper / Lower" },
      { label: "Primary lift", value: "Squat" },
      { label: "Recovery", value: "7h sleep" }
    ]
  },
  Study: {
    category: "Study",
    goalType: "Syllabus coverage",
    unitType: "hours",
    accentColor: "#b48cff",
    icon: "📚",
    notes: "Track chapters, revision blocks, and exam prep with enough structure to see real consistency.",
    customFields: [
      { label: "Subject", value: "Algorithms" },
      { label: "Exam", value: "Upcoming test" },
      { label: "Topic block", value: "Revision" }
    ]
  }
};

const ui = {
  activeView: "dashboard",
  selectedTrackerId: null,
  trackerModalMode: "create",
  authMode: "create",
  guideAutoQueued: false,
  filters: {
    query: "",
    category: "all",
    status: "all",
    priority: "all",
    sort: "recentlyUpdated"
  },
  history: {
    trackerId: "all",
    query: "",
    type: "all"
  },
  logProof: {
    dataUrl: "",
    name: "",
    processing: false
  },
  confirmAction: null,
  focusTimerHandle: 0
};

const boot = {
  seeded: false
};

let state = null;
let lastSyncWarningAt = 0;

const dom = {};
const REVEAL_TARGET_SELECTOR = [
  ".topbar",
  ".hero",
  ".hero-mini-grid > *",
  ".stats-grid > *",
  ".dashboard-panel",
  ".graph-panel",
  ".graph-tracker-card",
  ".mail-dashboard-panel",
  ".history-summary-card",
  ".history-timeline-panel",
  ".filter-toolbar",
  ".history-toolbar",
  ".tracker-card",
  ".stack-item",
  ".history-group",
  ".history-item",
  ".detail-hero",
  ".detail-section",
  ".auth-mail-card",
  ".mail-card"
].join(", ");
const cursorFx = {
  enabled: false,
  layer: null,
  halo: null,
  dot: null,
  frame: 0,
  x: window.innerWidth * 0.5,
  y: window.innerHeight * 0.24,
  lastSpawnAt: 0,
  lastSpawnX: null,
  lastSpawnY: null
};
const revealFx = {
  enabled: false,
  observer: null
};

// REFACTOR
function getUiState() {
  return ui;
}

// REFACTOR
function getDataState() {
  return state;
}

// REFACTOR
function getAuthState() {
  return state?.settings || {};
}

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheDom();
  setupRevealFx();
  setupCursorFx();
  state = loadState();
  await hydrateBackendSession();
  checkForPasswordResetToken();
  if (isAuthenticated() && isBackendAuthSession()) {
    try {
      await syncWorkspaceFromBackend();
    } catch (error) {
      console.error(error);
    }
  }
  bindEvents();
  setStaticUiDefaults();
  renderApp();
}

function cacheDom() {
  dom.body = document.body;
  dom.authShell = document.getElementById("authShell");
  dom.authPreviewTrackers = document.getElementById("authPreviewTrackers");
  dom.authPreviewLogs = document.getElementById("authPreviewLogs");
  dom.authPreviewCategories = document.getElementById("authPreviewCategories");
  dom.authEyebrow = document.getElementById("authEyebrow");
  dom.authTitle = document.getElementById("authTitle");
  dom.authSubtitle = document.getElementById("authSubtitle");
  dom.authCreateModeBtn = document.getElementById("authCreateModeBtn");
  dom.authLoginModeBtn = document.getElementById("authLoginModeBtn");
  dom.authForm = document.getElementById("authForm");
  dom.authNameInput = document.getElementById("authNameInput");
  dom.authEmailInput = document.getElementById("authEmailInput");
  dom.authPasswordInput = document.getElementById("authPasswordInput");
  dom.authConfirmField = document.getElementById("authConfirmField");
  dom.authConfirmInput = document.getElementById("authConfirmInput");
  dom.authModePill = document.getElementById("authModePill");
  dom.authHintText = document.getElementById("authHintText");
  dom.authOtpShell = document.getElementById("authOtpShell");
  dom.authOtpStatus = document.getElementById("authOtpStatus");
  dom.authOtpInput = document.getElementById("authOtpInput");
  dom.authOtpDeliveryText = document.getElementById("authOtpDeliveryText");
  dom.authResendOtpBtn = document.getElementById("authResendOtpBtn");
  dom.authResetOtpBtn = document.getElementById("authResetOtpBtn");
  dom.authForgotPasswordBtn = document.getElementById("authForgotPasswordBtn");
  dom.authSubmitBtn = document.getElementById("authSubmitBtn");
  dom.authResetShell = document.getElementById("authResetShell");
  dom.authResetStatus = document.getElementById("authResetStatus");
  dom.authResetHelpText = document.getElementById("authResetHelpText");
  dom.authForgotEmailField = document.getElementById("authForgotEmailField");
  dom.authForgotEmailInput = document.getElementById("authForgotEmailInput");
  dom.authResetPasswordField = document.getElementById("authResetPasswordField");
  dom.authResetPasswordInput = document.getElementById("authResetPasswordInput");
  dom.authResetConfirmField = document.getElementById("authResetConfirmField");
  dom.authResetConfirmInput = document.getElementById("authResetConfirmInput");
  dom.authResetSubmitBtn = document.getElementById("authResetSubmitBtn");
  dom.authResetBackBtn = document.getElementById("authResetBackBtn");
  dom.authMailPreviewCard = document.getElementById("authMailPreviewCard");
  dom.authMailPreviewSubject = document.getElementById("authMailPreviewSubject");
  dom.authMailPreviewState = document.getElementById("authMailPreviewState");
  dom.authMailPreviewBody = document.getElementById("authMailPreviewBody");
  dom.authMailPreviewMeta = document.getElementById("authMailPreviewMeta");
  dom.authMailPreviewCode = document.getElementById("authMailPreviewCode");
  dom.openGuideFromAuthBtn = document.getElementById("openGuideFromAuthBtn");
  dom.authLoginActions = document.getElementById("authLoginActions");
  dom.navButtons = Array.from(document.querySelectorAll("[data-view-target]"));
  dom.viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));

  dom.sidebarRing = document.getElementById("sidebarRing");
  dom.sidebarCompletionLabel = document.getElementById("sidebarCompletionLabel");
  dom.sidebarTrackerCount = document.getElementById("sidebarTrackerCount");
  dom.sidebarSummary = document.getElementById("sidebarSummary");

  dom.todayChip = document.getElementById("todayChip");
  dom.topbarSubtitle = document.getElementById("topbarSubtitle");
  dom.accountChip = document.getElementById("accountChip");
  dom.accountAvatar = document.getElementById("accountAvatar");
  dom.accountNameLabel = document.getElementById("accountNameLabel");
  dom.accountMetaLabel = document.getElementById("accountMetaLabel");
  dom.themeToggleBtn = document.getElementById("themeToggleBtn");
  dom.themeToggleIcon = document.getElementById("themeToggleIcon");
  dom.mailCenterBtn = document.getElementById("mailCenterBtn");
  dom.mailCenterUnreadCount = document.getElementById("mailCenterUnreadCount");
  dom.openGuideModalBtn = document.getElementById("openGuideModalBtn");

  dom.sidebarCreateBtn = document.getElementById("sidebarCreateBtn");
  dom.openTrackerModalBtn = document.getElementById("openTrackerModalBtn");
  dom.heroCreateBtn = document.getElementById("heroCreateBtn");
  dom.trackersCreateBtn = document.getElementById("trackersCreateBtn");
  dom.emptyCreateBtn = document.getElementById("emptyCreateBtn");
  dom.heroTrackersBtn = document.getElementById("heroTrackersBtn");
  dom.openNotionBtn = document.getElementById("openNotionBtn");
  dom.mobileCreateBtn = document.getElementById("mobileCreateBtn");

  dom.exportBtn = document.getElementById("exportBtn");
  dom.sidebarExportBtn = document.getElementById("sidebarExportBtn");
  dom.historyExportBtn = document.getElementById("historyExportBtn");
  dom.importBtn = document.getElementById("importBtn");
  dom.sidebarImportBtn = document.getElementById("sidebarImportBtn");
  dom.importFileInput = document.getElementById("importFileInput");
  dom.logoutBtn = document.getElementById("logoutBtn");

  dom.heroRing = document.getElementById("heroRing");
  dom.heroRingLabel = document.getElementById("heroRingLabel");
  dom.heroCompletionValue = document.getElementById("heroCompletionValue");
  dom.heroCompletionNote = document.getElementById("heroCompletionNote");
  dom.heroTodayMetric = document.getElementById("heroTodayMetric");
  dom.heroTodayNote = document.getElementById("heroTodayNote");
  dom.heroDueSoonMetric = document.getElementById("heroDueSoonMetric");
  dom.heroDueSoonNote = document.getElementById("heroDueSoonNote");
  dom.heroTopCategoryMetric = document.getElementById("heroTopCategoryMetric");
  dom.heroTopCategoryNote = document.getElementById("heroTopCategoryNote");
  dom.heroWeeklyMetric = document.getElementById("heroWeeklyMetric");
  dom.heroWeeklyNote = document.getElementById("heroWeeklyNote");
  dom.todayProgressPercent = document.getElementById("todayProgressPercent");
  dom.todayProgressValue = document.getElementById("todayProgressValue");
  dom.todayProgressNote = document.getElementById("todayProgressNote");
  dom.todayProgressFill = document.getElementById("todayProgressFill");
  dom.todayProgressWarning = document.getElementById("todayProgressWarning");
  dom.todayQuickLogBtn = document.getElementById("todayQuickLogBtn");
  dom.globalStreakPill = document.getElementById("globalStreakPill");
  dom.globalStreakValue = document.getElementById("globalStreakValue");
  dom.globalStreakNote = document.getElementById("globalStreakNote");
  dom.priorityActiveGoalsPill = document.getElementById("priorityActiveGoalsPill");
  dom.priorityActiveGoalsValue = document.getElementById("priorityActiveGoalsValue");
  dom.priorityActiveGoalsNote = document.getElementById("priorityActiveGoalsNote");

  dom.statTotalTrackers = document.getElementById("statTotalTrackers");
  dom.statTotalTrackersMeta = document.getElementById("statTotalTrackersMeta");
  dom.statActiveGoals = document.getElementById("statActiveGoals");
  dom.statActiveGoalsMeta = document.getElementById("statActiveGoalsMeta");
  dom.statCompletedGoals = document.getElementById("statCompletedGoals");
  dom.statCompletedGoalsMeta = document.getElementById("statCompletedGoalsMeta");
  dom.statTodayProgress = document.getElementById("statTodayProgress");
  dom.statTodayProgressMeta = document.getElementById("statTodayProgressMeta");
  dom.statWeeklyProgress = document.getElementById("statWeeklyProgress");
  dom.statWeeklyProgressMeta = document.getElementById("statWeeklyProgressMeta");
  dom.statOverallCompletion = document.getElementById("statOverallCompletion");
  dom.statOverallCompletionMeta = document.getElementById("statOverallCompletionMeta");

  dom.weeklyChart = document.getElementById("weeklyChart");
  dom.weeklyDeltaLabel = document.getElementById("weeklyDeltaLabel");
  dom.weeklySummaryText = document.getElementById("weeklySummaryText");
  dom.categoryBreakdown = document.getElementById("categoryBreakdown");
  dom.upcomingList = document.getElementById("upcomingList");
  dom.recentActivityList = document.getElementById("recentActivityList");
  dom.heatmapGrid = document.getElementById("heatmapGrid");
  dom.heatmapLegendLabel = document.getElementById("heatmapLegendLabel");
  dom.insightsSummaryPill = document.getElementById("insightsSummaryPill");
  dom.insightsSummaryText = document.getElementById("insightsSummaryText");
  dom.insightsGrid = document.getElementById("insightsGrid");
  dom.focusTrackerSelect = document.getElementById("focusTrackerSelect");
  dom.focusModeState = document.getElementById("focusModeState");
  dom.focusTimerValue = document.getElementById("focusTimerValue");
  dom.focusTimerNote = document.getElementById("focusTimerNote");
  dom.focusStartBtn = document.getElementById("focusStartBtn");
  dom.focusStopBtn = document.getElementById("focusStopBtn");
  dom.dashboardMailSummary = document.getElementById("dashboardMailSummary");
  dom.dashboardMailList = document.getElementById("dashboardMailList");
  dom.openMailCenterFromDashboardBtn = document.getElementById("openMailCenterFromDashboardBtn");

  dom.trackersSummaryText = document.getElementById("trackersSummaryText");
  dom.trackerSearchInput = document.getElementById("trackerSearchInput");
  dom.categoryFilter = document.getElementById("categoryFilter");
  dom.statusFilter = document.getElementById("statusFilter");
  dom.priorityFilter = document.getElementById("priorityFilter");
  dom.sortFilter = document.getElementById("sortFilter");
  dom.trackerGrid = document.getElementById("trackerGrid");
  dom.trackerEmptyState = document.getElementById("trackerEmptyState");
  dom.trackerEmptyText = document.getElementById("trackerEmptyText");

  dom.graphsSummaryText = document.getElementById("graphsSummaryText");
  dom.graphsOpenTrackersBtn = document.getElementById("graphsOpenTrackersBtn");
  dom.graphMetrics = document.getElementById("graphMetrics");
  dom.graphWeeklyDeltaLabel = document.getElementById("graphWeeklyDeltaLabel");
  dom.graphWeeklyVisual = document.getElementById("graphWeeklyVisual");
  dom.graphWeeklyNote = document.getElementById("graphWeeklyNote");
  dom.graphTrackerCompare = document.getElementById("graphTrackerCompare");
  dom.graphCategoryCompare = document.getElementById("graphCategoryCompare");
  dom.graphHeatmapLegend = document.getElementById("graphHeatmapLegend");
  dom.graphHeatmapGrid = document.getElementById("graphHeatmapGrid");
  dom.graphGalleryCount = document.getElementById("graphGalleryCount");
  dom.graphTrackerBoards = document.getElementById("graphTrackerBoards");

  dom.historySummaryText = document.getElementById("historySummaryText");
  dom.historyTrackerFilter = document.getElementById("historyTrackerFilter");
  dom.historySearchInput = document.getElementById("historySearchInput");
  dom.historyTypeFilter = document.getElementById("historyTypeFilter");
  dom.historySnapshotTitle = document.getElementById("historySnapshotTitle");
  dom.historySnapshotText = document.getElementById("historySnapshotText");
  dom.historyTimeline = document.getElementById("historyTimeline");
  dom.historyEmptyState = document.getElementById("historyEmptyState");

  dom.drawerScrim = document.getElementById("drawerScrim");
  dom.detailDrawer = document.getElementById("detailDrawer");
  dom.drawerBody = document.getElementById("drawerBody");
  dom.closeDetailBtn = document.getElementById("closeDetailBtn");
  dom.detailBadge = document.getElementById("detailBadge");
  dom.detailCategoryLabel = document.getElementById("detailCategoryLabel");
  dom.detailTitle = document.getElementById("detailTitle");
  dom.detailSubtitle = document.getElementById("detailSubtitle");
  dom.detailHeroCard = document.getElementById("detailHeroCard");
  dom.detailProgressVisuals = document.getElementById("detailProgressVisuals");
  dom.detailMetaGrid = document.getElementById("detailMetaGrid");
  dom.detailNotes = document.getElementById("detailNotes");
  dom.detailCustomFields = document.getElementById("detailCustomFields");
  dom.detailHistoryCount = document.getElementById("detailHistoryCount");
  dom.detailLogList = document.getElementById("detailLogList");
  dom.detailSaveLogBtn = document.getElementById("detailSaveLogBtn");
  dom.editSelectedTrackerBtn = document.getElementById("editSelectedTrackerBtn");
  dom.archiveSelectedTrackerBtn = document.getElementById("archiveSelectedTrackerBtn");
  dom.resetSelectedTrackerBtn = document.getElementById("resetSelectedTrackerBtn");
  dom.deleteSelectedTrackerBtn = document.getElementById("deleteSelectedTrackerBtn");

  dom.logForm = document.getElementById("logForm");
  dom.logTrackerId = document.getElementById("logTrackerId");
  dom.editingLogId = document.getElementById("editingLogId");
  dom.logAmountInput = document.getElementById("logAmountInput");
  dom.logDateInput = document.getElementById("logDateInput");
  dom.logTagInput = document.getElementById("logTagInput");
  dom.logNoteInput = document.getElementById("logNoteInput");
  dom.logProofTriggerBtn = document.getElementById("logProofTriggerBtn");
  dom.logProofInlineBtn = document.getElementById("logProofInlineBtn");
  dom.logProofInput = document.getElementById("logProofInput");
  dom.logProofStatusBadge = document.getElementById("logProofStatusBadge");
  dom.logProofStatusText = document.getElementById("logProofStatusText");
  dom.logProofUploadTitle = document.getElementById("logProofUploadTitle");
  dom.logProofUploadText = document.getElementById("logProofUploadText");
  dom.logProofPreview = document.getElementById("logProofPreview");
  dom.logProofThumb = document.getElementById("logProofThumb");
  dom.logProofName = document.getElementById("logProofName");
  dom.removeLogProofBtn = document.getElementById("removeLogProofBtn");
  dom.logSubmitBtn = document.getElementById("logSubmitBtn");
  dom.cancelLogEditBtn = document.getElementById("cancelLogEditBtn");
  dom.logFormStateLabel = document.getElementById("logFormStateLabel");

  dom.trackerModal = document.getElementById("trackerModal");
  dom.closeTrackerModalBtn = document.getElementById("closeTrackerModalBtn");
  dom.cancelTrackerModalBtn = document.getElementById("cancelTrackerModalBtn");
  dom.trackerModalTitle = document.getElementById("trackerModalTitle");
  dom.trackerModalSubtitle = document.getElementById("trackerModalSubtitle");
  dom.trackerModalHelperCard = document.getElementById("trackerModalHelperCard");
  dom.trackerModalHelperText = document.getElementById("trackerModalHelperText");
  dom.openLoggerFromModalBtn = document.getElementById("openLoggerFromModalBtn");
  dom.trackerForm = document.getElementById("trackerForm");
  dom.trackerIdInput = document.getElementById("trackerIdInput");
  dom.trackerTemplateSelect = document.getElementById("trackerTemplateSelect");
  dom.trackerTemplateHint = document.getElementById("trackerTemplateHint");
  dom.trackerTitleInput = document.getElementById("trackerTitleInput");
  dom.trackerCreatorInput = document.getElementById("trackerCreatorInput");
  dom.trackerCategoryInput = document.getElementById("trackerCategoryInput");
  dom.trackerItemInput = document.getElementById("trackerItemInput");
  dom.trackerGoalTypeInput = document.getElementById("trackerGoalTypeInput");
  dom.trackerUnitTypeSelect = document.getElementById("trackerUnitTypeSelect");
  dom.customUnitField = document.getElementById("customUnitField");
  dom.trackerCustomUnitInput = document.getElementById("trackerCustomUnitInput");
  dom.trackerStartValueInput = document.getElementById("trackerStartValueInput");
  dom.trackerCurrentValueInput = document.getElementById("trackerCurrentValueInput");
  dom.trackerTargetValueInput = document.getElementById("trackerTargetValueInput");
  dom.trackerDeadlineInput = document.getElementById("trackerDeadlineInput");
  dom.trackerPrioritySelect = document.getElementById("trackerPrioritySelect");
  dom.trackerAccentInput = document.getElementById("trackerAccentInput");
  dom.trackerAccentPreview = document.getElementById("trackerAccentPreview");
  dom.trackerIconInput = document.getElementById("trackerIconInput");
  dom.iconChoiceRow = document.getElementById("iconChoiceRow");
  dom.trackerNotesInput = document.getElementById("trackerNotesInput");
  dom.addCustomFieldBtn = document.getElementById("addCustomFieldBtn");
  dom.customFieldList = document.getElementById("customFieldList");
  dom.customFieldRowTemplate = document.getElementById("customFieldRowTemplate");

  dom.confirmModal = document.getElementById("confirmModal");
  dom.confirmModalTitle = document.getElementById("confirmModalTitle");
  dom.confirmModalMessage = document.getElementById("confirmModalMessage");
  dom.confirmCancelBtn = document.getElementById("confirmCancelBtn");
  dom.confirmAcceptBtn = document.getElementById("confirmAcceptBtn");

  dom.mailModal = document.getElementById("mailModal");
  dom.mailModalSummary = document.getElementById("mailModalSummary");
  dom.mailModalAddress = document.getElementById("mailModalAddress");
  dom.mailModalUnread = document.getElementById("mailModalUnread");
  dom.mailModalLastDelivery = document.getElementById("mailModalLastDelivery");
  dom.mailModalList = document.getElementById("mailModalList");
  dom.closeMailModalBtn = document.getElementById("closeMailModalBtn");

  dom.guideModal = document.getElementById("guideModal");
  dom.guideModalSubtitle = document.getElementById("guideModalSubtitle");
  dom.closeGuideModalBtn = document.getElementById("closeGuideModalBtn");
  dom.guideCloseBtn = document.getElementById("guideCloseBtn");
  dom.guideOpenGraphsBtn = document.getElementById("guideOpenGraphsBtn");
  dom.guideCreateTrackerBtn = document.getElementById("guideCreateTrackerBtn");
  dom.guideAuthHint = document.getElementById("guideAuthHint");

  dom.proofModal = document.getElementById("proofModal");
  dom.proofModalImage = document.getElementById("proofModalImage");
  dom.proofModalCaption = document.getElementById("proofModalCaption");
  dom.closeProofModalBtn = document.getElementById("closeProofModalBtn");

  dom.toastContainer = document.getElementById("toastContainer");
}

function bindEvents() {
  dom.navButtons.forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.viewTarget));
  });

  [
    dom.sidebarCreateBtn,
    dom.openTrackerModalBtn,
    dom.heroCreateBtn,
    dom.trackersCreateBtn,
    dom.emptyCreateBtn,
    dom.mobileCreateBtn
  ].forEach((button) => {
    button.addEventListener("click", () => openTrackerModal("create"));
  });
  dom.todayQuickLogBtn.addEventListener("click", handleTodayQuickLog);

  dom.heroTrackersBtn.addEventListener("click", () => setView("trackers"));
  if (dom.openNotionBtn) {
    dom.openNotionBtn.addEventListener("click", () => {
      window.open("https://www.notion.so/", "_blank", "noopener,noreferrer");
    });
  }
  dom.graphsOpenTrackersBtn.addEventListener("click", () => setView("trackers"));
  dom.logoutBtn.addEventListener("click", handleLogoutRequest);

  [dom.exportBtn, dom.sidebarExportBtn, dom.historyExportBtn].forEach((button) => {
    button.addEventListener("click", exportStateSnapshot);
  });

  [dom.importBtn, dom.sidebarImportBtn].forEach((button) => {
    button.addEventListener("click", () => dom.importFileInput.click());
  });

  dom.authCreateModeBtn.addEventListener("click", () => setAuthMode("create"));
  dom.authLoginModeBtn.addEventListener("click", () => setAuthMode("login"));
  dom.authForm.addEventListener("submit", handleAuthSubmit);
  dom.openGuideFromAuthBtn.addEventListener("click", () => openGuideModal("auth"));
  dom.authResendOtpBtn.addEventListener("click", () => {
    void issueAuthOtp(true);
  });
  dom.authResetOtpBtn.addEventListener("click", () => {
    clearPendingAuthOtp();
    syncAuthOtpUi();
    renderMailSurfaces();
    dom.authEmailInput.focus();
  });
  dom.authForgotPasswordBtn.addEventListener("click", () => {
    setAuthMode("login", false);
    openForgotPasswordFlow();
  });
  dom.authResetSubmitBtn.addEventListener("click", handlePasswordResetSubmit);
  dom.authResetBackBtn.addEventListener("click", () => {
    closeForgotPasswordFlow();
    setAuthMode("login", false);
  });
  dom.importFileInput.addEventListener("change", handleImportFile);
  dom.themeToggleBtn.addEventListener("click", toggleTheme);
  dom.mailCenterBtn.addEventListener("click", openMailModal);
  dom.openGuideModalBtn.addEventListener("click", () => openGuideModal("workspace"));
  dom.openMailCenterFromDashboardBtn.addEventListener("click", openMailModal);
  dom.focusTrackerSelect.addEventListener("change", () => {
    syncFocusModeUi();
  });
  dom.focusStartBtn.addEventListener("click", startFocusSession);
  dom.focusStopBtn.addEventListener("click", () => {
    void stopFocusSession(true);
  });

  dom.trackerSearchInput.addEventListener("input", () => {
    ui.filters.query = dom.trackerSearchInput.value.trim();
    renderTrackers();
  });

  dom.categoryFilter.addEventListener("change", () => {
    ui.filters.category = dom.categoryFilter.value;
    renderTrackers();
  });

  dom.statusFilter.addEventListener("change", () => {
    ui.filters.status = dom.statusFilter.value;
    renderTrackers();
  });

  dom.priorityFilter.addEventListener("change", () => {
    ui.filters.priority = dom.priorityFilter.value;
    renderTrackers();
  });

  dom.sortFilter.addEventListener("change", () => {
    ui.filters.sort = dom.sortFilter.value;
    renderTrackers();
  });

  dom.historyTrackerFilter.addEventListener("change", () => {
    ui.history.trackerId = dom.historyTrackerFilter.value;
    renderHistory();
  });

  dom.historySearchInput.addEventListener("input", () => {
    ui.history.query = dom.historySearchInput.value.trim();
    renderHistory();
  });

  dom.historyTypeFilter.addEventListener("change", () => {
    ui.history.type = dom.historyTypeFilter.value;
    renderHistory();
  });

  dom.categoryBreakdown.addEventListener("click", handleDashboardListClicks);
  dom.upcomingList.addEventListener("click", handleDashboardListClicks);
  dom.recentActivityList.addEventListener("click", handleDashboardListClicks);
  dom.graphTrackerCompare.addEventListener("click", handleDashboardListClicks);
  dom.graphCategoryCompare.addEventListener("click", handleDashboardListClicks);
  dom.graphTrackerBoards.addEventListener("click", handleDashboardListClicks);
  dom.trackerGrid.addEventListener("click", handleTrackerGridClick);
  dom.historyTimeline.addEventListener("click", handleHistoryClick);
  dom.detailLogList.addEventListener("click", handleDetailLogClick);

  dom.closeDetailBtn.addEventListener("click", closeDetailDrawer);
  dom.drawerScrim.addEventListener("click", closeDetailDrawer);

  dom.logForm.addEventListener("submit", handleLogSubmit);
  dom.cancelLogEditBtn.addEventListener("click", () => resetLogForm(true));
  dom.logProofTriggerBtn.addEventListener("click", () => dom.logProofInput.click());
  dom.logProofInlineBtn.addEventListener("click", () => dom.logProofInput.click());
  dom.logProofInput.addEventListener("change", handleLogProofChange);
  dom.removeLogProofBtn.addEventListener("click", clearPendingLogProof);

  dom.editSelectedTrackerBtn.addEventListener("click", () => {
    if (ui.selectedTrackerId) {
      openTrackerModal("edit", ui.selectedTrackerId);
    }
  });

  dom.archiveSelectedTrackerBtn.addEventListener("click", () => {
    if (!ui.selectedTrackerId) return;
    const tracker = findTracker(ui.selectedTrackerId);
    if (!tracker) return;

    const isArchiving = !tracker.archived;
    openConfirm({
      title: isArchiving ? "Archive tracker" : "Restore tracker",
      message: isArchiving
        ? `Archive "${tracker.title}"? You can restore it later from the Archived filter.`
        : `Restore "${tracker.title}" to your live workspace?`,
      action: () => {
        toggleArchiveTracker(tracker.id);
      }
    });
  });

  dom.resetSelectedTrackerBtn.addEventListener("click", () => {
    if (!ui.selectedTrackerId) return;
    const tracker = findTracker(ui.selectedTrackerId);
    if (!tracker) return;

    openConfirm({
      title: "Reset tracker progress",
      message: `Reset all progress logs for "${tracker.title}" and return it to its starting value?`,
      action: () => {
        resetTrackerProgress(tracker.id);
      }
    });
  });

  dom.deleteSelectedTrackerBtn.addEventListener("click", () => {
    if (!ui.selectedTrackerId) return;
    const tracker = findTracker(ui.selectedTrackerId);
    if (!tracker) return;

    openConfirm({
      title: "Delete tracker",
      message: `Delete "${tracker.title}" and all of its history entries? This cannot be undone.`,
      action: () => {
        deleteTracker(tracker.id);
      }
    });
  });

  dom.closeTrackerModalBtn.addEventListener("click", closeTrackerModal);
  dom.cancelTrackerModalBtn.addEventListener("click", closeTrackerModal);
  dom.trackerModal.addEventListener("click", (event) => {
    if (event.target === dom.trackerModal) {
      closeTrackerModal();
    }
  });

  dom.trackerForm.addEventListener("submit", handleTrackerSubmit);
  dom.trackerTemplateSelect.addEventListener("change", handleTrackerTemplateSelection);
  dom.trackerUnitTypeSelect.addEventListener("change", syncUnitFieldVisibility);
  dom.openLoggerFromModalBtn.addEventListener("click", openLoggerFromTrackerModal);
  dom.trackerAccentInput.addEventListener("input", () => {
    dom.trackerAccentPreview.textContent = dom.trackerAccentInput.value;
  });

  dom.iconChoiceRow.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-icon-choice]");
    if (!choice) return;
    dom.trackerIconInput.value = choice.dataset.iconChoice;
  });

  dom.addCustomFieldBtn.addEventListener("click", () => appendCustomFieldRow());
  dom.customFieldList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-custom-field]");
    if (!removeButton) return;
    removeButton.closest(".custom-field-row")?.remove();
  });

  dom.confirmCancelBtn.addEventListener("click", closeConfirmModal);
  dom.confirmModal.addEventListener("click", (event) => {
    if (event.target === dom.confirmModal) {
      closeConfirmModal();
    }
  });
  dom.confirmAcceptBtn.addEventListener("click", () => {
    const action = ui.confirmAction;
    closeConfirmModal();
    if (action) {
      action();
    }
  });

  dom.closeProofModalBtn.addEventListener("click", closeProofModal);
  dom.closeMailModalBtn.addEventListener("click", closeMailModal);
  dom.closeGuideModalBtn.addEventListener("click", closeGuideModal);
  dom.guideCloseBtn.addEventListener("click", closeGuideModal);
  dom.guideOpenGraphsBtn.addEventListener("click", () => {
    closeGuideModal();
    if (isAuthenticated()) {
      setView("graphs");
    }
  });
  dom.guideCreateTrackerBtn.addEventListener("click", () => {
    closeGuideModal();
    if (isAuthenticated()) {
      openTrackerModal("create");
    }
  });
  dom.mailModal.addEventListener("click", (event) => {
    if (event.target === dom.mailModal) {
      closeMailModal();
    }
  });
  dom.guideModal.addEventListener("click", (event) => {
    if (event.target === dom.guideModal) {
      closeGuideModal();
    }
  });
  dom.dashboardMailList.addEventListener("click", handleMailFeedClick);
  dom.mailModalList.addEventListener("click", handleMailFeedClick);
  dom.proofModal.addEventListener("click", (event) => {
    if (event.target === dom.proofModal) {
      closeProofModal();
    }
  });

  document.addEventListener("keydown", handleGlobalKeydown);
}

function setStaticUiDefaults() {
  dom.logDateInput.value = toLocalInputValue(new Date());
  syncUnitFieldVisibility();
  syncLogProofPreview();
  setAuthMode(getDefaultAuthMode(), false);
  syncAuthOtpUi();
  updateTrackerTemplateHint();
  syncFocusModeUi();
}

// NEW FEATURE
function updateTrackerTemplateHint() {
  if (!dom.trackerTemplateHint) return;

  const template = TRACKER_TEMPLATE_LIBRARY[dom.trackerTemplateSelect?.value];
  dom.trackerTemplateHint.textContent = template
    ? `${template.category} template adds ${template.customFields.length} starter fields with tuned defaults for faster setup.`
    : "Apply a starter structure with tuned labels, units, colors, and custom fields.";
}

// NEW FEATURE
function getTemplateStarterName(templateName) {
  if (templateName === "Coding") return "Shipping Sprint";
  if (templateName === "Trading") return "Execution Journal";
  if (templateName === "Fitness") return "Training Block";
  if (templateName === "Study") return "Study Sprint";
  return "Custom Tracker";
}

// NEW FEATURE
function getTemplateStarterItem(templateName) {
  if (templateName === "Coding") return "Feature build + deep work";
  if (templateName === "Trading") return "Session review and execution";
  if (templateName === "Fitness") return "Weekly training sessions";
  if (templateName === "Study") return "Exam prep focus block";
  return "";
}

// NEW FEATURE
function handleTrackerTemplateSelection() {
  updateTrackerTemplateHint();
  const templateName = dom.trackerTemplateSelect.value;
  if (!templateName) return;

  if (ui.trackerModalMode !== "create") {
    showToast("Templates are designed for new trackers. Existing tracker data was left unchanged.", "success");
    return;
  }

  applyTrackerTemplate(templateName);
}

// NEW FEATURE
function applyTrackerTemplate(templateName) {
  const template = TRACKER_TEMPLATE_LIBRARY[templateName];
  if (!template) return;

  dom.trackerCategoryInput.value = template.category;
  dom.trackerGoalTypeInput.value = template.goalType;
  dom.trackerUnitTypeSelect.value = template.unitType;
  dom.trackerCustomUnitInput.value = template.unitType === "custom" ? template.unitLabel || "" : "";
  dom.trackerAccentInput.value = template.accentColor;
  dom.trackerAccentPreview.textContent = template.accentColor;
  dom.trackerIconInput.value = template.icon;
  dom.trackerNotesInput.value = template.notes;

  if (!dom.trackerTitleInput.value.trim()) {
    dom.trackerTitleInput.value = getTemplateStarterName(templateName);
  }
  if (!dom.trackerItemInput.value.trim()) {
    dom.trackerItemInput.value = getTemplateStarterItem(templateName);
  }

  if (templateName === "Trading") {
    dom.trackerStartValueInput.value = "0";
    dom.trackerCurrentValueInput.value = "0";
    dom.trackerTargetValueInput.value = "20";
  } else if (template.unitType === "hours") {
    dom.trackerStartValueInput.value = "0";
    dom.trackerCurrentValueInput.value = "0";
    dom.trackerTargetValueInput.value = templateName === "Study" ? "40" : "25";
  } else if (template.unitType === "sessions") {
    dom.trackerStartValueInput.value = "0";
    dom.trackerCurrentValueInput.value = "0";
    dom.trackerTargetValueInput.value = "16";
  }

  dom.customFieldList.innerHTML = "";
  template.customFields.forEach((field) => appendCustomFieldRow(field));
  syncUnitFieldVisibility();
  showToast(`${templateName} template applied.`, "success");
}

// NEW FEATURE
function getFocusSession() {
  return state?.settings?.focusSession || createFocusSessionState();
}

// NEW FEATURE
function getFocusElapsedMs(session = getFocusSession()) {
  if (!session.startedAt) return Math.max(0, session.elapsedMs || 0);
  return Math.max(0, session.elapsedMs || 0) + Math.max(0, Date.now() - new Date(session.startedAt).getTime());
}

// NEW FEATURE
function formatTimerDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

// NEW FEATURE
function formatFocusDuration(milliseconds) {
  const totalMinutes = Math.max(1, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }
  if (!minutes) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  return `${hours}h ${minutes}m`;
}

// NEW FEATURE
function getPreferredFocusTrackerId() {
  const session = getFocusSession();
  const trackers = getLiveTrackers().filter((tracker) => getTrackerStatus(tracker) !== "archived");
  if (session.trackerId && trackers.some((tracker) => tracker.id === session.trackerId)) {
    return session.trackerId;
  }
  return trackers[0]?.id || "";
}

// NEW FEATURE
function syncFocusTimerLoop() {
  if (ui.focusTimerHandle) {
    window.clearInterval(ui.focusTimerHandle);
    ui.focusTimerHandle = 0;
  }

  if (getFocusSession().startedAt) {
    ui.focusTimerHandle = window.setInterval(() => {
      syncFocusModeUi();
    }, FOCUS_TICK_MS);
  }
}

// NEW FEATURE
function syncFocusModeUi() {
  if (!dom.focusTrackerSelect) return;

  const trackers = getLiveTrackers().filter((tracker) => !tracker.archived);
  const preferredTrackerId = getPreferredFocusTrackerId();
  const options = trackers.length
    ? trackers.map((tracker) => ({
        value: tracker.id,
        label: `${tracker.title} · ${tracker.unitLabel}`
      }))
    : [{ value: "", label: "No active trackers available" }];

  setSelectOptions(dom.focusTrackerSelect, options, preferredTrackerId);

  const session = getFocusSession();
  const running = Boolean(session.startedAt);
  const tracker = findTracker(dom.focusTrackerSelect.value || preferredTrackerId);
  const elapsedMs = getFocusElapsedMs(session);

  dom.focusModeState.textContent = running ? "Running" : trackers.length ? "Ready" : "No trackers";
  dom.focusTimerValue.textContent = formatTimerDuration(elapsedMs);
  dom.focusStartBtn.disabled = running || !tracker;
  dom.focusStopBtn.disabled = !running;

  if (!tracker) {
    dom.focusTimerNote.textContent = "Create an active tracker first, then use focus mode to auto-log sessions.";
    return;
  }

  dom.focusTimerNote.textContent = running
    ? `Locked on ${tracker.title}. Stop to save ${formatFocusDuration(elapsedMs)} back into this tracker.`
    : `Start a focused session for ${tracker.title}. The timer will auto-log the work when you stop.`;
}

// NEW FEATURE
function handleTodayQuickLog() {
  const priorityTracker = getPrimaryActionTracker();
  if (priorityTracker) {
    openDetailDrawer(priorityTracker.id, true);
    return;
  }

  openTrackerModal("create");
}

// NEW FEATURE
function getPrimaryActionTracker() {
  return getLiveTrackers()
    .filter((tracker) => getTrackerStatus(tracker) === "active")
    .sort((left, right) => sortableDeadline(left.deadline) - sortableDeadline(right.deadline) || new Date(right.updatedAt) - new Date(left.updatedAt))[0]
    || getLiveTrackers()[0]
    || null;
}

function setupRevealFx() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobileViewport = isMobileViewport();
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (prefersReducedMotion || mobileViewport || coarsePointer || !("IntersectionObserver" in window)) {
    return;
  }

  revealFx.enabled = true;
  revealFx.observer = new IntersectionObserver(handleRevealEntries, {
    threshold: 0.14,
    rootMargin: "0px 0px -10% 0px"
  });
}

function handleRevealEntries(entries) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      return;
    }

    entry.target.classList.add("is-revealed");
    revealFx.observer?.unobserve(entry.target);
  });
}

function registerRevealElements(root = document) {
  const targets = collectRevealTargets(root);

  targets.forEach((element, index) => {
    if (element.dataset.revealReady === "true") {
      return;
    }

    element.dataset.revealReady = "true";
    element.classList.add("reveal-on-scroll");
    element.style.setProperty("--reveal-delay", `${Math.min((index % 6) * 55, 220)}ms`);

    if (revealFx.enabled) {
      revealFx.observer?.observe(element);
    } else {
      element.classList.add("is-revealed");
    }
  });
}

function collectRevealTargets(root) {
  const targets = [];

  if (root instanceof Element && root.matches(REVEAL_TARGET_SELECTOR)) {
    targets.push(root);
  }

  if (typeof root.querySelectorAll === "function") {
    targets.push(...root.querySelectorAll(REVEAL_TARGET_SELECTOR));
  }

  return targets;
}

function getDefaultAuthMode() {
  return state?.settings?.account || state?.settings?.session?.lastLoginAt ? "login" : "create";
}

function getAccount() {
  return state?.settings?.account || null;
}

function getAccountName() {
  return getAccount()?.name || "You";
}

function getAccountEmail() {
  return getAccount()?.email || "";
}

function isAuthenticated() {
  return Boolean(getAccount() && state?.settings?.session?.loggedIn);
}

function getSession() {
  return state?.settings?.session || {
    loggedIn: false,
    lastLoginAt: null,
    authProvider: "local",
    accessToken: "",
    sessionId: ""
  };
}

function getSyncState() {
  return state?.settings?.sync || createSyncState();
}

function isLocalOnlyMode() {
  return getSyncState().mode === LOCAL_SYNC_MODE;
}

function setSyncMode(mode = BACKEND_SYNC_MODE, reason = "") {
  if (!state?.settings) return;
  const nextMode = mode === LOCAL_SYNC_MODE ? LOCAL_SYNC_MODE : BACKEND_SYNC_MODE;
  const current = getSyncState();

  state.settings.sync = createSyncState({
    mode: nextMode,
    reason,
    switchedAt: nextMode !== current.mode ? new Date().toISOString() : current.switchedAt
  });
}

function announceLocalFallback(reason = "") {
  const now = Date.now();
  if (now - lastSyncWarningAt < 3000) return;
  lastSyncWarningAt = now;
  showToast(reason || "Backend is unavailable. Switched to local-only mode.", "error");
}

function canUseBackendAuth() {
  return Boolean(BACKEND_API_BASE);
}

function isBackendAuthSession() {
  const session = getSession();
  return session.authProvider === "backend" && Boolean(session.accessToken);
}

function createSessionState({
  loggedIn = false,
  lastLoginAt = null,
  authProvider = "local",
  accessToken = "",
  sessionId = ""
} = {}) {
  return {
    loggedIn: Boolean(loggedIn),
    lastLoginAt: lastLoginAt ? normalizeIso(lastLoginAt) : null,
    authProvider: authProvider === "backend" ? "backend" : "local",
    accessToken: sanitizeText(accessToken, 4096),
    sessionId: sanitizeText(sessionId, 120)
  };
}

// REFACTOR
function createSyncState({
  mode = BACKEND_SYNC_MODE,
  reason = "",
  switchedAt = null
} = {}) {
  return {
    mode: mode === LOCAL_SYNC_MODE ? LOCAL_SYNC_MODE : BACKEND_SYNC_MODE,
    reason: sanitizeText(reason, 180),
    switchedAt: switchedAt ? normalizeIso(switchedAt) : null
  };
}

// REFACTOR
function createFocusSessionState({
  trackerId = "",
  startedAt = null,
  elapsedMs = 0
} = {}) {
  return {
    trackerId: sanitizeText(trackerId, 120),
    startedAt: startedAt ? normalizeIso(startedAt) : null,
    elapsedMs: Math.max(0, Number(elapsedMs) || 0)
  };
}

function createBackendPendingOtp(payload, expiresAt) {
  const sentAt = new Date().toISOString();
  return {
    provider: "backend",
    mode: payload.mode,
    name: payload.name,
    email: payload.email,
    sentAt,
    expiresAt: normalizeIso(expiresAt || new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString())
  };
}

function toBackendUrl(path = "") {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

function toBackendPriority(priority = "Medium") {
  const value = String(priority || "Medium").trim().toLowerCase();
  return value === "critical" ? "high" : value;
}

function fromBackendPriority(priority = "medium") {
  const value = String(priority || "medium").trim().toLowerCase();
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "Medium";
}

function toBackendIsoFromDateOnly(dateOnly) {
  if (!dateOnly) return null;
  const date = new Date(`${dateOnly}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getApiData(payload) {
  return payload?.data || {};
}

function mapBackendUserToLocalAccount(user) {
  return {
    name: sanitizeText(user?.name, 40) || "You",
    email: normalizeEmail(user?.email),
    emailVerifiedAt: user?.emailVerifiedAt ? normalizeIso(user.emailVerifiedAt) : normalizeIso(new Date().toISOString()),
    emailUpdatesEnabled: user?.emailUpdatesEnabled !== false,
    createdAt: user?.createdAt ? normalizeIso(user.createdAt) : normalizeIso(new Date().toISOString()),
    lastLoginAt: user?.lastLoginAt ? normalizeIso(user.lastLoginAt) : normalizeIso(new Date().toISOString())
  };
}

async function refreshBackendSessionToken() {
  const payload = await apiRequest("/auth/refresh", {
    method: "POST",
    skipAuthRetry: true
  });

  const data = getApiData(payload);
  const user = data.user || null;
  const accessToken = data.accessToken || "";
  const session = data.session || null;
  if (!user?.email || !accessToken) {
    throw new Error("Could not refresh the backend session.");
  }

  state.settings.account = mapBackendUserToLocalAccount(user);
  state.settings.session = createSessionState({
    loggedIn: true,
    lastLoginAt: user.lastLoginAt || session?.createdAt || getSession().lastLoginAt || new Date().toISOString(),
    authProvider: "backend",
    accessToken,
    sessionId: session?.id || getSession().sessionId
  });
  saveState();

  return accessToken;
}

async function apiRequest(path, { method = "GET", body, token = "", headers = {}, skipAuthRetry = false } = {}) {
  // Centralized bridge from the premium frontend to the Express API.
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), BACKEND_FETCH_TIMEOUT_MS);
  const url = /^https?:\/\//i.test(path) ? path : `${BACKEND_API_BASE}${path}`;

  const requestHeaders = { ...headers };
  if (!(body instanceof FormData) && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      method,
      credentials: "include",
      headers: {
        ...requestHeaders,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body:
        body === undefined
          ? undefined
          : body instanceof FormData
            ? body
            : JSON.stringify(body),
      signal: controller.signal
    });

    const json = await response.json().catch(() => ({}));

    if (
      response.status === 401 &&
      !skipAuthRetry &&
      isBackendAuthSession() &&
      !/\/auth\/(refresh|login|register|verify-email|resend-verification)$/.test(path)
    ) {
      try {
        const refreshedAccessToken = await refreshBackendSessionToken();
        return apiRequest(path, {
          method,
          body,
          headers,
          token: refreshedAccessToken,
          skipAuthRetry: true
        });
      } catch {
        state.settings.session = createSessionState({
          loggedIn: false,
          lastLoginAt: getSession().lastLoginAt || null,
          authProvider: "backend"
        });
        saveState();
      }
    }

    if (!response.ok) {
      const error = new Error(json?.error?.message || json?.message || "Request failed.");
      error.status = response.status;
      error.details = json?.error?.details || null;
      throw error;
    }

    return json;
  } catch (error) {
    if (error.name === "AbortError" || error instanceof TypeError) {
      error.backendUnavailable = true;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function hydrateBackendSession() {
  if (!isBackendAuthSession()) {
    return;
  }

  try {
    const payload = await apiRequest("/auth/me", {
      token: getSession().accessToken
    });
    const data = getApiData(payload);
    const user = data.user || null;

    if (!user?.email) {
      throw new Error("The backend session payload was incomplete.");
    }

    state.settings.account = mapBackendUserToLocalAccount(user);
    state.settings.session = createSessionState({
      loggedIn: true,
      lastLoginAt: user.lastLoginAt || getSession().lastLoginAt,
      authProvider: "backend",
      accessToken: getSession().accessToken,
      sessionId: getSession().sessionId
    });
    saveState();
  } catch (error) {
    if (error.backendUnavailable) {
      return;
    }

    try {
      await refreshBackendSessionToken();
    } catch {
      state.settings.session = createSessionState({
        loggedIn: false,
        lastLoginAt: getSession().lastLoginAt || getAccount()?.lastLoginAt || null,
        authProvider: "backend"
      });
      saveState();
    }
  }
}

async function fetchAllBackendPages(path, itemKey, { token, query = {} } = {}) {
  const items = [];
  let page = 1;
  let totalPages = 1;

  do {
    const search = new URLSearchParams({
      page: String(page),
      limit: String(BACKEND_PAGE_LIMIT),
      ...Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== "")
      )
    }).toString();

    const payload = await apiRequest(`${path}?${search}`, { token });
    const data = getApiData(payload);
    items.push(...(Array.isArray(data[itemKey]) ? data[itemKey] : []));
    totalPages = Number(payload?.meta?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages);

  return items;
}

function mapBackendProgressToLocalLog(entry) {
  return normalizeLog({
    id: entry.id,
    amount: roundNumber(toNumber(entry.value, 0)),
    timestamp: entry.entryDate || entry.createdAt,
    note: entry.note || "",
    tag: entry.tag || "",
    proofImage: toBackendUrl(entry?.attachment?.url || ""),
    proofName: entry?.attachment?.originalName || entry?.attachment?.filename || "",
    system: Boolean(entry.system),
    readOnly: false,
    createdAt: entry.createdAt || entry.entryDate,
    updatedAt: entry.updatedAt || entry.createdAt || entry.entryDate
  });
}

function createBackendSyncLog(goal, amount) {
  const timestamp = goal.updatedAt || goal.createdAt || new Date().toISOString();
  return normalizeLog({
    id: `sync-${goal.id}`,
    amount,
    timestamp,
    note: "Backend balance sync",
    tag: "Sync",
    system: true,
    readOnly: true,
    createdAt: timestamp,
    updatedAt: timestamp
  });
}

function mapBackendGoalToLocalTracker(goal, entries = []) {
  const logs = [...entries]
    .map(mapBackendProgressToLocalLog)
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  const startValue = roundNumber(toNumber(goal.startValue, 0));
  const summedLogs = roundNumber(logs.reduce((sum, log) => sum + log.amount, 0));
  const backendCurrent = roundNumber(toNumber(goal.currentValue, startValue + summedLogs));
  const expectedCurrent = roundNumber(startValue + summedLogs);
  const diff = roundNumber(backendCurrent - expectedCurrent);
  const mergedLogs = diff !== 0 ? [createBackendSyncLog(goal, diff), ...logs] : logs;

  return normalizeTracker({
    id: goal.id,
    title: goal.title,
    createdBy: goal.createdBy || "You",
    category: goal.category || "Custom",
    itemName: goal.itemName || goal.description || "",
    goalType: goal.goalType || "Target progress",
    unitType: goal.unitType || "custom",
    unitLabel: goal.unitLabel || goal.unit || "units",
    startValue,
    currentValue: backendCurrent,
    targetValue: roundNumber(toNumber(goal.targetValue, 1)),
    deadline: goal.dueDate ? normalizeDateOnly(goal.dueDate) : "",
    priority: fromBackendPriority(goal.priority),
    notes: goal.notes || goal.description || "",
    accentColor: normalizeHexColor(goal.color) || "#5de4c7",
    icon: normalizeIcon(goal.icon) || guessIcon(goal.title, goal.category, goal.itemName),
    customFields: normalizeCustomFields(goal.customFields),
    archived: Boolean(goal.archived),
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    completedAt: goal.completedAt,
    logs: mergedLogs
  });
}

async function syncWorkspaceFromBackend() {
  // Backend is the single source of truth for trackers, logs, history, and proof attachments.
  if (!isBackendAuthSession()) {
    return state.trackers;
  }

  try {
    const token = getSession().accessToken || await refreshBackendSessionToken();
    const [goals, entries] = await Promise.all([
      fetchAllBackendPages("/goals", "goals", { token, query: { status: "all", sortBy: "updatedAt", sortOrder: "desc" } }),
      fetchAllBackendPages("/progress", "entries", { token, query: { sortBy: "entryDate", sortOrder: "desc" } })
    ]);

    const entriesByGoal = new Map();
    entries.forEach((entry) => {
      const goalId = entry?.goal?.id || "";
      if (!goalId) return;
      if (!entriesByGoal.has(goalId)) {
        entriesByGoal.set(goalId, []);
      }
      entriesByGoal.get(goalId).push(entry);
    });

    state.trackers = goals
      .map((goal) => mapBackendGoalToLocalTracker(goal, entriesByGoal.get(goal.id) || []))
      .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

    if (ui.selectedTrackerId && !findTracker(ui.selectedTrackerId)) {
      ui.selectedTrackerId = null;
    }

    setSyncMode(BACKEND_SYNC_MODE);
    saveState();
    return state.trackers;
  } catch (error) {
    if (error.backendUnavailable) {
      setSyncMode(LOCAL_SYNC_MODE, error.message || "Backend sync unavailable.");
      saveState();
    }
    throw error;
  }
}

function buildBackendGoalPayloadFromTracker(tracker) {
  return {
    title: tracker.title,
    description: tracker.itemName || "",
    category: tracker.category,
    createdBy: tracker.createdBy,
    itemName: tracker.itemName,
    goalType: tracker.goalType,
    unitType: tracker.unitType,
    startValue: tracker.startValue,
    unit: tracker.unitLabel,
    targetValue: tracker.targetValue,
    currentValue: tracker.currentValue,
    status: getTrackerPercent(tracker) >= 100 ? "completed" : "active",
    priority: toBackendPriority(tracker.priority),
    color: tracker.accentColor,
    icon: tracker.icon,
    customFields: tracker.customFields.map((field) => ({
      label: sanitizeText(field.label, 40),
      value: sanitizeText(field.value, 120)
    })),
    startDate: tracker.createdAt ? normalizeIso(tracker.createdAt) : new Date().toISOString(),
    dueDate: toBackendIsoFromDateOnly(tracker.deadline),
    notes: tracker.notes,
    archived: Boolean(tracker.archived)
  };
}

async function uploadProofImageToBackend(dataUrl, filename) {
  if (!dataUrl) return null;

  // NEW FEATURE: use a direct data URL decoder instead of fetch(dataUrl),
  // which can fail in some browsers even when the preview renders correctly.
  const blob = await createBlobFromProofSource(dataUrl);
  const extension = blob.type.split("/")[1] || "png";
  const safeName = sanitizeText(filename || `proof.${extension}`, 80).replace(/\s+/g, "-") || `proof.${extension}`;
  const formData = new FormData();
  formData.append("file", blob, safeName);

  const response = await apiRequest("/uploads/attachment", {
    method: "POST",
    token: getSession().accessToken,
    body: formData,
    headers: {}
  });

  return getApiData(response).file || null;
}

async function createBackendTracker(tracker) {
  const response = await apiRequest("/goals", {
    method: "POST",
    token: getSession().accessToken,
    body: buildBackendGoalPayloadFromTracker(tracker)
  });

  return getApiData(response).goal || null;
}

async function updateBackendTracker(trackerId, tracker) {
  const response = await apiRequest(`/goals/${trackerId}`, {
    method: "PATCH",
    token: getSession().accessToken,
    body: buildBackendGoalPayloadFromTracker(tracker)
  });

  return getApiData(response).goal || null;
}

async function removeBackendTracker(trackerId) {
  await apiRequest(`/goals/${trackerId}`, {
    method: "DELETE",
    token: getSession().accessToken
  });
}

async function createBackendProgressEntry(trackerId, log) {
  const attachment = log.proofImage
    ? await uploadProofImageToBackend(log.proofImage, log.proofName || "proof.png")
    : null;

  const response = await apiRequest("/progress", {
    method: "POST",
    token: getSession().accessToken,
    body: {
      goal: trackerId,
      value: log.amount,
      note: log.note,
      tag: log.tag,
      system: Boolean(log.system),
      entryDate: normalizeIso(log.timestamp),
      attachment: attachment
        ? {
            url: toBackendUrl(attachment.url),
            filename: attachment.filename || "",
            mimetype: attachment.mimetype || "",
            size: attachment.size || 0
          }
        : undefined
    }
  });

  return getApiData(response).entry || null;
}

async function updateBackendProgressEntry(trackerId, entryId, log) {
  const attachment = log.proofImage
    ? await uploadProofImageToBackend(log.proofImage, log.proofName || "proof.png")
    : null;

  const response = await apiRequest(`/progress/${entryId}`, {
    method: "PATCH",
    token: getSession().accessToken,
    body: {
      goal: trackerId,
      value: log.amount,
      note: log.note,
      tag: log.tag,
      system: Boolean(log.system),
      entryDate: normalizeIso(log.timestamp),
      attachment: attachment
        ? {
            url: toBackendUrl(attachment.url),
            filename: attachment.filename || "",
            mimetype: attachment.mimetype || "",
            size: attachment.size || 0
          }
        : undefined
    }
  });

  return getApiData(response).entry || null;
}

async function removeBackendProgressEntry(entryId) {
  await apiRequest(`/progress/${entryId}`, {
    method: "DELETE",
    token: getSession().accessToken
  });
}

function setAuthMode(mode, shouldFocus = true) {
  const requestedMode = AUTH_MODES.includes(mode) ? mode : getDefaultAuthMode();
  const nextMode = requestedMode;
  const pendingOtp = getPendingAuthOtp();

  ui.authMode = nextMode;

  dom.authCreateModeBtn.classList.toggle("is-active", nextMode === "create");
  dom.authCreateModeBtn.setAttribute("aria-pressed", String(nextMode === "create"));
  dom.authCreateModeBtn.disabled = false;
  dom.authLoginModeBtn.classList.toggle("is-active", nextMode === "login");
  dom.authLoginModeBtn.setAttribute("aria-pressed", String(nextMode === "login"));
  dom.authLoginModeBtn.disabled = false;
  dom.authConfirmField.classList.toggle("hidden", nextMode !== "create");
  dom.authLoginActions.classList.toggle("hidden", nextMode !== "login");
  dom.authPasswordInput.setAttribute("autocomplete", nextMode === "create" ? "new-password" : "current-password");

  if (nextMode === "create") {
    dom.authEyebrow.textContent = "Create verified access";
    dom.authTitle.textContent = "Open your progress workspace.";
    dom.authSubtitle.textContent = "Create an account with email verification, then unlock your saved trackers from the backend.";
    dom.authModePill.textContent = "New verified workspace";
    dom.authHintText.textContent = canUseBackendAuth()
      ? "A real OTP is sent to your email address to verify the account."
      : "Start the backend before creating an account so the verification OTP can be delivered by email.";
    dom.authSubmitBtn.textContent = "Send OTP";
    dom.authNameInput.value = dom.authNameInput.value.trim();
  } else {
    const account = getAccount();
    dom.authEyebrow.textContent = "Welcome back";
    dom.authTitle.textContent = account
      ? `Sign in to ${account.name || "your"} workspace.`
      : "Sign in to your verified workspace.";
    dom.authSubtitle.textContent = account
      ? "Use your verified email and password to reload your saved trackers, history, graphs, and proof images."
      : "Sign in with the same verified email and password from your backend account.";
    dom.authModePill.textContent = "Backend sign-in";
    dom.authHintText.textContent = canUseBackendAuth()
      ? "Email OTP is only used while verifying a new account. Returning users sign in directly."
      : "Start the backend server before signing in.";
    dom.authSubmitBtn.textContent = "Sign In";
    if (!dom.authNameInput.value.trim()) {
      dom.authNameInput.value = account?.name || "";
    }
    if (!dom.authEmailInput.value.trim()) {
      dom.authEmailInput.value = account?.email || "";
    }
  }

  if (pendingOtp && pendingOtp.mode === nextMode) {
    if (!dom.authNameInput.value.trim()) {
      dom.authNameInput.value = pendingOtp.name;
    }
    if (!dom.authEmailInput.value.trim()) {
      dom.authEmailInput.value = pendingOtp.email;
    }
  }

  if (!pendingOtp || pendingOtp.mode !== nextMode) {
    dom.authOtpInput.value = "";
  }
  if (!(pendingOtp && pendingOtp.mode === nextMode)) {
    dom.authConfirmInput.value = "";
    dom.authPasswordInput.value = "";
  }
  syncAuthOtpUi();
  renderAuthMailPreview();
  if (shouldFocus) {
    window.setTimeout(() => dom.authNameInput.focus(), 40);
  }
}

function syncAuthUi() {
  const account = getAccount();
  const authenticated = isAuthenticated();

  if (!authenticated) {
    forceCloseOverlays();
  }

  dom.body.dataset.auth = authenticated ? "ready" : "locked";
  dom.authShell.hidden = authenticated;

  const displayName = account?.name || "Guest";
  dom.accountAvatar.textContent = displayName.charAt(0).toUpperCase() || "G";
  dom.accountNameLabel.textContent = displayName;
  dom.accountMetaLabel.textContent = authenticated
    ? account?.email
      ? `${account.email} · ${isBackendAuthSession() ? "backend verified" : "verified"}`
      : "Verified workspace member"
    : account?.lastLoginAt
      ? `Last access ${formatRelativeTime(account.lastLoginAt)}`
      : "Sign in required";

  syncGuideCtas();
}

function getMailFeed() {
  return state?.settings?.mailFeed || { messages: [], lastOpenedAt: null };
}

function getUnreadMailCount() {
  const feed = getMailFeed();
  const lastOpenedAt = feed.lastOpenedAt ? new Date(feed.lastOpenedAt) : null;

  return feed.messages.filter((message) => {
    if (!lastOpenedAt) return true;
    return new Date(message.createdAt) > lastOpenedAt;
  }).length;
}

function getPendingAuthOtp() {
  const pending = state?.settings?.authOtp || null;
  if (!pending) return null;

  if (new Date(pending.expiresAt) <= new Date()) {
    clearPendingAuthOtp(false);
    return null;
  }

  return pending;
}

function clearPendingAuthOtp(shouldSave = true) {
  if (!state?.settings) return;
  state.settings.authOtp = null;
  if (shouldSave) {
    saveState();
  }
}

function isMatchingPendingOtp(pending, payload) {
  if (!pending || !payload) return false;
  return pending.mode === payload.mode && pending.email === payload.email;
}

function getOtpMinutesRemaining(pending) {
  if (!pending) return 0;
  return Math.max(1, Math.ceil((new Date(pending.expiresAt) - new Date()) / 60000));
}

function syncAuthOtpUi() {
  const pending = getPendingAuthOtp();
  const relevantPending = ui.authMode === "create" && pending && pending.mode === ui.authMode ? pending : null;

  dom.authOtpShell.classList.toggle("hidden", !relevantPending);
  dom.authOtpInput.required = Boolean(relevantPending);
  dom.authOtpInput.disabled = !relevantPending;
  dom.authNameInput.disabled = false;
  dom.authEmailInput.disabled = false;
  dom.authPasswordInput.disabled = false;
  dom.authConfirmInput.disabled = ui.authMode !== "create";

  if (!relevantPending) {
    return;
  }

  const actionLabel = ui.authMode === "create" ? "Verify OTP & Create Access" : "Verify OTP & Sign In";
  dom.authModePill.textContent = "OTP sent";
  dom.authHintText.textContent = `A real email OTP was sent to ${relevantPending.email}.`;
  dom.authSubmitBtn.textContent = actionLabel;
  dom.authOtpStatus.textContent = `Real OTP sent to ${relevantPending.email}`;
  dom.authOtpDeliveryText.textContent = `Use the 6-digit code from your email inbox. It expires in ${getOtpMinutesRemaining(relevantPending)} minute${getOtpMinutesRemaining(relevantPending) === 1 ? "" : "s"}.`;
}

function renderMailSurfaces() {
  renderAuthMailPreview();
  renderDashboardMailFeed();
  renderMailModalSummary();
}

function renderAuthMailPreview() {
  const pending = getPendingAuthOtp();
  dom.authMailPreviewState.textContent = pending ? "Live email delivery" : "Email verification";
  dom.authMailPreviewSubject.textContent = pending ? "Verification email sent" : "Email-only verification";
  dom.authMailPreviewBody.textContent = pending
    ? `A real one-time password was sent to ${pending.email}. Check Inbox, Spam, and Promotions, then enter the 6-digit code here.`
    : "When you create a new account, the OTP is delivered to your email inbox. No OTP is shown inside the website.";
  dom.authMailPreviewMeta.textContent = pending ? `${pending.email} · SMTP delivery` : "SMTP-backed delivery";
  dom.authMailPreviewCode.textContent = "";
  dom.authMailPreviewCode.hidden = true;
}

function renderDashboardMailFeed() {
  const messages = getMailFeed().messages.slice(0, 4);
  const unreadCount = getUnreadMailCount();

  if (dom.mailCenterUnreadCount) {
    dom.mailCenterUnreadCount.textContent = String(unreadCount);
    dom.mailCenterUnreadCount.classList.toggle("hidden", unreadCount === 0);
  }

  if (dom.dashboardMailSummary) {
    dom.dashboardMailSummary.textContent = messages.length
      ? `${messages.length} recent secure ${messages.length === 1 ? "message" : "messages"} · ${unreadCount} unread.`
      : "Tracker updates and account notifications will appear here.";
  }

  if (dom.dashboardMailList) {
    dom.dashboardMailList.innerHTML = messages.length
      ? messages.map((message) => createMailCard(message, true)).join("")
      : createEmptyStackItem("No secure mail yet", "Verify your account by email, then use the workspace to populate this update stream.");
    registerRevealElements(dom.dashboardMailList);
  }
}

function renderMailModalSummary() {
  const messages = getMailFeed().messages;
  const latest = messages[0] || null;
  const account = getAccount();
  const unreadCount = getUnreadMailCount();

  if (dom.mailModalAddress) {
    dom.mailModalAddress.textContent = account?.email || latest?.to || "No email connected";
  }
  if (dom.mailModalUnread) {
    dom.mailModalUnread.textContent = String(unreadCount);
  }
  if (dom.mailModalLastDelivery) {
    dom.mailModalLastDelivery.textContent = latest ? formatRelativeTime(latest.createdAt) : "No messages yet";
  }
  if (dom.mailModalSummary) {
    dom.mailModalSummary.textContent = account?.email
      ? isBackendAuthSession()
        ? `Backend sync is active for ${account.email}. Verification OTPs are delivered by email, while this mail center shows workspace update summaries.`
        : `Sign in to the backend to send verification OTPs by email and sync workspace data.`
      : "Sign in to the backend to activate email OTP delivery and workspace sync.";
  }
  if (dom.mailModalList) {
    dom.mailModalList.innerHTML = messages.length
      ? messages.map((message) => createMailCard(message, false)).join("")
      : createEmptyStackItem("Inbox is calm", "Tracker updates and account confirmations will collect here.");
  }
}

function createMailCard(message, compact = false) {
  const accent = message.accentColor || "#5de4c7";
  const accentFade = hexToRgba(accent, 0.16);
  const trackerButton = message.trackerId
    ? `<button class="ghost-button ghost-button-small" type="button" data-mail-open-tracker="${message.trackerId}">Open Tracker</button>`
    : "";
  const copy = compact ? message.preview || message.body : message.body || message.preview;

  return `
    <article class="mail-card ${compact ? "is-compact" : ""}" style="--mail-accent:${accent}; --mail-accent-fade:${accentFade};">
      <div class="mail-card-top">
        <div>
          <p class="eyebrow">${escapeHtml(mailTypeLabel(message.type))}</p>
          <h4>${escapeHtml(message.subject)}</h4>
        </div>
        <span class="soft-pill">${escapeHtml(formatCalendarDate(message.createdAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</span>
      </div>
      <p class="subtle">${escapeHtml(copy)}</p>
      <div class="mail-card-meta">
        <span class="soft-pill">To ${escapeHtml(message.to || "local relay")}</span>
        ${message.code ? `<strong class="mail-code-chip">${escapeHtml(message.code)}</strong>` : ""}
        ${trackerButton}
      </div>
    </article>
  `;
}

function mailTypeLabel(type) {
  if (type === "otp") return "Secure OTP";
  if (type === "security") return "Security";
  if (type === "tracker") return "Tracker update";
  if (type === "progress") return "Progress email";
  return "Workspace update";
}

function renderAuthPreview() {
  const categories = getUniqueCategories().length;
  const manualEntries = getAllHistoryEntries().filter((entry) => !entry.log.system).length;
  const marketingPreview = isAuthenticated()
    ? {
        trackers: state.trackers.length,
        logs: manualEntries,
        categories: categories || 1
      }
    : {
        trackers: 3,
        logs: 18,
        categories: 3
      };

  dom.authPreviewTrackers.textContent = String(marketingPreview.trackers);
  dom.authPreviewLogs.textContent = String(marketingPreview.logs);
  dom.authPreviewCategories.textContent = String(marketingPreview.categories);
}

function forceCloseOverlays() {
  ui.selectedTrackerId = null;
  ui.confirmAction = null;
  ui.guideAutoQueued = false;
  dom.drawerScrim.hidden = true;
  dom.drawerScrim.classList.remove("is-open");
  dom.detailDrawer.classList.remove("is-open");
  dom.detailDrawer.setAttribute("aria-hidden", "true");
  dom.trackerModal.classList.remove("is-open");
  dom.trackerModal.setAttribute("aria-hidden", "true");
  dom.confirmModal.classList.remove("is-open");
  dom.confirmModal.setAttribute("aria-hidden", "true");
  dom.mailModal.classList.remove("is-open");
  dom.mailModal.setAttribute("aria-hidden", "true");
  dom.guideModal.classList.remove("is-open");
  dom.guideModal.setAttribute("aria-hidden", "true");
  dom.proofModal.classList.remove("is-open");
  dom.proofModal.setAttribute("aria-hidden", "true");
  resetLogForm(true);
  dom.body.classList.remove("is-locked");
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const credentials = await collectAuthCredentials();
  if (!credentials) {
    return;
  }

  if (ui.authMode === "login") {
    try {
      const backendResult = await loginWithBackendCredentials(credentials);
      await applyBackendAuthSuccess(backendResult, credentials.payload, "Signed in successfully.");
      return;
    } catch (error) {
      showToast(error.message || "Could not sign you in with that email and password.", "error");
      dom.authPasswordInput.focus();
      return;
    }
  }

  const pending = getPendingAuthOtp();
  if (!isMatchingPendingOtp(pending, credentials.payload)) {
    await issueAuthOtp(false, credentials);
    return;
  }

  const otp = sanitizeText(dom.authOtpInput.value, 6);
  if (!/^\d{6}$/.test(otp)) {
    showToast("Enter the 6-digit OTP from your email inbox.", "error");
    dom.authOtpInput.focus();
    return;
  }

  try {
    const backendResult = await verifyBackendAuthOtp(credentials.payload, otp);
    await applyBackendAuthSuccess(backendResult, credentials.payload, "Email verified. Your workspace is ready.");
    return;
  } catch (error) {
    showToast(error.message || "That OTP could not be verified by the backend.", "error");
    dom.authOtpInput.focus();
    return;
  }
}

async function collectAuthCredentials() {
  const name = sanitizeText(dom.authNameInput.value, 40);
  const email = normalizeEmail(dom.authEmailInput.value);
  const password = dom.authPasswordInput.value.trim();
  const confirmPassword = dom.authConfirmInput.value.trim();

  if (ui.authMode === "create" && !name) {
    showToast("Add a username for this account.", "error");
    dom.authNameInput.focus();
    return null;
  }

  if (!email) {
    showToast(ui.authMode === "create" ? "Add a valid email address before requesting OTP." : "Add a valid email address before signing in.", "error");
    dom.authEmailInput.focus();
    return null;
  }

  if (password.length < 6) {
    showToast("Use a password with at least 6 characters.", "error");
    dom.authPasswordInput.focus();
    return null;
  }

  if (ui.authMode === "create" && password !== confirmPassword) {
    showToast("Your passwords do not match yet.", "error");
    dom.authConfirmInput.focus();
    return null;
  }

  const payload = {
    mode: ui.authMode,
    name: name || getAccount()?.name || email.split("@")[0] || "You",
    email
  };

  return { payload, rawPassword: password };
}

async function issueAuthOtp(forceResend = false, providedPayload = null) {
  if (ui.authMode !== "create") {
    return false;
  }

  const credentials = providedPayload?.payload
    ? providedPayload
    : providedPayload
      ? { payload: providedPayload }
      : await collectAuthCredentials();
  if (!credentials) {
    return false;
  }

  const existingPending = getPendingAuthOtp();
  if (!forceResend && isMatchingPendingOtp(existingPending, credentials.payload)) {
    syncAuthOtpUi();
    renderMailSurfaces();
    showToast(`Use the active OTP already sent to ${credentials.payload.email}.`, "success");
    dom.authOtpInput.focus();
    return true;
  }

  if (!canUseBackendAuth()) {
    showToast("Start the backend server before requesting an email OTP.", "error");
    return false;
  }

  try {
    const backendDelivery = await requestBackendAuthOtp(credentials, forceResend);
    state.settings.authOtp = createBackendPendingOtp(credentials.payload, backendDelivery?.expiresAt);
    saveState();
    dom.authOtpInput.value = "";
    syncAuthOtpUi();
    renderMailSurfaces();
    showToast(`Real OTP sent to ${credentials.payload.email}.`, "success");
    dom.authOtpInput.focus();
    return true;
  } catch (error) {
    showToast(error.message || "The backend could not send a real email OTP.", "error");
    return false;
  }
}

function handleLogoutRequest() {
  openConfirm({
    title: "Log out",
    message: "Sign out of this synced workspace and return to the sign-in screen?",
    action: async () => {
      if (isBackendAuthSession()) {
        try {
          await apiRequest("/auth/logout", {
            method: "POST",
            token: getSession().accessToken
          });
        } catch {
          // Keep logout graceful even if the backend is offline.
        }
      }

      state.settings.session = createSessionState({
        loggedIn: false,
        lastLoginAt: state.settings.session?.lastLoginAt || null,
        authProvider: "backend",
        accessToken: "",
        sessionId: ""
      });
      state.settings.account = null;
      state.settings.authOtp = null;
      state.settings.mailFeed = normalizeMailFeed();
      state.trackers = [];
      saveState();
      setAuthMode("login", false);
      renderApp();
      showToast("Signed out successfully.", "success");
    }
  });
}

async function handleLogProofChange(event) {
  const [file] = event.target.files || [];
  if (!file) {
    clearPendingLogProof(false);
    return;
  }

  if (!file.type.startsWith("image/")) {
    showToast("Choose an image file for proof upload.", "error");
    clearPendingLogProof();
    return;
  }

  if (file.size > 12 * 1024 * 1024) {
    showToast("That image is too large. Pick one under 12 MB.", "error");
    clearPendingLogProof();
    return;
  }

  ui.logProof.processing = true;
  dom.logProofPreview.classList.remove("hidden");
  dom.logProofThumb.removeAttribute("src");
  dom.logProofName.textContent = `Processing ${sanitizeText(file.name, 64) || "image"}...`;

  try {
    const optimized = await prepareProofImage(file);
    ui.logProof.dataUrl = optimized.dataUrl;
    ui.logProof.name = sanitizeText(file.name, 80) || "Proof image";
    ui.logProof.processing = false;
    syncLogProofPreview();
    showToast("Proof image attached.", "success");
  } catch {
    clearPendingLogProof();
    showToast("Couldn't process that image. Try another file.", "error");
  }
}

function clearPendingLogProof(resetInput = true) {
  ui.logProof.dataUrl = "";
  ui.logProof.name = "";
  ui.logProof.processing = false;
  if (resetInput) {
    dom.logProofInput.value = "";
  }
  syncLogProofPreview();
}

function setPendingLogProof(dataUrl = "", name = "") {
  ui.logProof.dataUrl = normalizeImageDataUrl(dataUrl);
  ui.logProof.name = sanitizeText(name, 80) || "Proof image";
  ui.logProof.processing = false;
  dom.logProofInput.value = "";
  syncLogProofPreview();
}

function syncLogProofPreview() {
  const hasProof = Boolean(ui.logProof.dataUrl);
  dom.logProofPreview.classList.toggle("hidden", !hasProof && !ui.logProof.processing);
  dom.logProofTriggerBtn.disabled = ui.logProof.processing;
  dom.logProofInlineBtn.disabled = ui.logProof.processing;
  dom.logProofTriggerBtn.textContent = ui.logProof.processing
    ? "Processing..."
    : hasProof
      ? "Change Proof"
      : "Attach Proof";
  dom.logProofInlineBtn.textContent = ui.logProof.processing
    ? "Processing..."
    : hasProof
      ? "Change Image"
      : "Choose Image";

  if (ui.logProof.processing) {
    dom.logProofStatusBadge.textContent = "Processing proof";
    dom.logProofStatusText.textContent = "Keep this drawer open while your image is being prepared.";
    dom.logProofUploadTitle.textContent = "Preparing image...";
    dom.logProofUploadText.textContent = "Keep this drawer open while your screenshot or photo is compressed.";
  } else if (hasProof) {
    dom.logProofStatusBadge.textContent = "Proof ready";
    dom.logProofStatusText.textContent = `${ui.logProof.name || "Image"} selected. Save this log entry to show the image in Timeline below.`;
    dom.logProofUploadTitle.textContent = ui.logProof.name || "Image selected";
    dom.logProofUploadText.textContent = "Now click Add Log Entry. After saving, the proof image will appear in Timeline below.";
  } else {
    dom.logProofStatusBadge.textContent = "No proof attached";
    dom.logProofStatusText.textContent = "Click Attach Proof, then save the log entry. The image will appear in Timeline below.";
    dom.logProofUploadTitle.textContent = "No image selected yet";
    dom.logProofUploadText.textContent = "Add a screenshot or photo here. After you save the log, it will show in Timeline below.";
  }

  if (!hasProof) {
    if (!ui.logProof.processing) {
      dom.logProofThumb.removeAttribute("src");
      dom.logProofName.textContent = "No proof image selected";
    }
    return;
  }

  dom.logProofThumb.src = ui.logProof.dataUrl;
  dom.logProofName.textContent = ui.logProof.name || "Proof image";
}

function openProofModal(trackerId, logId) {
  const tracker = findTracker(trackerId);
  const log = tracker?.logs.find((entry) => entry.id === logId);
  if (!tracker || !log?.proofImage) return;

  dom.proofModalImage.src = log.proofImage;
  dom.proofModalImage.alt = `Progress proof for ${tracker.title}`;
  dom.proofModalCaption.textContent = log.proofName
    ? `${log.proofName} · ${buildProofCaption(tracker, log)}`
    : buildProofCaption(tracker, log);
  dom.proofModal.classList.add("is-open");
  dom.proofModal.setAttribute("aria-hidden", "false");
  syncOverlayLock();
}

function closeProofModal() {
  dom.proofModal.classList.remove("is-open");
  dom.proofModal.setAttribute("aria-hidden", "true");
  dom.proofModalImage.removeAttribute("src");
  syncOverlayLock();
}

function openMailModal() {
  if (!isAuthenticated()) {
    showToast("Verify your email and sign in before opening the mail center.", "error");
    return;
  }

  markMailFeedRead();
  renderMailModalSummary();
  dom.mailModal.classList.add("is-open");
  dom.mailModal.setAttribute("aria-hidden", "false");
  syncOverlayLock();
  requestAnimationFrame(() => registerRevealElements(dom.mailModal));
}

function closeMailModal() {
  dom.mailModal.classList.remove("is-open");
  dom.mailModal.setAttribute("aria-hidden", "true");
  syncOverlayLock();
}

async function requestBackendAuthOtp(credentials) {
  // Real OTP flow: the frontend only requests delivery; it never generates or previews a code.
  const requestBody = {
    name: credentials.payload.name,
    email: credentials.payload.email,
    password: credentials.rawPassword
  };

  try {
    const response = await apiRequest("/auth/register", {
      method: "POST",
      body: requestBody
    });
    return getApiData(response).delivery || {};
  } catch (error) {
    if (error?.status === 409) {
      try {
        const resendResponse = await apiRequest("/auth/resend-verification", {
          method: "POST",
          body: {
            email: credentials.payload.email
          }
        });
        return getApiData(resendResponse).delivery || {};
      } catch (resendError) {
        if (resendError?.status === 400) {
          setAuthMode("login", false);
        }
        throw resendError;
      }
    }
    throw error;
  }
}

async function verifyBackendAuthOtp(payload, otp) {
  return apiRequest("/auth/verify-email", {
    method: "POST",
    body: {
      email: payload.email,
      otp
    }
  });
}

async function loginWithBackendCredentials(credentials) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: {
      email: credentials.payload.email,
      password: credentials.rawPassword
    }
  });
}

async function applyBackendAuthSuccess(result, payload, successMessage) {
  const data = getApiData(result);
  const user = data.user || null;
  if (!user?.email) {
    throw new Error("Backend verification did not return a valid user.");
  }

  state.settings.account = mapBackendUserToLocalAccount(user);
  state.settings.session = createSessionState({
    loggedIn: true,
    lastLoginAt: user.lastLoginAt || data.session?.createdAt || new Date().toISOString(),
    authProvider: "backend",
    accessToken: data.accessToken || "",
    sessionId: data.session?.id || ""
  });
  clearPendingAuthOtp(false);
  saveState();
  try {
    await syncWorkspaceFromBackend();
  } catch (error) {
    console.error(error);
    state.trackers = [];
    saveState();
  }
  renderApp();
  showToast(successMessage || `Welcome back, ${user.name}.`, "success");
}

function getPasswordResetBaseUrl() {
  return BACKEND_ORIGIN;
}

function openForgotPasswordFlow() {
  dom.authForm.classList.add("hidden");
  dom.authOtpShell.classList.add("hidden");
  dom.authResetShell.classList.remove("hidden");
  
  // Show email field, hide password fields for forgot password flow
  dom.authForgotEmailField.classList.remove("hidden");
  dom.authResetPasswordField.classList.add("hidden");
  dom.authResetConfirmField.classList.add("hidden");
  
  dom.authForgotEmailInput.value = dom.authEmailInput.value;
  dom.authResetSubmitBtn.textContent = "Send Password Reset Email";
  dom.authResetStatus.textContent = "Recover your account";
  dom.authResetHelpText.textContent = "Enter your email address and we'll send a password reset link to your inbox.";
  
  dom.authForgotEmailInput.focus();
  dom.body.classList.add("is-locked");
}

function closeForgotPasswordFlow() {
  dom.authForm.classList.remove("hidden");
  dom.authResetShell.classList.add("hidden");
  dom.authForgotEmailInput.value = "";
  dom.authResetPasswordInput.value = "";
  dom.authResetConfirmInput.value = "";
  dom.authResetPasswordInput.removeAttribute("data-reset-token");
  if (window.location.search.includes("token=") || window.location.search.includes("resetToken=")) {
    window.history.replaceState({}, document.title, getPasswordResetBaseUrl());
  }
  dom.body.classList.remove("is-locked");
}

function checkForPasswordResetToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const resetToken = urlParams.get("resetToken") || urlParams.get("token");

  if (resetToken) {
    dom.authForm.classList.add("hidden");
    dom.authResetShell.classList.remove("hidden");
    
    // Show password fields, hide email field for reset flow
    dom.authForgotEmailField.classList.add("hidden");
    dom.authResetPasswordField.classList.remove("hidden");
    dom.authResetConfirmField.classList.remove("hidden");
    
    dom.authResetPasswordInput.value = "";
    dom.authResetConfirmInput.value = "";
    dom.authResetPasswordInput.dataset.resetToken = resetToken;
    dom.authResetSubmitBtn.textContent = "Save New Password";
    dom.authResetStatus.textContent = "Reset your password";
    dom.authResetHelpText.textContent = "Enter a new password for your account and confirm it below.";
    
    dom.authResetPasswordInput.focus();
    dom.body.classList.add("is-locked");
  }
}

async function handlePasswordResetSubmit() {
  const resetToken = dom.authResetPasswordInput.dataset.resetToken;
  
  // If we have a reset token, this is completing a password reset from the email link
  if (resetToken) {
    const newPassword = dom.authResetPasswordInput.value.trim();
    const confirmPassword = dom.authResetConfirmInput.value.trim();

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      dom.authResetPasswordInput.focus();
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      dom.authResetConfirmInput.focus();
      return;
    }

    dom.authResetSubmitBtn.disabled = true;
    dom.authResetSubmitBtn.textContent = "Resetting password...";

    try {
      await apiRequest("/auth/reset-password", {
        method: "POST",
        body: { 
          token: resetToken,
          password: newPassword
        }
      });
      
      showToast("Password reset successfully. You can now sign in with your new password.", "success");
      dom.authResetPasswordInput.removeAttribute("data-reset-token");
      dom.authResetPasswordInput.value = "";
      dom.authResetConfirmInput.value = "";
      closeForgotPasswordFlow();
      setAuthMode("login", false);
      // Clear the token from URL
      window.history.replaceState({}, document.title, getPasswordResetBaseUrl());
    } catch (error) {
      showToast(error.message || "Could not reset password. The link may have expired.", "error");
    } finally {
      dom.authResetSubmitBtn.disabled = false;
      dom.authResetSubmitBtn.textContent = "Save New Password";
    }
  } else {
    // Otherwise, this is a forgot password request to send a reset email
    const email = normalizeEmail(dom.authForgotEmailInput.value);
    
    if (!email) {
      showToast("Enter your email address first.", "error");
      dom.authForgotEmailInput.focus();
      return;
    }

    dom.authResetSubmitBtn.disabled = true;
    dom.authResetSubmitBtn.textContent = "Sending reset email...";

    try {
      await apiRequest("/auth/forgot-password", {
        method: "POST",
        body: {
          email,
          resetUrlBase: getPasswordResetBaseUrl()
        }
      });
      
      showToast("Password reset email sent. Check your inbox for further instructions.", "success");
      closeForgotPasswordFlow();
      setAuthMode("login", false);
    } catch (error) {
      showToast(error.message || "Could not send reset email. Please try again.", "error");
    } finally {
      dom.authResetSubmitBtn.disabled = false;
      dom.authResetSubmitBtn.textContent = "Send Password Reset Email";
    }
  }
}

function getGuideState() {
  return state?.settings?.guide || { seenAt: null, lastOpenedAt: null };
}

function syncGuideCtas() {
  const authenticated = isAuthenticated();
  if (dom.guideOpenGraphsBtn) {
    dom.guideOpenGraphsBtn.disabled = !authenticated;
    dom.guideOpenGraphsBtn.classList.toggle("hidden", !authenticated);
  }
  if (dom.guideCreateTrackerBtn) {
    dom.guideCreateTrackerBtn.disabled = !authenticated;
    dom.guideCreateTrackerBtn.classList.toggle("hidden", !authenticated);
  }
  if (dom.guideAuthHint) {
    dom.guideAuthHint.textContent = authenticated
      ? "Tip: start by opening a sample tracker, then create your own and use Quick Log for your first saved update."
      : "Tip: after this walkthrough, create access or sign in to unlock trackers, graphs, history, and proof uploads.";
  }
  if (dom.guideModalSubtitle) {
    dom.guideModalSubtitle.textContent = authenticated
      ? "Understand what the website is for, how to log progress, and where to see your graphs, history, proof uploads, and backups."
      : "Preview the workflow first, then create access or sign in to unlock your synced workspace.";
  }
}

function rememberGuideOpened() {
  if (!state?.settings) return;
  if (!state.settings.guide) {
    state.settings.guide = { seenAt: null, lastOpenedAt: null };
  }

  const timestamp = new Date().toISOString();
  state.settings.guide.lastOpenedAt = timestamp;
  if (!state.settings.guide.seenAt) {
    state.settings.guide.seenAt = timestamp;
  }
  saveState();
}

function openGuideModal(source = "manual") {
  syncGuideCtas();
  dom.guideModal.classList.add("is-open");
  dom.guideModal.setAttribute("aria-hidden", "false");
  syncOverlayLock();
  requestAnimationFrame(() => registerRevealElements(dom.guideModal));

  if (source === "auto" || source === "workspace" || source === "auth") {
    rememberGuideOpened();
  }
}

function closeGuideModal() {
  dom.guideModal.classList.remove("is-open");
  dom.guideModal.setAttribute("aria-hidden", "true");
  syncOverlayLock();
}

function maybeOpenGuideOnboarding() {
  const guide = getGuideState();
  if (!isAuthenticated() || guide.seenAt || ui.guideAutoQueued || dom.body.classList.contains("is-locked")) {
    return;
  }

  ui.guideAutoQueued = true;
  window.setTimeout(() => {
    ui.guideAutoQueued = false;
    if (!isAuthenticated() || getGuideState().seenAt || dom.body.classList.contains("is-locked")) {
      return;
    }
    openGuideModal("auto");
  }, 220);
}

function markMailFeedRead() {
  if (!state?.settings?.mailFeed) return;
  state.settings.mailFeed.lastOpenedAt = new Date().toISOString();
  saveState();
  renderMailSurfaces();
}

function handleMailFeedClick(event) {
  const trackerButton = event.target.closest("[data-mail-open-tracker]");
  if (!trackerButton) return;

  const trackerId = trackerButton.dataset.mailOpenTracker;
  if (!trackerId) return;

  closeMailModal();
  openDetailDrawer(trackerId);
}

function setupCursorFx() {
  const hasFinePointer = window.matchMedia("(pointer: fine)").matches;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasLargeViewport = window.matchMedia("(min-width: 1100px)").matches;
  const likelyLowerPowerDevice =
    typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 6;

  if (!hasFinePointer || prefersReducedMotion || !hasLargeViewport || likelyLowerPowerDevice) {
    return;
  }

  const layer = document.createElement("div");
  layer.className = "cursor-fx is-hidden";
  layer.setAttribute("aria-hidden", "true");
  layer.innerHTML = `
    <div class="cursor-halo"></div>
    <div class="cursor-dot"></div>
  `;

  document.body.append(layer);

  cursorFx.enabled = true;
  cursorFx.layer = layer;
  cursorFx.halo = layer.querySelector(".cursor-halo");
  cursorFx.dot = layer.querySelector(".cursor-dot");

  document.addEventListener("pointermove", handleCursorFxMove, { passive: true });
  document.addEventListener("pointerdown", handleCursorFxPress, { passive: true });
  document.documentElement.addEventListener("mouseleave", hideCursorFx);
  window.addEventListener("blur", hideCursorFx);
  window.addEventListener("resize", handleCursorFxResize, { passive: true });

  renderCursorFxPosition(cursorFx.x, cursorFx.y);
}

function handleCursorFxMove(event) {
  if (!cursorFx.enabled || (event.pointerType && event.pointerType !== "mouse")) {
    return;
  }

  cursorFx.x = event.clientX;
  cursorFx.y = event.clientY;
  cursorFx.layer.classList.remove("is-hidden");
  scheduleCursorFxRender();
}

function handleCursorFxPress(event) {
  if (!cursorFx.enabled || (event.pointerType && event.pointerType !== "mouse")) {
    return;
  }

  cursorFx.x = event.clientX;
  cursorFx.y = event.clientY;
  cursorFx.layer.classList.remove("is-hidden");
  scheduleCursorFxRender();
  spawnCursorFxDrop(event.clientX, event.clientY, true);
}

function hideCursorFx() {
  if (!cursorFx.enabled || !cursorFx.layer) {
    return;
  }

  cursorFx.layer.classList.add("is-hidden");
}

function handleCursorFxResize() {
  if (!cursorFx.enabled) {
    return;
  }

  cursorFx.x = clamp(cursorFx.x, 0, window.innerWidth);
  cursorFx.y = clamp(cursorFx.y, 0, window.innerHeight);
  scheduleCursorFxRender();
}

function scheduleCursorFxRender() {
  if (cursorFx.frame) {
    return;
  }

  cursorFx.frame = window.requestAnimationFrame(() => {
    cursorFx.frame = 0;
    renderCursorFxPosition(cursorFx.x, cursorFx.y);
  });
}

function renderCursorFxPosition(x, y) {
  if (cursorFx.halo) {
    cursorFx.halo.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }

  if (cursorFx.dot) {
    cursorFx.dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }
}

function spawnCursorFxDrop(x, y, isIntense = false) {
  if (!cursorFx.layer) {
    return;
  }

  const drop = document.createElement("span");
  const size = isIntense ? 56 : 20 + Math.random() * 18;
  const useWarmTint = isIntense || Math.random() > 0.62;

  drop.className = "cursor-drop";
  drop.style.left = `${x}px`;
  drop.style.top = `${y}px`;
  drop.style.setProperty("--drop-size", `${size}px`);
  drop.style.setProperty("--drop-blur", `${isIntense ? 1 : 0}px`);
  drop.style.setProperty(
    "--drop-color",
    useWarmTint ? "rgba(255, 180, 118, 0.26)" : "rgba(93, 228, 199, 0.24)"
  );
  drop.style.animationDuration = `${isIntense ? 720 : 420 + Math.random() * 100}ms`;

  cursorFx.layer.append(drop);
  drop.addEventListener("animationend", () => drop.remove(), { once: true });

  const activeDrops = cursorFx.layer.querySelectorAll(".cursor-drop");
  if (activeDrops.length > 4) {
    activeDrops[0]?.remove();
  }
}

function loadState() {
  let parsed = null;

  try {
    parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    parsed = null;
  }

  if (!parsed) {
    const initial = createInitialState();
    saveState(initial);
    return initial;
  }

  const normalized = normalizeState(parsed.state || parsed);
  saveState(normalized);
  return normalized;
}

function saveState(nextState = state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistedState(nextState)));
    return true;
  } catch (error) {
    console.error(error);
    if (dom.toastContainer) {
      showToast("Couldn't save your local session preferences.", "error");
    }
    return false;
  }
}

function getPersistedState(nextState = state) {
  // REFACTOR
  // Persist UI/session plus a cached workspace snapshot so the app can fall back locally if the backend is unavailable.
  return {
    version: 5,
    settings: {
      theme: nextState?.settings?.theme === "light" ? "light" : "dark",
      account: nextState?.settings?.account
        ? {
            name: nextState.settings.account.name,
            email: nextState.settings.account.email,
            emailVerifiedAt: nextState.settings.account.emailVerifiedAt,
            emailUpdatesEnabled: nextState.settings.account.emailUpdatesEnabled !== false,
            createdAt: nextState.settings.account.createdAt,
            lastLoginAt: nextState.settings.account.lastLoginAt
          }
        : null,
      session: {
        loggedIn: Boolean(nextState?.settings?.session?.loggedIn),
        lastLoginAt: nextState?.settings?.session?.lastLoginAt || null,
        authProvider: nextState?.settings?.session?.authProvider === "backend" ? "backend" : "local",
        accessToken: nextState?.settings?.session?.accessToken || "",
        sessionId: nextState?.settings?.session?.sessionId || ""
      },
      guide: normalizeGuideState(nextState?.settings?.guide),
      focusSession: createFocusSessionState(nextState?.settings?.focusSession),
      sync: createSyncState(nextState?.settings?.sync)
    },
    meta: {
      createdAt: normalizeIso(nextState?.meta?.createdAt || new Date().toISOString())
    },
    data: {
      trackers: Array.isArray(nextState?.trackers) ? nextState.trackers : []
    }
  };
}

function pushMailMessage(message) {
  if (!state?.settings) return;

  if (!state.settings.mailFeed) {
    state.settings.mailFeed = {
      messages: [],
      lastOpenedAt: null
    };
  }

  state.settings.mailFeed.messages.unshift(normalizeMailMessage(message));
  state.settings.mailFeed.messages = state.settings.mailFeed.messages
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, MAIL_FEED_LIMIT);
}

function queueWorkspaceEmail({ type = "workspace", subject, preview = "", body = "", tracker = null, log = null, accentColor = "" }) {
  const account = getAccount();
  if (!account?.email || account.emailUpdatesEnabled === false) {
    return;
  }

  pushMailMessage({
    type,
    to: account.email,
    subject,
    preview,
    body,
    trackerId: tracker?.id || "",
    logId: log?.id || "",
    accentColor: accentColor || tracker?.accentColor || "#5de4c7",
    createdAt: new Date().toISOString()
  });
}

function createInitialState() {
  return {
    version: 5,
    settings: {
      theme: DEFAULT_THEME,
      account: null,
      session: createSessionState(),
      authOtp: null,
      guide: {
        seenAt: null,
        lastOpenedAt: null
      },
      mailFeed: {
        messages: [],
        lastOpenedAt: null
      },
      focusSession: createFocusSessionState(),
      sync: createSyncState()
    },
    meta: {
      createdAt: new Date().toISOString()
    },
    trackers: []
  };
}

function normalizeState(raw) {
  const account = normalizeAccount(raw?.settings?.account);
  const normalizedTrackers = Array.isArray(raw?.data?.trackers)
    ? raw.data.trackers.map((tracker, index) => normalizeTracker(tracker, index))
    : Array.isArray(raw?.trackers)
      ? raw.trackers.map((tracker, index) => normalizeTracker(tracker, index))
      : [];

  return {
    version: 5,
    settings: {
      theme: raw?.settings?.theme === "light" ? "light" : raw?.settings?.theme === "dark" ? "dark" : DEFAULT_THEME,
      account,
      session: normalizeSession(raw?.settings?.session, account),
      authOtp: null,
      guide: normalizeGuideState(raw?.settings?.guide),
      mailFeed: { messages: [], lastOpenedAt: null },
      focusSession: createFocusSessionState(raw?.settings?.focusSession),
      sync: createSyncState(raw?.settings?.sync)
    },
    meta: {
      createdAt: normalizeIso(raw?.meta?.createdAt || new Date().toISOString())
    },
    trackers: normalizedTrackers
  };
}

function normalizeTracker(tracker, index = 0) {
  const createdAt = normalizeIso(tracker?.createdAt || new Date(Date.now() + index).toISOString());
  const startValue = roundNumber(toNumber(tracker?.startValue, 0));
  const safeTarget = roundNumber(toNumber(tracker?.targetValue, startValue + 1));
  const targetValue = safeTarget <= startValue ? roundNumber(startValue + 1) : safeTarget;
  const logs = Array.isArray(tracker?.logs)
    ? tracker.logs.map((log, logIndex) => normalizeLog(log, logIndex, createdAt))
    : [];

  return recalculateTracker({
    id: tracker?.id || createId("trk"),
    title: sanitizeText(tracker?.title, 80) || `Untitled tracker ${index + 1}`,
    createdBy: sanitizeText(tracker?.createdBy, 40) || "You",
    category: sanitizeText(tracker?.category, 40) || "Custom",
    itemName: sanitizeText(tracker?.itemName, 80),
    goalType: sanitizeText(tracker?.goalType, 40) || "Target progress",
    unitType: sanitizeText(tracker?.unitType, 20) || "custom",
    unitLabel: sanitizeText(tracker?.unitLabel, 20) || sanitizeText(tracker?.unitType, 20) || "units",
    startValue,
    targetValue,
    currentValue: roundNumber(toNumber(tracker?.currentValue, startValue)),
    deadline: normalizeDateOnly(tracker?.deadline),
    priority: PRIORITY_VALUES.includes(tracker?.priority) ? tracker.priority : "Medium",
    notes: sanitizeMultiline(tracker?.notes, 400),
    accentColor: normalizeHexColor(tracker?.accentColor) || "#5de4c7",
    icon: normalizeIcon(tracker?.icon) || guessIcon(tracker?.title, tracker?.category, tracker?.itemName),
    customFields: normalizeCustomFields(tracker?.customFields),
    archived: Boolean(tracker?.archived),
    createdAt,
    updatedAt: normalizeIso(tracker?.updatedAt || createdAt),
    completedAt: tracker?.completedAt ? normalizeIso(tracker.completedAt) : null,
    logs
  });
}

function normalizeAccount(account) {
  const name = sanitizeText(account?.name, 40);
  const email = normalizeEmail(account?.email);
  if (!name || !email) {
    return null;
  }

  return {
    name,
    email,
    emailVerifiedAt: account?.emailVerifiedAt ? normalizeIso(account.emailVerifiedAt) : normalizeIso(account?.createdAt || new Date().toISOString()),
    emailUpdatesEnabled: account?.emailUpdatesEnabled !== false,
    createdAt: normalizeIso(account?.createdAt || new Date().toISOString()),
    lastLoginAt: account?.lastLoginAt ? normalizeIso(account.lastLoginAt) : null
  };
}

function normalizeSession(session, account) {
  if (!account) {
    return createSessionState();
  }

  return createSessionState({
    loggedIn: Boolean(session?.loggedIn),
    lastLoginAt: session?.lastLoginAt
      ? normalizeIso(session.lastLoginAt)
      : account.lastLoginAt
        ? normalizeIso(account.lastLoginAt)
        : normalizeIso(account.createdAt),
    authProvider: session?.authProvider === "backend" ? "backend" : "local",
    accessToken: sanitizeText(session?.accessToken, 4096),
    sessionId: sanitizeText(session?.sessionId, 120)
  });
}

function normalizeAuthOtp(authOtp) {
  const name = sanitizeText(authOtp?.name, 40);
  const email = normalizeEmail(authOtp?.email);
  const mode = AUTH_MODES.includes(authOtp?.mode) ? authOtp.mode : "";

  if (!name || !email || !mode) {
    return null;
  }

  return {
    provider: "backend",
    mode,
    name,
    email,
    sentAt: normalizeIso(authOtp?.sentAt || new Date().toISOString()),
    expiresAt: normalizeIso(authOtp?.expiresAt || new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString())
  };
}

function normalizeGuideState(guide) {
  return {
    seenAt: guide?.seenAt ? normalizeIso(guide.seenAt) : null,
    lastOpenedAt: guide?.lastOpenedAt ? normalizeIso(guide.lastOpenedAt) : null
  };
}

function normalizeMailFeed(feed) {
  const messages = Array.isArray(feed?.messages)
    ? feed.messages.map((message, index) => normalizeMailMessage(message, index)).filter(Boolean)
    : [];

  return {
    messages: messages
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, MAIL_FEED_LIMIT),
    lastOpenedAt: feed?.lastOpenedAt ? normalizeIso(feed.lastOpenedAt) : null
  };
}

function normalizeMailMessage(message, index = 0) {
  const subject = sanitizeText(message?.subject, 120);
  if (!subject) {
    return null;
  }

  const code = String(message?.code || "").trim();

  return {
    id: message?.id || createId(`mail-${index}`),
    type: sanitizeText(message?.type, 24) || "workspace",
    to: normalizeEmail(message?.to) || "",
    subject,
    preview: sanitizeMultiline(message?.preview, 240),
    body: sanitizeMultiline(message?.body, 800),
    code: /^\d{6}$/.test(code) ? code : "",
    trackerId: sanitizeText(message?.trackerId, 80),
    logId: sanitizeText(message?.logId, 80),
    accentColor: normalizeHexColor(message?.accentColor) || "#5de4c7",
    createdAt: normalizeIso(message?.createdAt || new Date(Date.now() + index).toISOString())
  };
}

function normalizeLog(log, index = 0, fallbackTimestamp = new Date().toISOString()) {
  const timestamp = normalizeIso(log?.timestamp || log?.createdAt || fallbackTimestamp);

  return {
    id: log?.id || createId(`log-${index}`),
    amount: roundNumber(toNumber(log?.amount, 0)),
    timestamp,
    note: sanitizeMultiline(log?.note, 240),
    tag: sanitizeText(log?.tag, 40),
    proofImage: normalizeImageDataUrl(log?.proofImage),
    proofName: sanitizeText(log?.proofName, 80),
    system: Boolean(log?.system),
    readOnly: Boolean(log?.readOnly),
    createdAt: normalizeIso(log?.createdAt || timestamp),
    updatedAt: normalizeIso(log?.updatedAt || timestamp)
  };
}

function normalizeCustomFields(fields) {
  if (!Array.isArray(fields)) return [];

  return fields
    .map((field, index) => ({
      id: field?.id || createId(`field-${index}`),
      label: sanitizeText(field?.label, 32),
      value: sanitizeText(field?.value, 80)
    }))
    .filter((field) => field.label && field.value);
}

function recalculateTracker(tracker) {
  const logs = [...tracker.logs].map((log, index) => normalizeLog(log, index, tracker.createdAt));
  const currentValue = roundNumber(tracker.startValue + logs.reduce((sum, log) => sum + log.amount, 0));
  const ratio = getProgressRatio(tracker.startValue, tracker.targetValue, currentValue);
  const latestTimestamp = getLatestTimestamp([tracker.createdAt, tracker.updatedAt, ...logs.map((log) => log.updatedAt || log.timestamp)]);
  const isCompleted = ratio >= 1;

  return {
    ...tracker,
    logs,
    currentValue,
    updatedAt: latestTimestamp,
    completedAt: isCompleted ? normalizeIso(tracker.completedAt || latestTimestamp) : null,
    streak: calculateStreak(logs)
  };
}

function createSampleTrackers() {
  return [
    buildSeedTracker(
      {
        title: "Climb to Diamond",
        category: "Gaming",
        itemName: "Valorant ranked push",
        goalType: "Performance climb",
        unitType: "custom",
        unitLabel: "RR",
        startValue: 40,
        targetValue: 200,
        deadline: dateOnlyFromDaysOffset(12),
        priority: "High",
        createdBy: "You",
        accentColor: "#45d3b1",
        icon: "🎮",
        notes: "Track rank rating swings, ranked hours, missions, and achievement pace without locking the tracker to a rigid game-specific schema.",
        customFields: [
          { label: "Current rank", value: "Gold 3" },
          { label: "Achievements", value: "12 / 25" },
          { label: "Hours played", value: "36" }
        ]
      },
      [
        sampleLog(18, 8, 20, 15, "Strong opening session", "Ranked"),
        sampleLog(22, 7, 21, 0, "Won four straight on Bind", "Duo queue"),
        sampleLog(-6, 5, 18, 30, "Correction after RR decay", "Correction"),
        sampleLog(31, 4, 23, 10, "Clutch-heavy night queue", "Prime time"),
        sampleLog(20, 2, 19, 45, "Weekend ladder push", "Ranked"),
        sampleLog(23, 0, 22, 5, "Late session and mission cleanup", "Tonight")
      ]
    ),
    buildSeedTracker(
      {
        title: "Data Structures Sprint",
        category: "Study",
        itemName: "Algorithms + mock tests",
        goalType: "Syllabus coverage",
        unitType: "hours",
        unitLabel: "hours",
        startValue: 0,
        targetValue: 60,
        deadline: dateOnlyFromDaysOffset(8),
        priority: "Critical",
        createdBy: "You",
        accentColor: "#6bb6ff",
        icon: "📚",
        notes: "Balance chapter coverage with timed mock tests, error review, and short recap notes after each session.",
        customFields: [
          { label: "Subject", value: "DSA" },
          { label: "Exam", value: "Midterm" },
          { label: "Chapters", value: "7 / 10" }
        ]
      },
      [
        sampleLog(4.5, 9, 7, 30, "Graphs revision block", "Morning"),
        sampleLog(6, 7, 18, 0, "Trees + recursion drills", "Deep work"),
        sampleLog(5.5, 5, 20, 10, "Mock test review", "Revision"),
        sampleLog(8, 3, 21, 45, "Dynamic programming sprint", "Focus block"),
        sampleLog(7.5, 1, 19, 20, "Sorting recap and notes", "Recap"),
        sampleLog(10.5, 0, 8, 10, "Timed practice + notes", "Today")
      ]
    ),
    buildSeedTracker(
      {
        title: "Half Marathon Block",
        category: "Exercise",
        itemName: "10K to 21K plan",
        goalType: "Distance goal",
        unitType: "km",
        unitLabel: "km",
        startValue: 0,
        targetValue: 80,
        deadline: dateOnlyFromDaysOffset(5),
        priority: "Medium",
        createdBy: "You",
        accentColor: "#ff9f68",
        icon: "🏃",
        notes: "Track long runs, recovery days, and pace confidence. Negative corrections can represent GPS cleanup or session edits.",
        customFields: [
          { label: "Sessions", value: "11" },
          { label: "Best pace", value: "5:02 / km" },
          { label: "Calories", value: "6,240" }
        ]
      },
      [
        sampleLog(8, 10, 6, 30, "Easy 8K base run", "Easy"),
        sampleLog(6, 8, 7, 15, "Recovery run", "Recovery"),
        sampleLog(10, 7, 6, 20, "Tempo interval session", "Tempo"),
        sampleLog(12, 5, 6, 5, "Long steady run", "Long run"),
        sampleLog(8, 4, 18, 45, "Hill work cleanup", "Hill"),
        sampleLog(10, 3, 6, 10, "Progression run", "Progression"),
        sampleLog(12, 2, 7, 0, "Long run confidence builder", "Long run"),
        sampleLog(18, 0, 6, 40, "Race pace simulation", "Today")
      ]
    )
  ];
}

function buildSeedTracker(config, logs) {
  return recalculateTracker({
    id: createId("trk"),
    title: config.title,
    createdBy: sanitizeText(config.createdBy, 40) || "You",
    category: config.category,
    itemName: config.itemName,
    goalType: config.goalType,
    unitType: config.unitType,
    unitLabel: config.unitLabel,
    startValue: config.startValue,
    targetValue: config.targetValue,
    currentValue: config.startValue,
    deadline: config.deadline,
    priority: config.priority,
    notes: config.notes,
    accentColor: config.accentColor,
    icon: config.icon,
    customFields: normalizeCustomFields(config.customFields),
    archived: false,
    createdAt: logs.at(-1)?.timestamp || new Date().toISOString(),
    updatedAt: logs[0]?.timestamp || new Date().toISOString(),
    completedAt: null,
    logs
  });
}

function sampleLog(amount, daysAgo, hours = 18, minutes = 0, note = "", tag = "", system = false) {
  return {
    id: createId("log"),
    amount: roundNumber(amount),
    timestamp: timestampFromOffset(-daysAgo, hours, minutes),
    note,
    tag,
    system,
    createdAt: timestampFromOffset(-daysAgo, hours, minutes),
    updatedAt: timestampFromOffset(-daysAgo, hours, minutes)
  };
}
function renderApp() {
  syncTheme();
  renderAuthPreview();
  setAuthMode(getDefaultAuthMode(), false);
  syncAuthUi();
  renderMailSurfaces();

  if (!isAuthenticated()) {
    ui.guideAutoQueued = false;
    return;
  }

  syncFilterInputs();
  renderViewState();
  renderHeaderAndHero();
  renderDashboard();
  renderTrackers();
  renderGraphs();
  renderHistory();
  renderDetailDrawer();
  syncFocusModeUi();
  syncFocusTimerLoop();
  syncOverlayLock();
  maybeOpenGuideOnboarding();

  requestAnimationFrame(() => {
    animateProgressVisuals(document);
    registerRevealElements(document);
  });
}

function renderViewState() {
  dom.navButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.viewTarget === ui.activeView);
  });

  dom.viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === ui.activeView);
  });

  const activePanel = dom.viewPanels.find((panel) => panel.dataset.viewPanel === ui.activeView);
  if (activePanel) {
    requestAnimationFrame(() => registerRevealElements(activePanel));
  }
}

function renderHeaderAndHero() {
  const overview = getOverview();
  const liveTrackers = getLiveTrackers();
  const categories = getCategoryStats();
  const topCategory = categories[0] || null;
  const dueSoon = getUpcomingItems(1)[0] || null;
  const uniqueCategories = getUniqueCategories().length;
  const syncState = getSyncState();

  dom.todayChip.textContent = formatCalendarDate(new Date(), { weekday: "short", month: "short", day: "numeric" });
  dom.topbarSubtitle.textContent = syncState.mode === LOCAL_SYNC_MODE
    ? `Local-only mode is active while the backend is unavailable. Your cached workspace remains usable and will stay on this device.`
    : overview.totalTrackers
      ? `${overview.activeTrackers} active trackers, ${overview.completedTrackers} completed, ${overview.archivedTrackers} archived, and ${overview.dueSoon} deadlines in the next 7 days.`
      : "Create your first tracker to start a backend-connected workspace with manual logs, proof uploads, and visual progress boards.";

  dom.sidebarTrackerCount.textContent = `${overview.totalTrackers} tracker${overview.totalTrackers === 1 ? "" : "s"}`;
  dom.sidebarSummary.textContent = `${overview.activeTrackers} active, ${overview.completedTrackers} completed, ${overview.archivedTrackers} archived.`;
  setRingState(dom.sidebarRing, dom.sidebarCompletionLabel, overview.overallCompletionPercent, `${overview.overallCompletionPercent}%`);

  setRingState(dom.heroRing, dom.heroRingLabel, overview.overallCompletionPercent, `${overview.overallCompletionPercent}%`);
  dom.heroCompletionValue.textContent = `${overview.overallCompletionPercent}%`;
  dom.heroCompletionNote.textContent = liveTrackers.length
    ? `${overview.activeTrackers} active, ${overview.completedTrackers} completed, ${overview.manualLogCount} total manual entries.`
    : "Create your first tracker to start building momentum.";

  dom.heroTodayMetric.textContent = formatSignedNumber(overview.todayNet, 1);
  dom.heroTodayNote.textContent = overview.todayEntries
    ? `${overview.todayEntries} entr${overview.todayEntries === 1 ? "y" : "ies"} logged today.`
    : "No progress logged today yet. Open any tracker and use Quick Log.";

  dom.heroDueSoonMetric.textContent = String(overview.dueSoon);
  dom.heroDueSoonNote.textContent = dueSoon
    ? `${dueSoon.tracker.title} ${getDeadlineInfo(dueSoon.tracker.deadline).label.toLowerCase()}.`
    : "No urgent deadlines or next-step milestones.";

  dom.heroTopCategoryMetric.textContent = topCategory ? topCategory.category : "-";
  dom.heroTopCategoryNote.textContent = topCategory
    ? `${topCategory.count} tracker${topCategory.count === 1 ? "" : "s"} · ${topCategory.avgCompletion}% average completion.`
    : "Starts once your trackers begin to diversify.";

  dom.heroWeeklyMetric.textContent = formatSignedNumber(overview.weekTotal, 1);
  dom.heroWeeklyNote.textContent = overview.weekManualEntries
    ? `${overview.weekManualEntries} entr${overview.weekManualEntries === 1 ? "y" : "ies"} this week • ${overview.weekDeltaLabel}.`
    : "No entries this week yet. Open any tracker and log your next update.";

  animateNumber(dom.statTotalTrackers, overview.totalTrackers, (value) => formatNumber(value, 0));
  dom.statTotalTrackersMeta.textContent = `${uniqueCategories} categor${uniqueCategories === 1 ? "y" : "ies"} represented.`;

  animateNumber(dom.statActiveGoals, overview.activeTrackers, (value) => formatNumber(value, 0));
  dom.statActiveGoalsMeta.textContent = `${overview.archivedTrackers} archived for later.`;

  animateNumber(dom.statCompletedGoals, overview.completedTrackers, (value) => formatNumber(value, 0));
  dom.statCompletedGoalsMeta.textContent = overview.completedTrackers
    ? `${overview.completedTrackers} tracker${overview.completedTrackers === 1 ? "" : "s"} reached target.`
    : "No trackers have crossed the finish line yet.";

  animateNumber(dom.statTodayProgress, overview.todayNet, (value) => formatSignedNumber(value, 1));
  dom.statTodayProgressMeta.textContent = overview.todayEntries
    ? `Across ${overview.todayEntries} entr${overview.todayEntries === 1 ? "y" : "ies"}.`
    : "Use Quick Log to capture your first update today.";

  animateNumber(dom.statWeeklyProgress, overview.weekTotal, (value) => formatSignedNumber(value, 1));
  dom.statWeeklyProgressMeta.textContent = overview.weekManualEntries ? overview.weekDeltaLabel : "No entries logged in the last seven days yet.";

  animateNumber(dom.statOverallCompletion, overview.overallCompletionPercent, (value) => `${Math.round(value)}%`);
  dom.statOverallCompletionMeta.textContent = liveTrackers.length
    ? `${overview.weightedCompletedTrackers} of ${liveTrackers.length} live trackers are at or above target.`
    : "Create your first live tracker to see weighted completion.";
}

// NEW FEATURE
function getDailyCheckInData() {
  const todayKey = getDateKey(new Date());
  const activeTrackers = getLiveTrackers().filter((tracker) => getTrackerStatus(tracker) === "active");
  const todayEntries = getAllHistoryEntries().filter((entry) => !entry.log.system && getDateKey(entry.log.timestamp) === todayKey);
  const completedToday = todayEntries.filter((entry) => entry.log.amount > 0);
  const trackersTouched = new Set(completedToday.map((entry) => entry.tracker.id)).size;
  const progressPercent = activeTrackers.length ? Math.round((trackersTouched / activeTrackers.length) * 100) : 0;

  return {
    entries: todayEntries.length,
    completedToday: completedToday.length,
    trackersTouched,
    progressPercent,
    hasActivity: todayEntries.length > 0
  };
}

// NEW FEATURE
function getGlobalStreak() {
  return calculateStreak(getAllHistoryEntries().map((entry) => entry.log));
}

// NEW FEATURE
function getWeekdayPattern(days = 28) {
  const totals = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = daysOffset(-offset);
    const weekday = formatCalendarDate(date, { weekday: "long" });
    const total = getPositiveTotalForDateKey(getDateKey(date));
    totals.set(weekday, roundNumber((totals.get(weekday) || 0) + total));
  }

  const ranked = Array.from(totals.entries()).sort((left, right) => right[1] - left[1]);
  return ranked[0] ? { label: ranked[0][0], total: ranked[0][1] } : { label: "No pattern yet", total: 0 };
}

// NEW FEATURE
function getLongestInactiveGap(days = 28) {
  const heatmap = getHeatmapData(days);
  let longestGap = 0;
  let currentGap = 0;

  heatmap.forEach((day) => {
    if (day.total > 0) {
      longestGap = Math.max(longestGap, currentGap);
      currentGap = 0;
      return;
    }

    currentGap += 1;
    longestGap = Math.max(longestGap, currentGap);
  });

  return longestGap;
}

// NEW FEATURE
function getInsightsSummary() {
  const week = getWeeklyChartData();
  const activeDays = week.days.filter((day) => day.total > 0).length;
  const consistencyPercent = Math.round((activeDays / Math.max(week.days.length, 1)) * 100);
  const missedDays = week.days.length - activeDays;
  const bestDay = getWeekdayPattern(28);
  const inactivityGap = getLongestInactiveGap(28);

  const items = [
    {
      label: "Consistency",
      value: `${consistencyPercent}%`,
      note: `${activeDays} of ${week.days.length} days had positive movement.`
    },
    {
      label: "Missed days",
      value: `${missedDays}`,
      note: missedDays ? `${missedDays} quiet day${missedDays === 1 ? "" : "s"} broke the weekly rhythm.` : "No missed days in the current seven-day window."
    },
    {
      label: "Best day",
      value: bestDay.label,
      note: bestDay.total > 0 ? `${formatSignedNumber(bestDay.total, 1)} is your strongest recurring weekday.` : "Once you log more activity, your best day will appear here."
    },
    {
      label: "Inactivity gap",
      value: `${inactivityGap} day${inactivityGap === 1 ? "" : "s"}`,
      note: inactivityGap ? `Longest quiet stretch across the last 28 days.` : "No inactivity gap across the last 28 days."
    }
  ];

  return {
    items,
    summary: `${consistencyPercent}% consistent this week with ${missedDays} missed day${missedDays === 1 ? "" : "s"} and ${bestDay.label} currently leading.`,
    signalCount: items.filter((item) => item.value && item.value !== "0").length
  };
}

// NEW FEATURE
function renderPriorityStrip() {
  const daily = getDailyCheckInData();
  const activeGoals = getLiveTrackers().filter((tracker) => getTrackerStatus(tracker) === "active");
  const globalStreak = getGlobalStreak();

  dom.todayProgressPercent.textContent = `${daily.progressPercent}%`;
  dom.todayProgressValue.textContent = `${daily.completedToday} task${daily.completedToday === 1 ? "" : "s"}`;
  dom.todayProgressNote.textContent = daily.hasActivity
    ? `${daily.trackersTouched} tracker${daily.trackersTouched === 1 ? "" : "s"} touched today across ${daily.entries} entr${daily.entries === 1 ? "y" : "ies"}.`
    : "No activity logged yet today. A quick check-in keeps momentum visible.";
  dom.todayProgressFill.style.setProperty("--today-progress", `${daily.progressPercent}%`);
  dom.todayProgressWarning.classList.toggle("is-active", !daily.hasActivity);
  dom.todayProgressWarning.textContent = daily.hasActivity ? "Activity logged today" : "Warning: no activity today";

  dom.globalStreakPill.textContent = `🔥 ${globalStreak} day${globalStreak === 1 ? "" : "s"}`;
  dom.globalStreakValue.textContent = `${globalStreak} day${globalStreak === 1 ? "" : "s"}`;
  dom.globalStreakNote.textContent = globalStreak
    ? `You're carrying a ${globalStreak}-day consistency streak across the workspace.`
    : "One positive log today will light the first streak badge.";

  dom.priorityActiveGoalsPill.textContent = `${activeGoals.length} live`;
  dom.priorityActiveGoalsValue.textContent = String(activeGoals.length);
  dom.priorityActiveGoalsNote.textContent = activeGoals.length
    ? `${activeGoals.filter((tracker) => getDeadlineInfo(tracker.deadline).daysUntil === 0).length} due today · ${activeGoals.filter((tracker) => tracker.streak >= 3).length} with momentum.`
    : "Create a tracker to open your next focus lane.";
}

// NEW FEATURE
function renderInsightsPanel() {
  const insights = getInsightsSummary();

  dom.insightsSummaryPill.textContent = `${insights.signalCount} signal${insights.signalCount === 1 ? "" : "s"}`;
  dom.insightsSummaryText.textContent = insights.summary;
  dom.insightsGrid.innerHTML = insights.items
    .map(
      (item) => `
        <article class="insight-card">
          <span class="insight-label">${escapeHtml(item.label)}</span>
          <strong class="insight-value">${escapeHtml(item.value)}</strong>
          <p class="insight-note">${escapeHtml(item.note)}</p>
        </article>
      `
    )
    .join("");
}

function renderDashboard() {
  const week = getWeeklyChartData();
  const categoryStats = getCategoryStats();
  const upcomingItems = getUpcomingItems(5);
  const recentEntries = getRecentManualEntries(6);
  const heatmapData = getHeatmapData(28);

  renderPriorityStrip();
  renderWeeklyChart(week);
  renderCategoryBreakdown(categoryStats);
  renderUpcomingList(upcomingItems);
  renderRecentActivity(recentEntries);
  renderHeatmap(heatmapData);
  renderInsightsPanel();
  syncFocusModeUi();
  renderDashboardMailFeed();
}

function renderWeeklyChart(week) {
  const max = Math.max(...week.days.map((day) => day.total), 1);
  const deltaText = week.previousWeekTotal === 0
    ? `${formatSignedNumber(week.currentWeekTotal, 1)} from a fresh baseline`
    : `${week.delta >= 0 ? "+" : ""}${Math.round(week.deltaPercent)}% vs last week`;

  dom.weeklyDeltaLabel.textContent = deltaText;
  dom.weeklySummaryText.textContent = `You logged ${formatSignedNumber(week.currentWeekTotal, 1)} across ${week.currentWeekEntries} entr${week.currentWeekEntries === 1 ? "y" : "ies"} in the last seven days.`;

  dom.weeklyChart.innerHTML = week.days
    .map((day) => {
      const percentage = Math.round((day.total / max) * 100);
      return `
        <div class="day-bar">
          <div class="day-bar-rail">
            <div class="day-bar-fill" data-progress-value="${percentage}"></div>
          </div>
          <div class="day-bar-total">${formatNumber(day.total, 1)}</div>
          <div class="day-bar-label">${escapeHtml(day.label)}</div>
        </div>
      `;
    })
    .join("");
}

function renderCategoryBreakdown(categoryStats) {
  if (!categoryStats.length) {
    dom.categoryBreakdown.innerHTML = createEmptyStackItem("No categories yet", "Create a tracker to build your breakdown.");
    return;
  }

  dom.categoryBreakdown.innerHTML = categoryStats
    .map((item) => {
      const accent = item.topAccent;
      const accentAlt = adjustHexColor(accent, -12);
      return `
        <button
          class="stack-item-button"
          type="button"
          data-filter-category="${escapeHtml(item.category)}"
          style="--tracker-accent:${accent}; --tracker-accent-alt:${accentAlt}; --tracker-accent-fade:${hexToRgba(accent, 0.28)};"
        >
          <div class="stack-item-top">
            <div>
              <strong>${escapeHtml(item.category)}</strong>
              <p class="stack-item-note">${item.count} tracker${item.count === 1 ? "" : "s"} · ${item.activeCount} active</p>
            </div>
            <span class="panel-pill">${item.avgCompletion}% avg</span>
          </div>
          <div class="mini-progress">
            <span class="mini-progress-fill" data-progress-value="${item.avgCompletion}"></span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderUpcomingList(items) {
  if (!items.length) {
    dom.upcomingList.innerHTML = createEmptyStackItem("Nothing urgent", "Your deadlines are clear. Open a tracker anytime to add the next milestone.");
    return;
  }

  dom.upcomingList.innerHTML = items
    .map(({ tracker, nextMilestone }) => {
      const deadline = getDeadlineInfo(tracker.deadline);
      const completion = clamp(Math.round(getTrackerPercent(tracker)), 0, 100);
      return `
        <button class="stack-item-button" type="button" data-open-tracker="${tracker.id}">
          <div class="stack-item-top">
            <div>
              <strong>${escapeHtml(tracker.title)}</strong>
              <p class="stack-item-note">${escapeHtml(tracker.category)} · ${escapeHtml(tracker.itemName || tracker.goalType)}</p>
            </div>
            <span class="panel-pill">${escapeHtml(deadline.label)}</span>
          </div>
          <p class="list-note">Next milestone: ${nextMilestone ? `${nextMilestone}%` : "Target cleared"} · ${formatValueWithUnit(tracker.currentValue, tracker.unitLabel)} of ${formatValueWithUnit(tracker.targetValue, tracker.unitLabel)}</p>
          <div class="mini-progress">
            <span class="mini-progress-fill" data-progress-value="${completion}"></span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderRecentActivity(entries) {
  if (!entries.length) {
    dom.recentActivityList.innerHTML = createEmptyStackItem("No recent activity", "Open any tracker and use Quick Log to start building a live activity feed.");
    return;
  }

  dom.recentActivityList.innerHTML = entries
    .map(({ tracker, log }) => {
      return `
        <button class="stack-item-button" type="button" data-open-tracker="${tracker.id}">
          <div class="stack-item-top">
            <div>
              <strong>${escapeHtml(tracker.title)}</strong>
              <p class="stack-item-note">${escapeHtml(tracker.category)} · ${formatRelativeTime(log.timestamp)}</p>
            </div>
            <span class="amount-pill ${log.system ? "is-system" : log.amount >= 0 ? "is-positive" : "is-negative"}">
              ${escapeHtml(formatSignedValueWithUnit(log.amount, tracker.unitLabel))}
            </span>
          </div>
          <p class="list-note">${escapeHtml(log.note || log.tag || "Manual progress logged.")}</p>
        </button>
      `;
    })
    .join("");
}

function renderHeatmap(data) {
  const max = Math.max(...data.map((day) => day.total), 1);
  dom.heatmapLegendLabel.textContent = `${data.filter((day) => day.total > 0).length} active days in the last 28`;

  dom.heatmapGrid.innerHTML = data
    .map((day) => {
      const intensity = getHeatIntensity(day.total, max);
      const title = `${formatCalendarDate(day.date, { month: "short", day: "numeric" })}: ${formatNumber(day.total, 1)} positive progress`;
      return `<div class="heatmap-cell heat-${intensity}" title="${escapeHtml(title)}"></div>`;
    })
    .join("");
}

function renderGraphs() {
  const trackers = [...state.trackers].sort((left, right) => sortTrackers(left, right, "recentlyUpdated"));
  const liveTrackers = getLiveTrackers();
  const categoryStats = getCategoryStats();
  const week = getWeeklyChartData();
  const heatmapData = getHeatmapData(35);
  const activeDays = heatmapData.filter((day) => day.total > 0).length;
  const avgCompletion = trackers.length
    ? Math.round(trackers.reduce((sum, tracker) => sum + getTrackerPercent(tracker), 0) / trackers.length)
    : 0;

  dom.graphsSummaryText.textContent = trackers.length
    ? `${trackers.length} tracker${trackers.length === 1 ? "" : "s"}, ${categoryStats.length} categor${categoryStats.length === 1 ? "y" : "ies"}, ${activeDays} active days, and ${week.currentWeekEntries} entr${week.currentWeekEntries === 1 ? "y" : "ies"} powering your visual progress story.`
    : "Create your first tracker to unlock a full visual graph view of progress, consistency, and completion.";

  dom.graphMetrics.innerHTML = createGraphMetricCards({
    liveCount: liveTrackers.length,
    avgCompletion,
    weekTotal: week.currentWeekTotal,
    activeDays
  });

  renderGraphWeeklyVisual(week);
  renderGraphTrackerCompare(trackers);
  renderGraphCategoryCompare(categoryStats);
  renderGraphHeatmap(heatmapData);
  renderGraphTrackerBoards(trackers);
}

function createGraphMetricCards({ liveCount, avgCompletion, weekTotal, activeDays }) {
  const cards = [
    {
      label: "Live trackers",
      value: `${liveCount}`,
      note: liveCount ? "Active goals currently moving." : "No live trackers yet."
    },
    {
      label: "Average completion",
      value: `${avgCompletion}%`,
      note: "Weighted visually across your tracker set."
    },
    {
      label: "Weekly progress",
      value: formatSignedNumber(weekTotal, 1),
      note: "Positive movement logged in the last 7 days."
    },
    {
      label: "Active days",
      value: `${activeDays}`,
      note: "Days with any positive movement in the last 35 days."
    }
  ];

  return cards
    .map(
      (card) => `
        <article class="stat-card panel graph-metric-card">
          <div class="stat-topline">
            <span>${escapeHtml(card.label)}</span>
            <small>Graph</small>
          </div>
          <strong class="stat-value">${escapeHtml(card.value)}</strong>
          <p class="stat-meta">${escapeHtml(card.note)}</p>
        </article>
      `
    )
    .join("");
}

function renderGraphWeeklyVisual(week) {
  const max = Math.max(...week.days.map((day) => Math.abs(day.total)), 1);
  const deltaText = week.previousWeekTotal === 0
    ? `${formatSignedNumber(week.currentWeekTotal, 1)} from a fresh baseline`
    : `${week.delta >= 0 ? "+" : ""}${Math.round(week.deltaPercent)}% vs last week`;

  dom.graphWeeklyDeltaLabel.textContent = deltaText;
  dom.graphWeeklyNote.textContent = week.currentWeekEntries
    ? `${formatSignedNumber(week.currentWeekTotal, 1)} across ${week.currentWeekEntries} entr${week.currentWeekEntries === 1 ? "y" : "ies"} in the last seven days.`
    : "No weekly progress yet. Open any tracker and add a quick entry to bring this graph to life.";

  dom.graphWeeklyVisual.innerHTML = week.days
    .map((day) => {
      const rawValue = roundNumber(day.total);
      const height = Math.max(12, Math.round((Math.abs(rawValue) / max) * 100));
      const barClass = rawValue > 0 ? "is-positive" : rawValue < 0 ? "is-negative" : "is-neutral";
      return `
        <div class="graph-week-day">
          <div class="graph-week-slot">
            <span class="graph-week-midline"></span>
            <span class="graph-week-bar ${barClass}" style="height:${height}%;"></span>
          </div>
          <strong class="graph-week-total">${escapeHtml(formatNumber(rawValue, 1))}</strong>
          <span class="graph-week-label">${escapeHtml(day.label)}</span>
        </div>
      `;
    })
    .join("");
}

function renderGraphTrackerCompare(trackers) {
  if (!trackers.length) {
    dom.graphTrackerCompare.innerHTML = createEmptyStackItem("No tracker graphs yet", "Create a tracker to compare completion visually.");
    return;
  }

  dom.graphTrackerCompare.innerHTML = trackers
    .map((tracker) => {
      const percent = clamp(Math.round(getTrackerPercent(tracker)), 0, 100);
      return `
        <button
          class="graph-compare-item"
          type="button"
          data-open-tracker="${tracker.id}"
          style="--graph-accent:${tracker.accentColor}; --graph-accent-fade:${hexToRgba(tracker.accentColor, 0.22)};"
        >
          <div class="graph-compare-head">
            <strong>${escapeHtml(tracker.title)}</strong>
            <span class="panel-pill">${percent}%</span>
          </div>
          <p class="subtle">${escapeHtml(formatValueWithUnit(tracker.currentValue, tracker.unitLabel))} of ${escapeHtml(formatValueWithUnit(tracker.targetValue, tracker.unitLabel))}</p>
          <div class="graph-compare-bar">
            <span class="graph-compare-fill" data-progress-value="${percent}"></span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderGraphCategoryCompare(categoryStats) {
  if (!categoryStats.length) {
    dom.graphCategoryCompare.innerHTML = createEmptyStackItem("No category graph yet", "Trackers will build category visuals automatically.");
    return;
  }

  dom.graphCategoryCompare.innerHTML = categoryStats
    .map((item) => `
      <button
        class="graph-category-item"
        type="button"
        data-filter-category="${escapeHtml(item.category)}"
        style="--graph-accent:${item.topAccent}; --graph-accent-fade:${hexToRgba(item.topAccent, 0.22)};"
      >
        <div class="graph-compare-head">
          <strong>${escapeHtml(item.category)}</strong>
          <span class="panel-pill">${item.avgCompletion}% avg</span>
        </div>
        <p class="subtle">${item.count} tracker${item.count === 1 ? "" : "s"} · ${item.activeCount} active</p>
        <div class="graph-compare-bar">
          <span class="graph-compare-fill" data-progress-value="${item.avgCompletion}"></span>
        </div>
      </button>
    `)
    .join("");
}

function renderGraphHeatmap(data) {
  const max = Math.max(...data.map((day) => day.total), 1);
  dom.graphHeatmapLegend.textContent = `${data.filter((day) => day.total > 0).length} active days`;
  dom.graphHeatmapGrid.innerHTML = data
    .map((day) => {
      const intensity = getHeatIntensity(day.total, max);
      const title = `${formatCalendarDate(day.date, { month: "short", day: "numeric" })}: ${formatNumber(day.total, 1)} positive progress`;
      return `<div class="heatmap-cell heat-${intensity}" title="${escapeHtml(title)}"></div>`;
    })
    .join("");
}

function renderGraphTrackerBoards(trackers) {
  dom.graphGalleryCount.textContent = `${trackers.length} tracker${trackers.length === 1 ? "" : "s"}`;

  if (!trackers.length) {
    dom.graphTrackerBoards.innerHTML = createEmptyStackItem("No tracker boards yet", "Create a tracker to generate a full progress board.");
    return;
  }

  dom.graphTrackerBoards.innerHTML = trackers
    .map((tracker) => {
      const percent = clamp(Math.round(getTrackerPercent(tracker)), 0, 100);
      return `
        <article class="graph-tracker-card panel" style="--tracker-accent:${tracker.accentColor}; --tracker-accent-alt:${adjustHexColor(tracker.accentColor, -12)}; --tracker-accent-fade:${hexToRgba(tracker.accentColor, 0.2)};">
          <div class="graph-tracker-card-head">
            <div>
              <p class="eyebrow">${escapeHtml(tracker.category)}</p>
              <h4>${escapeHtml(tracker.title)}</h4>
              <p class="subtle">${escapeHtml(formatValueWithUnit(tracker.currentValue, tracker.unitLabel))} / ${escapeHtml(formatValueWithUnit(tracker.targetValue, tracker.unitLabel))}</p>
            </div>
            <span class="panel-pill">${percent}%</span>
          </div>
          ${createTrackerTrendMarkup(tracker, "card")}
          <div class="graph-tracker-actions">
            <button class="ghost-button" type="button" data-open-tracker="${tracker.id}">Open tracker</button>
          </div>
        </article>
      `;
    })
    .join("");

  registerRevealElements(dom.graphTrackerBoards);
}

function renderTrackers() {
  const filteredTrackers = getFilteredTrackers();
  const allTrackers = state.trackers.length;

  dom.trackersSummaryText.textContent = filteredTrackers.length === allTrackers
    ? `${allTrackers} tracker${allTrackers === 1 ? "" : "s"} in your workspace.`
    : `Showing ${filteredTrackers.length} of ${allTrackers} tracker${allTrackers === 1 ? "" : "s"}.`;

  if (!filteredTrackers.length) {
    dom.trackerGrid.innerHTML = "";
    dom.trackerEmptyState.classList.remove("hidden");
    dom.trackerEmptyText.textContent = allTrackers
      ? "Change the filters or search terms to reveal matching trackers."
      : "Create your first tracker to start logging progress.";
    return;
  }

  dom.trackerEmptyState.classList.add("hidden");
  dom.trackerGrid.innerHTML = filteredTrackers.map(createTrackerCard).join("");
  registerRevealElements(dom.trackerGrid);
}

function createTrackerCard(tracker, index) {
  const percent = getTrackerPercent(tracker);
  const clamped = clamp(Math.round(percent), 0, 100);
  const status = getTrackerStatus(tracker);
  const accent = tracker.accentColor;
  const accentAlt = adjustHexColor(accent, -12);
  const badge = escapeHtml(getBadgeContent(tracker));
  const todayNet = getTrackerNetForDay(tracker, getDateKey(new Date()));
  const deadlineInfo = getDeadlineInfo(tracker.deadline);
  const remainingText = getRemainingText(tracker);
  const streakLabel = tracker.streak
    ? `🔥 ${tracker.streak} day${tracker.streak === 1 ? "" : "s"}`
    : "🔥 Ready to start";

  return `
    <article
      class="tracker-card ${status === "completed" ? "is-complete" : ""} ${status === "archived" ? "is-archived" : ""}"
      style="--tracker-accent:${accent}; --tracker-accent-alt:${accentAlt}; --tracker-accent-fade:${hexToRgba(accent, 0.24)}; animation-delay:${index * 45}ms;"
    >
      <div class="tracker-card-head">
        <div class="tracker-title-group">
          <div class="badge" style="background: linear-gradient(135deg, ${accent}, ${accentAlt});">${badge}</div>
          <div>
            <h4>${escapeHtml(tracker.title)}</h4>
            <p class="tracker-subtitle">${escapeHtml(tracker.category)} · ${escapeHtml(tracker.itemName || tracker.goalType)}</p>
            <p class="tracker-owner">Created by ${escapeHtml(tracker.createdBy || "You")}</p>
          </div>
        </div>
        <span class="status-pill ${status}">${escapeHtml(statusLabel(status))}</span>
      </div>

      <div class="tracker-overview">
        <div class="progress-ring progress-ring-card" style="--accent:${accent}; --accent-strong:${accentAlt};" data-progress-value="${clamped}">
          <span>${Math.round(percent)}%</span>
        </div>
        <div>
          <p class="tracker-figure">${escapeHtml(formatValueWithUnit(tracker.currentValue, tracker.unitLabel))} / ${escapeHtml(formatValueWithUnit(tracker.targetValue, tracker.unitLabel))}</p>
          <p class="subtle">${escapeHtml(remainingText)}</p>
          <div class="tracker-card-meta-row">
            <span class="streak-badge ${tracker.streak ? "is-active" : ""}">${escapeHtml(streakLabel)}</span>
            <span class="soft-pill">Updated ${escapeHtml(formatRelativeTime(tracker.updatedAt))}</span>
          </div>
          <div class="metric-chips">
            <span class="metric-chip">${escapeHtml(tracker.goalType)}</span>
            <span class="metric-chip">Today ${escapeHtml(formatSignedValueWithUnit(todayNet, tracker.unitLabel))}</span>
            <span class="metric-chip">${Math.round(percent)}% complete</span>
            <span class="metric-chip">${escapeHtml(tracker.priority)}</span>
          </div>
        </div>
      </div>

      <div class="detail-milestone-text">${escapeHtml(deadlineInfo.label)} · Last updated ${escapeHtml(formatRelativeTime(tracker.updatedAt))}</div>

      <div class="progress-strip">
        <div class="progress-strip-fill" data-progress-value="${clamped}"></div>
        <div class="milestone-track">
          <span style="left: 25%"></span>
          <span style="left: 50%"></span>
          <span style="left: 75%"></span>
        </div>
      </div>

      ${createTrackerTrendMarkup(tracker, "card")}

      <div class="tracker-card-footer">
        <button class="ghost-button" type="button" data-action="open-tracker" data-tracker-id="${tracker.id}">Open Detail</button>
        <button class="ghost-button" type="button" data-action="quick-log" data-tracker-id="${tracker.id}">Quick Log</button>
        <button class="ghost-button" type="button" data-action="edit-tracker" data-tracker-id="${tracker.id}">Edit Setup</button>
      </div>
    </article>
  `;
}

function renderHistory() {
  const entries = getFilteredHistoryEntries();
  const trackersMentioned = new Set(entries.map((entry) => entry.tracker.id)).size;
  const netAmount = roundNumber(entries.reduce((sum, entry) => sum + entry.log.amount, 0));
  const correctionCount = entries.filter((entry) => entry.log.amount < 0).length;

  dom.historySummaryText.textContent = entries.length
    ? `${entries.length} matching entr${entries.length === 1 ? "y" : "ies"} across ${trackersMentioned} tracker${trackersMentioned === 1 ? "" : "s"}.`
    : "Review every entry, correction, and milestone across your workspace.";

  dom.historySnapshotTitle.textContent = `${entries.length} log entr${entries.length === 1 ? "y" : "ies"}`;
  dom.historySnapshotText.textContent = entries.length
    ? `Net ${formatSignedNumber(netAmount, 1)} across ${trackersMentioned} tracker${trackersMentioned === 1 ? "" : "s"}. Corrections: ${correctionCount}.`
    : "Create or update trackers to build your timeline.";

  if (!entries.length) {
    dom.historyTimeline.innerHTML = "";
    dom.historyEmptyState.classList.remove("hidden");
    return;
  }

  dom.historyEmptyState.classList.add("hidden");
  dom.historyTimeline.innerHTML = createHistoryGroups(entries);
  registerRevealElements(dom.historyTimeline);
}

function createHistoryGroups(entries) {
  const groups = new Map();

  entries.forEach((entry) => {
    const key = getDateKey(entry.log.timestamp);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(entry);
  });

  return Array.from(groups.entries())
    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
    .map(([dateKey, groupEntries]) => `
      <section class="history-group">
        <h4 class="history-group-title">${escapeHtml(groupLabel(dateKey))}</h4>
        ${groupEntries.map(createHistoryItem).join("")}
      </section>
    `)
    .join("");
}

function createHistoryItem(entry) {
  const { tracker, log } = entry;
  const amountClass = log.system ? "is-system" : log.amount >= 0 ? "is-positive" : "is-negative";
  const editAction = log.readOnly
    ? ""
    : `<button class="ghost-button" type="button" data-action="edit-history-log" data-tracker-id="${tracker.id}" data-log-id="${log.id}">Edit entry</button>`;

  return `
    <article class="history-item" style="--history-accent:${tracker.accentColor}; --history-accent-fade:${hexToRgba(tracker.accentColor, 0.18)};">
      <div class="history-item-top">
        <div>
          <div class="list-inline-meta">
            <span class="amount-pill ${amountClass}">${escapeHtml(formatSignedValueWithUnit(log.amount, tracker.unitLabel))}</span>
            ${log.tag ? `<span class="timeline-tag">${escapeHtml(log.tag)}</span>` : ""}
            ${log.system ? `<span class="timeline-tag">System sync</span>` : ""}
          </div>
          <h4 class="history-item-title">${escapeHtml(tracker.title)}</h4>
          <p class="activity-row-subtitle">${escapeHtml(tracker.category)} · ${escapeHtml(tracker.itemName || tracker.goalType)}</p>
        </div>
        <span class="soft-pill">${escapeHtml(formatClock(log.timestamp))}</span>
      </div>
      <p class="history-note">${escapeHtml(log.note || "Manual progress entry.")}</p>
      ${log.proofImage ? createLogProofMarkup(tracker, log, "history-proof") : ""}
      <div class="history-actions">
        <button class="ghost-button" type="button" data-open-tracker="${tracker.id}">Open tracker</button>
        ${log.proofImage ? `<button class="ghost-button" type="button" data-action="open-proof" data-tracker-id="${tracker.id}" data-log-id="${log.id}">View proof</button>` : ""}
        ${editAction}
      </div>
    </article>
  `;
}
function renderDetailDrawer() {
  const tracker = ui.selectedTrackerId ? findTracker(ui.selectedTrackerId) : null;

  if (!tracker) {
    dom.detailDrawer.classList.remove("is-open");
    dom.detailDrawer.setAttribute("aria-hidden", "true");
    dom.drawerScrim.classList.remove("is-open");
    dom.drawerScrim.hidden = true;
    return;
  }

  const accent = tracker.accentColor;
  const accentAlt = adjustHexColor(accent, -12);
  dom.detailBadge.textContent = getBadgeContent(tracker);
  dom.detailBadge.style.background = `linear-gradient(135deg, ${accent}, ${accentAlt})`;
  dom.detailCategoryLabel.textContent = `${tracker.category} · ${statusLabel(getTrackerStatus(tracker))}`;
  dom.detailTitle.textContent = tracker.title;
  dom.detailSubtitle.textContent = tracker.itemName || tracker.goalType;
  dom.detailHeroCard.innerHTML = createDetailHero(tracker);
  dom.detailProgressVisuals.innerHTML = createDetailProgressVisuals(tracker);
  dom.detailMetaGrid.innerHTML = createDetailMetaCards(tracker);
  dom.detailHistoryCount.textContent = `${tracker.logs.length} entr${tracker.logs.length === 1 ? "y" : "ies"}`;
  dom.detailLogList.innerHTML = tracker.logs.length
    ? [...tracker.logs]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .map((log) => createDetailLogEntry(tracker, log))
        .join("")
    : createEmptyStackItem("No history yet", "Add a progress entry to start tracking movement here.");

  dom.detailNotes.innerHTML = tracker.notes
    ? `<div class="note-card"><h5>Notes</h5><p class="subtle">${escapeHtml(tracker.notes)}</p></div>`
    : "";

  dom.detailCustomFields.innerHTML = tracker.customFields.length
    ? `
      <div class="note-card">
        <h5>Custom fields</h5>
        <div class="custom-field-list">
          ${tracker.customFields
            .map(
              (field) => `
                <div class="custom-field-pill">
                  <strong>${escapeHtml(field.label)}</strong>
                  <span class="subtle">${escapeHtml(field.value)}</span>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `
    : "";

  dom.archiveSelectedTrackerBtn.textContent = tracker.archived ? "Restore" : "Archive";

  dom.detailDrawer.classList.add("is-open");
  dom.detailDrawer.setAttribute("aria-hidden", "false");
  dom.drawerScrim.hidden = false;
  requestAnimationFrame(() => {
    dom.drawerScrim.classList.add("is-open");
    animateProgressVisuals(dom.detailDrawer);
    registerRevealElements(dom.detailDrawer);
  });
}

function createDetailHero(tracker) {
  const percent = getTrackerPercent(tracker);
  const clamped = clamp(Math.round(percent), 0, 100);
  const accent = tracker.accentColor;
  const accentAlt = adjustHexColor(accent, -12);
  const deadline = getDeadlineInfo(tracker.deadline);
  const nextMilestone = getNextMilestone(tracker);
  const todayNet = getTrackerNetForDay(tracker, getDateKey(new Date()));
  return `
    <div class="detail-hero-main">
      <div class="progress-ring progress-ring-hero" style="--accent:${accent}; --accent-strong:${accentAlt};" data-progress-value="${clamped}">
        <span>${Math.round(percent)}%</span>
      </div>
      <div>
        <div class="chip-row">
          <span class="status-pill ${getTrackerStatus(tracker)}">${escapeHtml(statusLabel(getTrackerStatus(tracker)))}</span>
          <span class="soft-pill">By ${escapeHtml(tracker.createdBy || "You")}</span>
          <span class="soft-pill">${escapeHtml(tracker.streak ? `🔥 ${tracker.streak} day streak` : "🔥 build streak")}</span>
          <span class="soft-pill">${escapeHtml(tracker.priority)}</span>
          <span class="soft-pill">${escapeHtml(tracker.goalType)}</span>
          <span class="soft-pill">${escapeHtml(tracker.unitLabel)}</span>
        </div>
        <p class="tracker-figure">${escapeHtml(formatValueWithUnit(tracker.currentValue, tracker.unitLabel))} / ${escapeHtml(formatValueWithUnit(tracker.targetValue, tracker.unitLabel))}</p>
        <p class="subtle">${escapeHtml(getRemainingText(tracker))}</p>
      </div>
    </div>
    <div class="detail-progress-row">
      <div class="progress-strip">
        <div class="progress-strip-fill" data-progress-value="${clamped}"></div>
        <div class="milestone-track">
          <span style="left: 25%"></span>
          <span style="left: 50%"></span>
          <span style="left: 75%"></span>
        </div>
      </div>
      <div class="detail-milestone-text">${escapeHtml(deadline.label)} · ${nextMilestone ? `Next milestone ${nextMilestone}%` : "Target cleared"}</div>
    </div>
    <div class="detail-progress-stats detail-progress-stats-compact">
      <div class="detail-stat-card">
        <span class="detail-stat-label">Today</span>
        <strong class="detail-stat-value">${escapeHtml(formatSignedValueWithUnit(todayNet, tracker.unitLabel))}</strong>
      </div>
      <div class="detail-stat-card">
        <span class="detail-stat-label">This week</span>
        <strong class="detail-stat-value">${escapeHtml(formatSignedValueWithUnit(getTrackerPositiveTotal(tracker, 7), tracker.unitLabel))}</strong>
      </div>
      <div class="detail-stat-card">
        <span class="detail-stat-label">Streak</span>
        <strong class="detail-stat-value">${tracker.streak} day${tracker.streak === 1 ? "" : "s"}</strong>
      </div>
      <div class="detail-stat-card">
        <span class="detail-stat-label">Updated</span>
        <strong class="detail-stat-value">${escapeHtml(formatRelativeTime(tracker.updatedAt))}</strong>
      </div>
    </div>
  `;
}

function createDetailProgressVisuals(tracker) {
  return createTrackerTrendMarkup(tracker, "detail");
}

function createDetailMetaCards(tracker) {
  const fields = [
    { label: "Created by", value: tracker.createdBy || "You" },
    { label: "Starting value", value: formatValueWithUnit(tracker.startValue, tracker.unitLabel) },
    { label: "Current value", value: formatValueWithUnit(tracker.currentValue, tracker.unitLabel) },
    { label: "Target value", value: formatValueWithUnit(tracker.targetValue, tracker.unitLabel) },
    { label: "Remaining", value: getRemainingNumericText(tracker) },
    { label: "Deadline", value: getDeadlineInfo(tracker.deadline).label },
    { label: "Created", value: formatCalendarDate(tracker.createdAt, { month: "short", day: "numeric", year: "numeric" }) },
    { label: "Last updated", value: formatCalendarDate(tracker.updatedAt, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) },
    { label: "Entries", value: `${tracker.logs.length}` }
  ];

  return fields
    .map(
      (field) => `
        <div class="detail-meta-card">
          <span class="detail-stat-label">${escapeHtml(field.label)}</span>
          <strong class="detail-stat-value">${escapeHtml(field.value)}</strong>
        </div>
      `
    )
    .join("");
}

function createDetailLogEntry(tracker, log) {
  const amountClass = log.system ? "is-system" : log.amount >= 0 ? "is-positive" : "is-negative";
  const actions = log.readOnly
    ? ""
    : `
        <div class="log-entry-actions">
          <button class="ghost-button" type="button" data-action="edit-log" data-tracker-id="${tracker.id}" data-log-id="${log.id}">Edit</button>
          <button class="danger-button" type="button" data-action="delete-log" data-tracker-id="${tracker.id}" data-log-id="${log.id}">Delete</button>
        </div>
      `;

  return `
    <article class="log-entry">
      <div class="log-entry-top">
        <div class="log-entry-title-row">
          <div class="list-inline-meta">
            <span class="amount-pill ${amountClass}">${escapeHtml(formatSignedValueWithUnit(log.amount, tracker.unitLabel))}</span>
            ${log.tag ? `<span class="timeline-tag">${escapeHtml(log.tag)}</span>` : ""}
            ${log.system ? `<span class="timeline-tag">System sync</span>` : ""}
          </div>
          <strong class="log-entry-title">${escapeHtml(formatCalendarDate(log.timestamp, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}</strong>
        </div>
        ${actions}
      </div>
      <p class="log-entry-note">${escapeHtml(log.note || "Manual progress entry.")}</p>
      ${log.proofImage ? createLogProofMarkup(tracker, log, "log-proof-card") : ""}
    </article>
  `;
}

function createLogProofMarkup(tracker, log, variantClass) {
  return `
    <div class="${variantClass}">
      <button
        class="proof-media-button"
        type="button"
        data-action="open-proof"
        data-tracker-id="${tracker.id}"
        data-log-id="${log.id}"
        aria-label="Open proof image for ${escapeHtml(tracker.title)}"
      >
        <img src="${escapeHtml(log.proofImage)}" alt="${escapeHtml(log.proofName || `Proof image for ${tracker.title}`)}" loading="lazy" />
      </button>
      <div class="proof-caption">
        <strong>${escapeHtml(log.proofName || "Proof image")}</strong>
        <p class="subtle">${escapeHtml(buildProofCaption(tracker, log))}</p>
      </div>
      <button
        class="ghost-button"
        type="button"
        data-action="open-proof"
        data-tracker-id="${tracker.id}"
        data-log-id="${log.id}"
      >
        View Proof
      </button>
    </div>
  `;
}

function handleDashboardListClicks(event) {
  const openButton = event.target.closest("[data-open-tracker]");
  if (openButton) {
    openDetailDrawer(openButton.dataset.openTracker);
    return;
  }

  const categoryButton = event.target.closest("[data-filter-category]");
  if (categoryButton) {
    ui.filters.category = categoryButton.dataset.filterCategory;
    setView("trackers");
    renderTrackers();
  }
}

function handleTrackerGridClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const trackerId = button.dataset.trackerId;
  if (!trackerId) return;

  if (button.dataset.action === "open-tracker") {
    openDetailDrawer(trackerId);
  }

  if (button.dataset.action === "quick-log") {
    openDetailDrawer(trackerId, true);
  }

  if (button.dataset.action === "edit-tracker") {
    openTrackerModal("edit", trackerId);
  }
}

function handleHistoryClick(event) {
  const openButton = event.target.closest("[data-open-tracker]");
  if (openButton) {
    openDetailDrawer(openButton.dataset.openTracker);
    return;
  }

  const proofButton = event.target.closest('[data-action="open-proof"]');
  if (proofButton) {
    openProofModal(proofButton.dataset.trackerId, proofButton.dataset.logId);
    return;
  }

  const editButton = event.target.closest('[data-action="edit-history-log"]');
  if (editButton) {
    startEditingLog(editButton.dataset.trackerId, editButton.dataset.logId);
  }
}

function handleDetailLogClick(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const trackerId = actionButton.dataset.trackerId;
  const logId = actionButton.dataset.logId;
  if (!trackerId || !logId) return;

  if (actionButton.dataset.action === "open-proof") {
    openProofModal(trackerId, logId);
    return;
  }

  if (actionButton.dataset.action === "edit-log") {
    startEditingLog(trackerId, logId);
  }

  if (actionButton.dataset.action === "delete-log") {
    const tracker = findTracker(trackerId);
    const log = tracker?.logs.find((entry) => entry.id === logId);
    if (!tracker || !log) return;

    openConfirm({
      title: "Delete log entry",
      message: `Delete the ${formatSignedValueWithUnit(log.amount, tracker.unitLabel)} entry from "${tracker.title}"?`,
      action: () => {
        deleteLogEntry(trackerId, logId);
      }
    });
  }
}

// REFACTOR
function commitLocalTracker(tracker) {
  const normalized = normalizeTracker(tracker);
  const existingIndex = state.trackers.findIndex((item) => item.id === normalized.id);

  if (existingIndex >= 0) {
    state.trackers.splice(existingIndex, 1, normalized);
  } else {
    state.trackers.unshift(normalized);
  }

  state.trackers = [...state.trackers].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  saveState();
  return normalized;
}

// REFACTOR
function activateLocalFallback(reason = "Backend unavailable. Switched to local-only mode.") {
  setSyncMode(LOCAL_SYNC_MODE, reason);
  saveState();
  announceLocalFallback(reason);
}

// REFACTOR
function removeLocalTrackerRecord(trackerId) {
  const existingLength = state.trackers.length;
  state.trackers = state.trackers.filter((tracker) => tracker.id !== trackerId);
  if (state.trackers.length === existingLength) {
    return false;
  }

  saveState();
  return true;
}

// REFACTOR
function createLocalTrackerRecord(basePayload, currentValue) {
  const now = new Date().toISOString();
  const adjustment = roundNumber(currentValue - basePayload.startValue);
  const logs = adjustment !== 0
    ? [
        normalizeLog({
          id: createId("log"),
          amount: adjustment,
          timestamp: now,
          note: "Manual setup adjustment",
          tag: "Setup",
          createdAt: now,
          updatedAt: now
        })
      ]
    : [];

  return commitLocalTracker({
    id: createId("trk"),
    ...basePayload,
    archived: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    logs
  });
}

// REFACTOR
function addLocalLogEntry(trackerId, logInput) {
  const tracker = findTracker(trackerId);
  if (!tracker) return null;

  const timestamp = normalizeIso(logInput.timestamp || new Date().toISOString());
  const nextTracker = recalculateTracker({
    ...tracker,
    logs: [
      normalizeLog({
        id: createId("log"),
        amount: roundNumber(toNumber(logInput.amount, 0)),
        timestamp,
        note: logInput.note || "",
        tag: logInput.tag || "",
        proofImage: logInput.proofImage || "",
        proofName: logInput.proofName || "",
        system: Boolean(logInput.system),
        createdAt: timestamp,
        updatedAt: timestamp
      }),
      ...tracker.logs
    ],
    updatedAt: timestamp
  });

  return commitLocalTracker(nextTracker);
}

// REFACTOR
function updateLocalLogEntry(trackerId, logId, logInput) {
  const tracker = findTracker(trackerId);
  if (!tracker) return null;

  const nextTracker = recalculateTracker({
    ...tracker,
    logs: tracker.logs.map((log) => {
      if (log.id !== logId) return log;

      const timestamp = normalizeIso(logInput.timestamp || log.timestamp);
      return normalizeLog({
        ...log,
        amount: roundNumber(toNumber(logInput.amount, log.amount)),
        timestamp,
        note: logInput.note || "",
        tag: logInput.tag || "",
        proofImage: logInput.proofImage || "",
        proofName: logInput.proofName || "",
        updatedAt: new Date().toISOString()
      });
    }),
    updatedAt: new Date().toISOString()
  });

  return commitLocalTracker(nextTracker);
}

// REFACTOR
function resetLocalTrackerRecord(trackerId) {
  const tracker = findTracker(trackerId);
  if (!tracker) return null;

  return commitLocalTracker({
    ...tracker,
    currentValue: tracker.startValue,
    completedAt: null,
    logs: [],
    updatedAt: new Date().toISOString()
  });
}

// REFACTOR
function removeLocalLogEntry(trackerId, logId) {
  const tracker = findTracker(trackerId);
  if (!tracker) return null;

  const nextTracker = recalculateTracker({
    ...tracker,
    logs: tracker.logs.filter((log) => log.id !== logId),
    updatedAt: new Date().toISOString()
  });

  return commitLocalTracker(nextTracker);
}

// NEW FEATURE
function buildFocusSessionLog(tracker, durationMs) {
  const hours = roundNumber(Math.max(durationMs / 3600000, 0.1));
  const amount = tracker.unitType === "hours" || /hour|hr/i.test(tracker.unitLabel)
    ? hours
    : 1;

  return {
    amount,
    timestamp: new Date().toISOString(),
    note: `Focus mode session • ${formatFocusDuration(durationMs)}`,
    tag: tracker.unitType === "hours" || /hour|hr/i.test(tracker.unitLabel) ? "Focus hours" : "Focus session",
    proofImage: "",
    proofName: "",
    system: false
  };
}

// NEW FEATURE
function startFocusSession() {
  const trackerId = dom.focusTrackerSelect.value;
  const tracker = findTracker(trackerId);
  if (!tracker) {
    showToast("Select a tracker before starting focus mode.", "error");
    return;
  }

  if (getFocusSession().startedAt) {
    return;
  }

  state.settings.focusSession = createFocusSessionState({
    trackerId,
    startedAt: new Date().toISOString(),
    elapsedMs: 0
  });
  saveState();
  syncFocusModeUi();
  syncFocusTimerLoop();
  showToast(`Focus mode started for "${tracker.title}".`, "success");
}

// NEW FEATURE
async function stopFocusSession(shouldLog = true) {
  const session = getFocusSession();
  if (!session.startedAt) {
    syncFocusModeUi();
    return;
  }

  const tracker = findTracker(session.trackerId || dom.focusTrackerSelect.value);
  const durationMs = getFocusElapsedMs(session);

  state.settings.focusSession = createFocusSessionState({
    trackerId: session.trackerId || dom.focusTrackerSelect.value,
    startedAt: null,
    elapsedMs: 0
  });
  saveState();
  syncFocusModeUi();
  syncFocusTimerLoop();

  if (!shouldLog || !tracker) {
    return;
  }

  if (durationMs < 60000) {
    showToast("Focus session stopped before 1 minute, so nothing was logged.", "success");
    return;
  }

  const focusLog = buildFocusSessionLog(tracker, durationMs);

  try {
    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      const createdEntry = await createBackendProgressEntry(tracker.id, focusLog);
      await syncWorkspaceFromBackend();
      const syncedTracker = findTracker(tracker.id) || tracker;
      const latestLog = syncedTracker.logs.find((log) => log.id === createdEntry?.id) || syncedTracker.logs[0] || null;
      queueWorkspaceEmail({
        type: "progress",
        tracker: syncedTracker,
        log: latestLog,
        subject: `Focus session logged: ${syncedTracker.title}`,
        preview: `${formatFocusDuration(durationMs)} saved back into ${syncedTracker.title}.`,
        body: `Tracker: ${syncedTracker.title}\nDuration: ${formatFocusDuration(durationMs)}\nLogged amount: ${formatSignedValueWithUnit(focusLog.amount, syncedTracker.unitLabel)}\nMode: Focus session`
      });
      renderApp();
      openDetailDrawer(syncedTracker.id);
      showToast("Focus session logged.", "success");
      return;
    }

    const syncedTracker = addLocalLogEntry(tracker.id, focusLog);
    renderApp();
    if (syncedTracker) {
      openDetailDrawer(syncedTracker.id);
    }
    showToast("Focus session saved locally.", "success");
  } catch (error) {
    if (error.backendUnavailable) {
      activateLocalFallback("Backend unavailable. Focus session saved locally.");
      const syncedTracker = addLocalLogEntry(tracker.id, focusLog);
      renderApp();
      if (syncedTracker) {
        openDetailDrawer(syncedTracker.id);
      }
      showToast("Focus session saved locally.", "success");
      return;
    }

    showToast(error.message || "The focus session could not be saved.", "error");
  }
}

async function handleTrackerSubmit(event) {
  event.preventDefault();

  const title = sanitizeText(dom.trackerTitleInput.value, 80);
  const createdBy = sanitizeText(dom.trackerCreatorInput.value, 40) || getAccountName();
  const category = sanitizeText(dom.trackerCategoryInput.value, 40) || "Custom";
  const itemName = sanitizeText(dom.trackerItemInput.value, 80);
  const goalType = sanitizeText(dom.trackerGoalTypeInput.value, 40) || "Target progress";
  const unitType = dom.trackerUnitTypeSelect.value;
  const customUnit = sanitizeText(dom.trackerCustomUnitInput.value, 20);
  const unitLabel = unitType === "custom" ? customUnit : unitType;
  const startValue = roundNumber(toNumber(dom.trackerStartValueInput.value, NaN));
  const currentValue = roundNumber(toNumber(dom.trackerCurrentValueInput.value, NaN));
  const targetValue = roundNumber(toNumber(dom.trackerTargetValueInput.value, NaN));
  const deadline = normalizeDateOnly(dom.trackerDeadlineInput.value);
  const priority = PRIORITY_VALUES.includes(dom.trackerPrioritySelect.value) ? dom.trackerPrioritySelect.value : "Medium";
  const accentColor = normalizeHexColor(dom.trackerAccentInput.value) || "#5de4c7";
  const icon = normalizeIcon(dom.trackerIconInput.value) || guessIcon(title, category, itemName);
  const notes = sanitizeMultiline(dom.trackerNotesInput.value, 400);
  const customFields = collectCustomFields();

  const validationError = validateTrackerPayload({ title, unitLabel, startValue, currentValue, targetValue });
  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  if (!isAuthenticated()) {
    showToast("Sign in before saving trackers.", "error");
    return;
  }

  const basePayload = {
    title,
    createdBy,
    category,
    itemName,
    goalType,
    unitType,
    unitLabel,
    startValue,
    targetValue,
    deadline,
    priority,
    notes,
    accentColor,
    icon,
    customFields
  };

  if (ui.trackerModalMode === "edit") {
    const tracker = findTracker(dom.trackerIdInput.value);
    if (!tracker) return;

    const candidate = recalculateTracker({
      ...tracker,
      ...basePayload,
      currentValue,
      logs: [...tracker.logs],
      updatedAt: new Date().toISOString()
    });

    try {
      let syncedTracker = null;

      if (isBackendAuthSession() && !isLocalOnlyMode()) {
        await updateBackendTracker(tracker.id, candidate);
        await syncWorkspaceFromBackend();
        syncedTracker = findTracker(tracker.id) || candidate;
      } else {
        syncedTracker = commitLocalTracker(candidate);
      }

      queueWorkspaceEmail({
        type: "tracker",
        tracker: syncedTracker,
        subject: `Tracker updated: ${syncedTracker.title}`,
        preview: `${syncedTracker.category} · now at ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)} of ${formatValueWithUnit(syncedTracker.targetValue, syncedTracker.unitLabel)}.`,
        body: `Tracker: ${syncedTracker.title}\nCategory: ${syncedTracker.category}\nUpdated by: ${syncedTracker.createdBy}\nCurrent value: ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)}\nTarget value: ${formatValueWithUnit(syncedTracker.targetValue, syncedTracker.unitLabel)}\nPriority: ${syncedTracker.priority}`
      });
      saveState();
      closeTrackerModal();
      renderApp();
      openDetailDrawer(tracker.id);
      showToast(isLocalOnlyMode() ? `Updated "${syncedTracker.title}" locally.` : `Updated "${syncedTracker.title}".`, "success");
    } catch (error) {
      if (error.backendUnavailable) {
        activateLocalFallback("Backend unavailable. Tracker updated locally.");
        const syncedTracker = commitLocalTracker(candidate);
        queueWorkspaceEmail({
          type: "tracker",
          tracker: syncedTracker,
          subject: `Tracker updated locally: ${syncedTracker.title}`,
          preview: `${syncedTracker.category} · saved into local-only mode until backend sync returns.`,
          body: `Tracker: ${syncedTracker.title}\nStatus: Local-only mode\nCurrent value: ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)}\nTarget value: ${formatValueWithUnit(syncedTracker.targetValue, syncedTracker.unitLabel)}`
        });
        closeTrackerModal();
        renderApp();
        openDetailDrawer(tracker.id);
        showToast(`Updated "${syncedTracker.title}" locally.`, "success");
        return;
      }

      showToast(error.message || "The tracker could not be updated.", "error");
    }
    return;
  }

  const now = new Date().toISOString();
  const tracker = recalculateTracker({
    id: createId("trk"),
    ...basePayload,
    currentValue,
    archived: false,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    logs: []
  });

  try {
    let syncedTracker = null;
    let createdTrackerId = tracker.id;

    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      const createdGoal = await createBackendTracker(tracker);
      await syncWorkspaceFromBackend();
      createdTrackerId = createdGoal?.id || tracker.id;
      syncedTracker = findTracker(createdGoal?.id) || findTracker(tracker.id) || tracker;
    } else {
      syncedTracker = createLocalTrackerRecord(basePayload, currentValue);
      createdTrackerId = syncedTracker?.id || tracker.id;
    }

    queueWorkspaceEmail({
      type: "tracker",
      tracker: syncedTracker,
      subject: `Tracker created: ${syncedTracker.title}`,
      preview: `${syncedTracker.category} · target ${formatValueWithUnit(syncedTracker.targetValue, syncedTracker.unitLabel)} with ${syncedTracker.priority.toLowerCase()} priority.`,
      body: `Tracker: ${syncedTracker.title}\nCategory: ${syncedTracker.category}\nGoal type: ${syncedTracker.goalType}\nTarget: ${formatValueWithUnit(syncedTracker.targetValue, syncedTracker.unitLabel)}\nCreated by: ${syncedTracker.createdBy}`
    });
    saveState();
    closeTrackerModal();
    renderApp();
    openDetailDrawer(createdTrackerId || syncedTracker.id);
    showToast(isLocalOnlyMode() ? `Created "${syncedTracker.title}" locally.` : `Created "${syncedTracker.title}".`, "success");
  } catch (error) {
    if (error.backendUnavailable) {
      activateLocalFallback("Backend unavailable. Tracker created locally.");
      const syncedTracker = createLocalTrackerRecord(basePayload, currentValue);
      queueWorkspaceEmail({
        type: "tracker",
        tracker: syncedTracker,
        subject: `Tracker created locally: ${syncedTracker.title}`,
        preview: `${syncedTracker.category} · stored in local-only mode until backend sync returns.`,
        body: `Tracker: ${syncedTracker.title}\nMode: Local-only fallback\nTarget: ${formatValueWithUnit(syncedTracker.targetValue, syncedTracker.unitLabel)}\nCreated by: ${syncedTracker.createdBy}`
      });
      closeTrackerModal();
      renderApp();
      openDetailDrawer(syncedTracker.id);
      showToast(`Created "${syncedTracker.title}" locally.`, "success");
      return;
    }

    showToast(error.message || "The tracker could not be created.", "error");
  }
}

async function handleLogSubmit(event) {
  event.preventDefault();

  const tracker = findTracker(dom.logTrackerId.value || ui.selectedTrackerId);
  if (!tracker) {
    showToast("Open a tracker before logging progress.", "error");
    return;
  }

  const amount = roundNumber(toNumber(dom.logAmountInput.value, NaN));
  const timestamp = parseLocalInput(dom.logDateInput.value) || new Date();
  const note = sanitizeMultiline(dom.logNoteInput.value, 240);
  const tag = sanitizeText(dom.logTagInput.value, 40);
  const editingLogId = dom.editingLogId.value;
  const proofImage = ui.logProof.dataUrl;
  const proofName = ui.logProof.name;

  if (!Number.isFinite(amount) || amount === 0) {
    showToast("Enter a non-zero progress amount.", "error");
    dom.logAmountInput.focus();
    return;
  }

  if (ui.logProof.processing) {
    showToast("Wait for the proof image to finish processing.", "error");
    return;
  }

  if (!isAuthenticated()) {
    showToast("Sign in before saving progress entries.", "error");
    return;
  }

  const previousStatus = getTrackerStatus(tracker);

  if (editingLogId) {
    const existingLog = tracker.logs.find((log) => log.id === editingLogId);
    if (existingLog?.readOnly) {
      showToast("That sync entry is generated by the backend and can't be edited directly.", "error");
      return;
    }

    const logPayload = {
      amount,
      timestamp: timestamp.toISOString(),
      note,
      tag,
      proofImage,
      proofName,
      system: false
    };

    try {
      let syncedTracker = null;
      let editedLog = null;

      if (isBackendAuthSession() && !isLocalOnlyMode()) {
        await updateBackendProgressEntry(tracker.id, editingLogId, logPayload);
        await syncWorkspaceFromBackend();
        syncedTracker = findTracker(tracker.id) || tracker;
        editedLog = syncedTracker.logs.find((log) => log.id === editingLogId) || null;
      } else {
        syncedTracker = updateLocalLogEntry(tracker.id, editingLogId, logPayload) || tracker;
        editedLog = syncedTracker.logs.find((log) => log.id === editingLogId) || null;
      }

      queueWorkspaceEmail({
        type: "progress",
        tracker: syncedTracker,
        log: editedLog,
        subject: `Progress entry updated: ${syncedTracker.title}`,
        preview: `${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)} on ${formatCalendarDate(timestamp, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`,
        body: `Tracker: ${syncedTracker.title}\nChange: ${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)}\nTag: ${tag || "None"}\nNote: ${note || "Manual progress entry"}\nCurrent total: ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)}`
      });
      saveState();
      renderApp();
      openDetailDrawer(syncedTracker.id);
      resetLogForm(true);
      maybeCelebrateCompletion(previousStatus, getTrackerStatus(syncedTracker), syncedTracker);
      showToast(isLocalOnlyMode() ? "Log entry updated locally." : "Log entry updated.", "success");
    } catch (error) {
      if (error.backendUnavailable) {
        activateLocalFallback("Backend unavailable. Progress entry updated locally.");
        const syncedTracker = updateLocalLogEntry(tracker.id, editingLogId, logPayload) || tracker;
        const editedLog = syncedTracker.logs.find((log) => log.id === editingLogId) || null;
        queueWorkspaceEmail({
          type: "progress",
          tracker: syncedTracker,
          log: editedLog,
          subject: `Progress entry updated locally: ${syncedTracker.title}`,
          preview: `${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)} saved in local-only mode.`,
          body: `Tracker: ${syncedTracker.title}\nChange: ${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)}\nMode: Local-only fallback\nTag: ${tag || "None"}`
        });
        renderApp();
        openDetailDrawer(syncedTracker.id);
        resetLogForm(true);
        maybeCelebrateCompletion(previousStatus, getTrackerStatus(syncedTracker), syncedTracker);
        showToast("Log entry updated locally.", "success");
        return;
      }

      showToast(error.message || "The progress entry could not be updated.", "error");
    }
    return;
  }

  if (roundNumber(tracker.currentValue + amount) < 0) {
    showToast("That correction would push the tracker below zero.", "error");
    return;
  }

  const logPayload = {
    amount,
    timestamp: timestamp.toISOString(),
    note,
    tag,
    proofImage,
    proofName,
    system: false
  };

  try {
    let syncedTracker = null;
    let latestLog = null;

    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      const createdEntry = await createBackendProgressEntry(tracker.id, logPayload);
      await syncWorkspaceFromBackend();
      syncedTracker = findTracker(tracker.id) || tracker;
      latestLog = syncedTracker.logs.find((log) => log.id === createdEntry?.id) || syncedTracker.logs[0] || null;
    } else {
      syncedTracker = addLocalLogEntry(tracker.id, logPayload) || tracker;
      latestLog = syncedTracker.logs[0] || null;
    }

    queueWorkspaceEmail({
      type: "progress",
      tracker: syncedTracker,
      log: latestLog,
      subject: `${amount >= 0 ? "Progress logged" : "Correction logged"}: ${syncedTracker.title}`,
      preview: `${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)} · ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)} total.`,
      body: `Tracker: ${syncedTracker.title}\nChange: ${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)}\nWhen: ${formatCalendarDate(timestamp, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}\nTag: ${tag || "None"}\nNote: ${note || "Manual progress entry"}\nCurrent total: ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)}`
    });
    saveState();
    renderApp();
    openDetailDrawer(syncedTracker.id);
    resetLogForm(true);
    maybeCelebrateCompletion(previousStatus, getTrackerStatus(syncedTracker), syncedTracker);
    showToast(
      isLocalOnlyMode()
        ? amount > 0 ? "Progress logged locally." : "Correction logged locally."
        : amount > 0 ? "Progress logged." : "Correction logged.",
      "success"
    );
  } catch (error) {
    if (error.backendUnavailable) {
      activateLocalFallback("Backend unavailable. Progress entry saved locally.");
      const syncedTracker = addLocalLogEntry(tracker.id, logPayload) || tracker;
      const latestLog = syncedTracker.logs[0] || null;
      queueWorkspaceEmail({
        type: "progress",
        tracker: syncedTracker,
        log: latestLog,
        subject: `${amount >= 0 ? "Progress logged locally" : "Correction logged locally"}: ${syncedTracker.title}`,
        preview: `${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)} stored in local-only mode.`,
        body: `Tracker: ${syncedTracker.title}\nChange: ${formatSignedValueWithUnit(amount, syncedTracker.unitLabel)}\nMode: Local-only fallback\nTag: ${tag || "None"}`
      });
      renderApp();
      openDetailDrawer(syncedTracker.id);
      resetLogForm(true);
      maybeCelebrateCompletion(previousStatus, getTrackerStatus(syncedTracker), syncedTracker);
      showToast(amount > 0 ? "Progress logged locally." : "Correction logged locally.", "success");
      return;
    }

    showToast(error.message || "The progress entry could not be saved.", "error");
  }
}
function startEditingLog(trackerId, logId) {
  const tracker = findTracker(trackerId);
  const log = tracker?.logs.find((entry) => entry.id === logId);
  if (!tracker || !log) return;

  openDetailDrawer(trackerId);
  dom.logTrackerId.value = trackerId;
  dom.editingLogId.value = logId;
  dom.logAmountInput.value = String(log.amount);
  dom.logDateInput.value = toLocalInputValue(log.timestamp);
  dom.logTagInput.value = log.tag || "";
  dom.logNoteInput.value = log.note || "";
  if (log.proofImage) {
    setPendingLogProof(log.proofImage, log.proofName || "Stored proof image");
  } else {
    clearPendingLogProof();
  }
  dom.logSubmitBtn.textContent = "Save Log Changes";
  dom.detailSaveLogBtn.textContent = "Save Log Changes";
  dom.logFormStateLabel.textContent = "Editing entry";
  dom.cancelLogEditBtn.classList.remove("hidden");
  if (!isMobileViewport()) {
    focusElementWithoutScroll(dom.logAmountInput);
  }
}

function resetLogForm(keepTracker = false) {
  dom.logForm.reset();
  dom.logDateInput.value = toLocalInputValue(new Date());
  dom.editingLogId.value = "";
  clearPendingLogProof();
  dom.logSubmitBtn.textContent = "Add Log Entry";
  dom.detailSaveLogBtn.textContent = "Add Log Entry";
  dom.logFormStateLabel.textContent = "Add a fresh entry";
  dom.cancelLogEditBtn.classList.add("hidden");
  dom.logTrackerId.value = keepTracker ? ui.selectedTrackerId || "" : "";
}

async function toggleArchiveTracker(trackerId) {
  const tracker = findTracker(trackerId);
  if (!tracker) return;

  const updated = recalculateTracker({
    ...tracker,
    archived: !tracker.archived,
    updatedAt: new Date().toISOString()
  });

  try {
    let syncedTracker = null;

    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      await updateBackendTracker(tracker.id, updated);
      await syncWorkspaceFromBackend();
      syncedTracker = findTracker(tracker.id) || updated;
    } else {
      syncedTracker = commitLocalTracker(updated);
    }

    queueWorkspaceEmail({
      type: "tracker",
      tracker: syncedTracker,
      subject: `${syncedTracker.archived ? "Tracker archived" : "Tracker restored"}: ${syncedTracker.title}`,
      preview: `${syncedTracker.title} is now ${syncedTracker.archived ? "archived" : "back in your live workspace"}.`,
      body: `Tracker: ${syncedTracker.title}\nStatus: ${syncedTracker.archived ? "Archived" : "Restored"}\nCurrent total: ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)}`
    });
    saveState();
    renderApp();
    openDetailDrawer(syncedTracker.id);
    showToast(syncedTracker.archived ? `Archived "${syncedTracker.title}".` : `Restored "${syncedTracker.title}".`, "success");
  } catch (error) {
    if (error.backendUnavailable) {
      activateLocalFallback(`Backend unavailable. Tracker ${updated.archived ? "archived" : "restored"} locally.`);
      const syncedTracker = commitLocalTracker(updated);
      queueWorkspaceEmail({
        type: "tracker",
        tracker: syncedTracker,
        subject: `${syncedTracker.archived ? "Tracker archived locally" : "Tracker restored locally"}: ${syncedTracker.title}`,
        preview: `${syncedTracker.title} is now ${syncedTracker.archived ? "archived" : "active"} in local-only mode.`,
        body: `Tracker: ${syncedTracker.title}\nMode: Local-only fallback\nStatus: ${syncedTracker.archived ? "Archived" : "Restored"}`
      });
      renderApp();
      openDetailDrawer(syncedTracker.id);
      showToast(syncedTracker.archived ? `Archived "${syncedTracker.title}" locally.` : `Restored "${syncedTracker.title}" locally.`, "success");
      return;
    }

    showToast(error.message || "The tracker archive state could not be updated.", "error");
  }
}

async function resetTrackerProgress(trackerId) {
  const tracker = findTracker(trackerId);
  if (!tracker) return;

  try {
    const removableLogs = tracker.logs.filter((log) => !log.readOnly);
    let syncedTracker = null;

    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      for (const log of removableLogs) {
        await removeBackendProgressEntry(log.id);
      }

      await updateBackendTracker(tracker.id, {
        ...tracker,
        currentValue: tracker.startValue,
        completedAt: null,
        logs: []
      });
      await syncWorkspaceFromBackend();
      syncedTracker = findTracker(tracker.id) || tracker;
    } else {
      syncedTracker = resetLocalTrackerRecord(tracker.id) || tracker;
    }

    queueWorkspaceEmail({
      type: "tracker",
      tracker: syncedTracker,
      subject: `Tracker reset: ${syncedTracker.title}`,
      preview: `${syncedTracker.title} returned to ${formatValueWithUnit(syncedTracker.startValue, syncedTracker.unitLabel)}.`,
      body: `Tracker: ${syncedTracker.title}\nReset to: ${formatValueWithUnit(syncedTracker.startValue, syncedTracker.unitLabel)}\nPrevious entries cleared: ${removableLogs.length}`
    });
    saveState();
    renderApp();
    openDetailDrawer(syncedTracker.id);
    resetLogForm(true);
    showToast(isLocalOnlyMode() ? `Reset "${syncedTracker.title}" locally.` : `Reset "${syncedTracker.title}" to its starting value.`, "success");
  } catch (error) {
    if (error.backendUnavailable) {
      activateLocalFallback("Backend unavailable. Tracker reset locally.");
      const syncedTracker = resetLocalTrackerRecord(tracker.id) || tracker;
      queueWorkspaceEmail({
        type: "tracker",
        tracker: syncedTracker,
        subject: `Tracker reset locally: ${syncedTracker.title}`,
        preview: `${syncedTracker.title} returned to ${formatValueWithUnit(syncedTracker.startValue, syncedTracker.unitLabel)} in local-only mode.`,
        body: `Tracker: ${syncedTracker.title}\nMode: Local-only fallback\nReset to: ${formatValueWithUnit(syncedTracker.startValue, syncedTracker.unitLabel)}`
      });
      renderApp();
      openDetailDrawer(syncedTracker.id);
      resetLogForm(true);
      showToast(`Reset "${syncedTracker.title}" locally.`, "success");
      return;
    }

    showToast(error.message || "The tracker could not be reset.", "error");
  }
}

async function deleteTracker(trackerId) {
  const tracker = findTracker(trackerId);
  if (!tracker) return;

  try {
    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      await removeBackendTracker(trackerId);
    } else {
      removeLocalTrackerRecord(trackerId);
    }

    queueWorkspaceEmail({
      type: "tracker",
      subject: `Tracker deleted: ${tracker.title}`,
      preview: `${tracker.title} and its ${tracker.logs.filter((log) => !log.readOnly).length} saved entr${tracker.logs.filter((log) => !log.readOnly).length === 1 ? "y" : "ies"} were removed from the workspace.`,
      body: `Tracker: ${tracker.title}\nCategory: ${tracker.category}\nDeleted entries: ${tracker.logs.filter((log) => !log.readOnly).length}\nLast known total: ${formatValueWithUnit(tracker.currentValue, tracker.unitLabel)}`,
      accentColor: tracker.accentColor
    });
    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      await syncWorkspaceFromBackend();
    }
    saveState();
    if (ui.selectedTrackerId === trackerId) {
      closeDetailDrawer();
    }
    renderApp();
    showToast(isLocalOnlyMode() ? `Deleted "${tracker.title}" locally.` : `Deleted "${tracker.title}".`, "success");
  } catch (error) {
    if (error.backendUnavailable) {
      activateLocalFallback("Backend unavailable. Tracker deleted locally.");
      removeLocalTrackerRecord(trackerId);
      queueWorkspaceEmail({
        type: "tracker",
        subject: `Tracker deleted locally: ${tracker.title}`,
        preview: `${tracker.title} was removed in local-only mode.`,
        body: `Tracker: ${tracker.title}\nMode: Local-only fallback\nDeleted entries: ${tracker.logs.filter((log) => !log.readOnly).length}`,
        accentColor: tracker.accentColor
      });
      if (ui.selectedTrackerId === trackerId) {
        closeDetailDrawer();
      }
      renderApp();
      showToast(`Deleted "${tracker.title}" locally.`, "success");
      return;
    }

    showToast(error.message || "The tracker could not be deleted.", "error");
  }
}

async function deleteLogEntry(trackerId, logId) {
  const tracker = findTracker(trackerId);
  if (!tracker) return;

  const log = tracker.logs.find((entry) => entry.id === logId);
  if (!log) return;
  if (log.readOnly) {
    showToast("That sync entry is generated by the backend and can't be deleted directly.", "error");
    return;
  }

  try {
    let syncedTracker = null;

    if (isBackendAuthSession() && !isLocalOnlyMode()) {
      await removeBackendProgressEntry(logId);
      await syncWorkspaceFromBackend();
      syncedTracker = findTracker(trackerId) || tracker;
    } else {
      syncedTracker = removeLocalLogEntry(trackerId, logId) || tracker;
    }

    queueWorkspaceEmail({
      type: "progress",
      tracker: syncedTracker,
      subject: `Progress entry deleted: ${syncedTracker.title}`,
      preview: `${syncedTracker.title} now sits at ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)} after removing one entry.`,
      body: `Tracker: ${syncedTracker.title}\nDeleted log id: ${logId}\nCurrent total: ${formatValueWithUnit(syncedTracker.currentValue, syncedTracker.unitLabel)}`
    });
    saveState();
    renderApp();
    openDetailDrawer(syncedTracker.id);
    resetLogForm(true);
    showToast(isLocalOnlyMode() ? "Log entry deleted locally." : "Log entry deleted.", "success");
  } catch (error) {
    if (error.backendUnavailable) {
      activateLocalFallback("Backend unavailable. Log entry deleted locally.");
      const syncedTracker = removeLocalLogEntry(trackerId, logId) || tracker;
      queueWorkspaceEmail({
        type: "progress",
        tracker: syncedTracker,
        subject: `Progress entry deleted locally: ${syncedTracker.title}`,
        preview: `${syncedTracker.title} updated in local-only mode after removing one entry.`,
        body: `Tracker: ${syncedTracker.title}\nMode: Local-only fallback\nDeleted log id: ${logId}`
      });
      renderApp();
      openDetailDrawer(syncedTracker.id);
      resetLogForm(true);
      showToast("Log entry deleted locally.", "success");
      return;
    }

    showToast(error.message || "The progress entry could not be deleted.", "error");
  }
}

function openDetailDrawer(trackerId, focusLog = false) {
  ui.selectedTrackerId = trackerId;
  resetLogForm(true);
  renderDetailDrawer();
  syncOverlayLock();
  resetDrawerBodyScroll();

  if (focusLog && !isMobileViewport()) {
    window.setTimeout(() => {
      focusElementWithoutScroll(dom.logAmountInput);
    }, 120);
  }
}

function closeDetailDrawer() {
  ui.selectedTrackerId = null;
  dom.detailDrawer.classList.remove("is-open");
  dom.detailDrawer.setAttribute("aria-hidden", "true");
  dom.drawerScrim.classList.remove("is-open");
  resetDrawerBodyScroll();
  window.setTimeout(() => {
    if (!ui.selectedTrackerId) {
      dom.drawerScrim.hidden = true;
    }
  }, 390);
  resetLogForm();
  syncOverlayLock();
}

function resetDrawerBodyScroll() {
  if (!dom.drawerBody) return;

  dom.detailDrawer.scrollTop = 0;
  dom.drawerBody.scrollTop = 0;
  dom.drawerBody.scrollLeft = 0;

  window.requestAnimationFrame(() => {
    if (!dom.drawerBody) return;
    dom.detailDrawer.scrollTop = 0;
    dom.drawerBody.scrollTop = 0;
    dom.drawerBody.scrollLeft = 0;
  });

  window.setTimeout(() => {
    if (!dom.drawerBody) return;
    dom.detailDrawer.scrollTop = 0;
    dom.drawerBody.scrollTop = 0;
    dom.drawerBody.scrollLeft = 0;
  }, 90);

  window.setTimeout(() => {
    if (!dom.drawerBody) return;
    dom.detailDrawer.scrollTop = 0;
    dom.drawerBody.scrollTop = 0;
    dom.drawerBody.scrollLeft = 0;
  }, 220);
}

function focusElementWithoutScroll(element) {
  if (!element) return;

  const previousTop = dom.drawerBody ? dom.drawerBody.scrollTop : 0;
  const previousLeft = dom.drawerBody ? dom.drawerBody.scrollLeft : 0;

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
    if (dom.drawerBody) {
      dom.drawerBody.scrollTop = previousTop;
      dom.drawerBody.scrollLeft = previousLeft;
    }
  }
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 780px)").matches || window.matchMedia("(pointer: coarse)").matches;
}

function openTrackerModal(mode = "create", trackerId = "") {
  if (!isAuthenticated()) return;

  ui.trackerModalMode = mode;
  dom.trackerForm.reset();
  dom.customFieldList.innerHTML = "";
  dom.trackerAccentInput.value = "#5de4c7";
  dom.trackerAccentPreview.textContent = "#5de4c7";
  dom.trackerPrioritySelect.value = "Medium";
  dom.trackerUnitTypeSelect.value = "hours";
  dom.trackerIdInput.value = "";
  dom.trackerTemplateSelect.value = "";
  dom.trackerCreatorInput.value = getAccountName();
  dom.trackerModalHelperCard.classList.add("hidden");

  if (mode === "edit") {
    const tracker = findTracker(trackerId);
    if (!tracker) return;

    dom.trackerModalTitle.textContent = "Edit Tracker";
    dom.trackerModalSubtitle.textContent = "Adjust metadata, values, custom fields, colors, or sync the tracker to a new current value.";
    dom.trackerIdInput.value = tracker.id;
    dom.trackerTitleInput.value = tracker.title;
    dom.trackerCreatorInput.value = tracker.createdBy || "You";
    dom.trackerCategoryInput.value = tracker.category;
    dom.trackerItemInput.value = tracker.itemName;
    dom.trackerGoalTypeInput.value = tracker.goalType;
    dom.trackerUnitTypeSelect.value = tracker.unitType;
    dom.trackerCustomUnitInput.value = tracker.unitType === "custom" ? tracker.unitLabel : "";
    dom.trackerStartValueInput.value = String(tracker.startValue);
    dom.trackerCurrentValueInput.value = String(tracker.currentValue);
    dom.trackerTargetValueInput.value = String(tracker.targetValue);
    dom.trackerDeadlineInput.value = tracker.deadline || "";
    dom.trackerPrioritySelect.value = tracker.priority;
    dom.trackerAccentInput.value = tracker.accentColor;
    dom.trackerAccentPreview.textContent = tracker.accentColor;
    dom.trackerIconInput.value = tracker.icon || "";
    dom.trackerNotesInput.value = tracker.notes || "";
    dom.trackerModalHelperText.textContent = `Proof images for "${tracker.title}" are added per progress entry inside the tracker's Manual progress logging panel.`;
    dom.trackerModalHelperCard.classList.remove("hidden");
    tracker.customFields.forEach((field) => appendCustomFieldRow(field));
  } else {
    dom.trackerModalTitle.textContent = "Create Tracker";
    dom.trackerModalSubtitle.textContent = "Configure a fully custom tracker with your own units, target, styling, and metadata.";
    dom.trackerCreatorInput.value = getAccountName();
    dom.trackerStartValueInput.value = "0";
    dom.trackerCurrentValueInput.value = "0";
    dom.trackerTargetValueInput.value = "100";
  }

  if (!dom.customFieldList.children.length) {
    appendCustomFieldRow();
  }

  syncUnitFieldVisibility();
  updateTrackerTemplateHint();
  dom.trackerModal.classList.add("is-open");
  dom.trackerModal.setAttribute("aria-hidden", "false");
  syncOverlayLock();
  window.setTimeout(() => dom.trackerTitleInput.focus(), 80);
}

function closeTrackerModal() {
  dom.trackerModal.classList.remove("is-open");
  dom.trackerModal.setAttribute("aria-hidden", "true");
  syncOverlayLock();
}

function openLoggerFromTrackerModal() {
  const trackerId = dom.trackerIdInput.value;
  if (!trackerId) return;

  closeTrackerModal();
  openDetailDrawer(trackerId, true);
}

function openConfirm({ title, message, action }) {
  ui.confirmAction = action;
  dom.confirmModalTitle.textContent = title;
  dom.confirmModalMessage.textContent = message;
  dom.confirmModal.classList.add("is-open");
  dom.confirmModal.setAttribute("aria-hidden", "false");
  syncOverlayLock();
}

function closeConfirmModal() {
  ui.confirmAction = null;
  dom.confirmModal.classList.remove("is-open");
  dom.confirmModal.setAttribute("aria-hidden", "true");
  syncOverlayLock();
}

function syncOverlayLock() {
  if (!isAuthenticated()) {
    dom.body.classList.toggle("is-locked", dom.guideModal.classList.contains("is-open"));
    return;
  }

  const hasOverlay =
    dom.trackerModal.classList.contains("is-open") ||
    dom.confirmModal.classList.contains("is-open") ||
    dom.mailModal.classList.contains("is-open") ||
    dom.guideModal.classList.contains("is-open") ||
    dom.detailDrawer.classList.contains("is-open") ||
    dom.proofModal.classList.contains("is-open");

  dom.body.classList.toggle("is-locked", hasOverlay);
}

function syncTheme() {
  dom.body.dataset.theme = state.settings.theme;
  dom.themeToggleIcon.textContent = state.settings.theme === "dark" ? "☀" : "☾";
  dom.themeToggleBtn.setAttribute(
    "aria-label",
    state.settings.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
  );
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  saveState();
  syncTheme();
  showToast(`${capitalize(state.settings.theme)} theme activated.`, "success");
}

function syncUnitFieldVisibility() {
  const isCustom = dom.trackerUnitTypeSelect.value === "custom";
  dom.customUnitField.classList.toggle("hidden", !isCustom);
  if (!isCustom) {
    dom.trackerCustomUnitInput.value = "";
  }
}

function appendCustomFieldRow(field = { label: "", value: "" }) {
  const fragment = dom.customFieldRowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".custom-field-row");
  row.querySelector("[data-custom-label]").value = field.label || "";
  row.querySelector("[data-custom-value]").value = field.value || "";
  dom.customFieldList.appendChild(fragment);
}

function collectCustomFields() {
  return Array.from(dom.customFieldList.querySelectorAll(".custom-field-row"))
    .map((row) => ({
      id: createId("field"),
      label: sanitizeText(row.querySelector("[data-custom-label]")?.value, 32),
      value: sanitizeText(row.querySelector("[data-custom-value]")?.value, 80)
    }))
    .filter((field) => field.label && field.value);
}

function handleImportFile(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  if (!isAuthenticated()) {
    showToast("Sign in before importing a workspace snapshot.", "error");
    dom.importFileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const nextTrackers = extractTrackersFromImport(parsed);
      openConfirm({
        title: "Import workspace",
        message: isLocalOnlyMode()
          ? `Replace your local-only workspace with "${file.name}"? Your current cached trackers and logs will be overwritten on this device.`
          : `Replace your backend workspace with "${file.name}"? Your current saved trackers and logs will be overwritten.`,
        action: async () => {
          if (!nextTrackers.length) {
            showToast("That file does not contain any trackers to import.", "error");
            return;
          }

          try {
            if (isBackendAuthSession() && !isLocalOnlyMode()) {
              await importWorkspaceToBackend(nextTrackers, file.name);
            } else {
              state.trackers = nextTrackers.map((tracker, index) => normalizeTracker(tracker, index));
              saveState();
            }

            queueWorkspaceEmail({
              type: "workspace",
              subject: `${isLocalOnlyMode() ? "Local workspace" : "Workspace"} imported from ${file.name}`,
              preview: isLocalOnlyMode()
                ? "A backup import replaced the cached local-only workspace."
                : "A backup import replaced the saved backend workspace.",
              body: `Imported file: ${file.name}\nImported at: ${formatCalendarDate(new Date(), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}\nStatus: ${isLocalOnlyMode() ? "Local-only workspace replaced successfully." : "Backend workspace replaced successfully."}`
            });
            saveState();
            closeDetailDrawer();
            renderApp();
            showToast(isLocalOnlyMode() ? "Local workspace imported successfully." : "Workspace imported successfully.", "success");
          } catch (error) {
            if (error.backendUnavailable) {
              activateLocalFallback("Backend unavailable. Imported file applied locally.");
              state.trackers = nextTrackers.map((tracker, index) => normalizeTracker(tracker, index));
              queueWorkspaceEmail({
                type: "workspace",
                subject: `Local workspace imported from ${file.name}`,
                preview: "A backup import was saved to local-only mode after backend sync failed.",
                body: `Imported file: ${file.name}\nStatus: Local-only fallback import succeeded.`
              });
              saveState();
              closeDetailDrawer();
              renderApp();
              showToast("Workspace imported into local-only mode.", "success");
              return;
            }

            console.error(error);
            showToast(error.message || "The backend import could not be completed.", "error");
          }
        }
      });
    } catch {
      showToast("That file is not a valid Progress Tracker Pro export.", "error");
    } finally {
      dom.importFileInput.value = "";
    }
  };

  reader.readAsText(file);
}

function exportStateSnapshot() {
  const workspaceSnapshot = buildExportSnapshot();
  const snapshot = {
    exportedAt: new Date().toISOString(),
    app: "Progress Tracker Pro",
    workspace: workspaceSnapshot
  };

  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `progress-tracker-pro-${getDateKey(new Date())}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast("Workspace exported as JSON.", "success");
}

function buildExportSnapshot() {
  return {
    trackers: state.trackers.map((tracker) => ({
      ...tracker,
      logs: tracker.logs.filter((log) => !log.readOnly).map((log) => ({
        ...log,
        readOnly: false
      }))
    }))
  };
}

function extractTrackersFromImport(parsed) {
  const sourceTrackers = Array.isArray(parsed?.workspace?.trackers)
    ? parsed.workspace.trackers
    : Array.isArray(parsed?.state?.trackers)
      ? parsed.state.trackers
      : Array.isArray(parsed?.trackers)
        ? parsed.trackers
        : [];

  return sourceTrackers.map((tracker, index) => normalizeTracker(tracker, index));
}

async function importWorkspaceToBackend(trackers) {
  // Import replaces the saved backend workspace by replaying trackers and logs through real APIs.
  const existingTrackers = [...state.trackers];
  for (const tracker of existingTrackers) {
    await removeBackendTracker(tracker.id);
  }

  for (const tracker of trackers) {
    const createdGoal = await createBackendTracker(recalculateTracker({
      ...tracker,
      currentValue: tracker.startValue,
      completedAt: null,
      logs: []
    }));

    const importableLogs = [...tracker.logs]
      .filter((log) => !log.readOnly)
      .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

    for (const log of importableLogs) {
      await createBackendProgressEntry(createdGoal.id, {
        amount: log.amount,
        timestamp: log.timestamp,
        note: log.note,
        tag: log.tag,
        proofImage: log.proofImage,
        proofName: log.proofName || `${tracker.title}-proof`,
        system: false
      });
    }
  }

  await syncWorkspaceFromBackend();
}

function setView(viewName) {
  if (!VIEW_NAMES.includes(viewName)) return;
  ui.activeView = viewName;
  syncFilterInputs();
  renderViewState();
  if (window.innerWidth <= 780) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function syncFilterInputs() {
  setSelectOptions(dom.categoryFilter, [
    { value: "all", label: "All categories" },
    ...getUniqueCategories().map((category) => ({ value: category, label: category }))
  ], ui.filters.category);

  setSelectOptions(dom.historyTrackerFilter, [
    { value: "all", label: "All trackers" },
    ...state.trackers.map((tracker) => ({ value: tracker.id, label: tracker.title }))
  ], ui.history.trackerId);

  dom.trackerSearchInput.value = ui.filters.query;
  ui.filters.category = dom.categoryFilter.value;
  dom.statusFilter.value = ui.filters.status;
  dom.priorityFilter.value = ui.filters.priority;
  dom.sortFilter.value = ui.filters.sort;
  dom.historySearchInput.value = ui.history.query;
  dom.historyTypeFilter.value = ui.history.type;
  ui.history.trackerId = dom.historyTrackerFilter.value;
}

function setSelectOptions(select, options, selectedValue) {
  const previous = options.some((option) => option.value === selectedValue) ? selectedValue : options[0]?.value;
  select.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join("");
  select.value = previous;
}

function getFilteredTrackers() {
  return [...state.trackers]
    .filter((tracker) => {
      const status = getTrackerStatus(tracker);
      const query = ui.filters.query.toLowerCase();
      const matchesQuery = !query || buildTrackerSearchText(tracker).includes(query);
      const matchesCategory = ui.filters.category === "all" || tracker.category === ui.filters.category;
      const matchesStatus = ui.filters.status === "all" || status === ui.filters.status;
      const matchesPriority = ui.filters.priority === "all" || tracker.priority === ui.filters.priority;
      return matchesQuery && matchesCategory && matchesStatus && matchesPriority;
    })
    .sort((left, right) => sortTrackers(left, right, ui.filters.sort));
}

function getFilteredHistoryEntries() {
  return getAllHistoryEntries()
    .filter((entry) => {
      const query = ui.history.query.toLowerCase();
      const matchesTracker = ui.history.trackerId === "all" || entry.tracker.id === ui.history.trackerId;
      const type = ui.history.type;
      const matchesType =
        type === "all" ||
        (type === "progress" && entry.log.amount > 0 && !entry.log.system) ||
        (type === "correction" && entry.log.amount < 0 && !entry.log.system) ||
        (type === "system" && entry.log.system);
      const matchesQuery = !query || buildHistorySearchText(entry).includes(query);
      return matchesTracker && matchesType && matchesQuery;
    })
    .sort((a, b) => new Date(b.log.timestamp) - new Date(a.log.timestamp));
}

function sortTrackers(left, right, sort) {
  if (sort === "newest") {
    return new Date(right.createdAt) - new Date(left.createdAt);
  }

  if (sort === "deadline") {
    return sortableDeadline(left.deadline) - sortableDeadline(right.deadline);
  }

  if (sort === "highestProgress") {
    return getTrackerPercent(right) - getTrackerPercent(left);
  }

  if (sort === "lowestProgress") {
    return getTrackerPercent(left) - getTrackerPercent(right);
  }

  return new Date(right.updatedAt) - new Date(left.updatedAt);
}
function getOverview() {
  const liveTrackers = getLiveTrackers();
  const activeTrackers = liveTrackers.filter((tracker) => getTrackerStatus(tracker) === "active");
  const completedTrackers = liveTrackers.filter((tracker) => getTrackerStatus(tracker) === "completed");
  const archivedTrackers = state.trackers.filter((tracker) => tracker.archived);
  const manualEntries = getAllHistoryEntries().filter((entry) => !entry.log.system);
  const todayKey = getDateKey(new Date());
  const todayEntries = manualEntries.filter((entry) => getDateKey(entry.log.timestamp) === todayKey);
  const todayNet = roundNumber(todayEntries.reduce((sum, entry) => sum + entry.log.amount, 0));
  const week = getWeeklyChartData();
  const overallCompletionPercent = Math.round(getOverallCompletion(liveTrackers));

  return {
    totalTrackers: state.trackers.length,
    activeTrackers: activeTrackers.length,
    completedTrackers: completedTrackers.length,
    weightedCompletedTrackers: completedTrackers.length,
    archivedTrackers: archivedTrackers.length,
    todayEntries: todayEntries.length,
    todayNet,
    weekTotal: roundNumber(week.currentWeekTotal),
    weekManualEntries: week.currentWeekEntries,
    weekDeltaLabel:
      week.previousWeekTotal === 0
        ? `${formatSignedNumber(week.currentWeekTotal, 1)} vs fresh baseline`
        : `${week.delta >= 0 ? "+" : ""}${Math.round(week.deltaPercent)}% vs previous week`,
    dueSoon: getUpcomingItems(10).filter((item) => item.tracker.deadline && getDeadlineInfo(item.tracker.deadline).daysUntil <= 7).length,
    overallCompletionPercent,
    manualLogCount: manualEntries.length
  };
}

function getLiveTrackers() {
  return state.trackers.filter((tracker) => !tracker.archived);
}

function getAllHistoryEntries() {
  return state.trackers.flatMap((tracker) =>
    tracker.logs.map((log) => ({
      tracker,
      log
    }))
  );
}

function getRecentManualEntries(limit = 6) {
  return getAllHistoryEntries()
    .filter((entry) => !entry.log.system)
    .sort((a, b) => new Date(b.log.timestamp) - new Date(a.log.timestamp))
    .slice(0, limit);
}

function getUniqueCategories() {
  return [...new Set(state.trackers.map((tracker) => tracker.category))].sort((left, right) => left.localeCompare(right));
}

function getCategoryStats() {
  const grouped = new Map();

  getLiveTrackers().forEach((tracker) => {
    if (!grouped.has(tracker.category)) {
      grouped.set(tracker.category, []);
    }
    grouped.get(tracker.category).push(tracker);
  });

  return Array.from(grouped.entries())
    .map(([category, trackers]) => {
      const avgCompletion = Math.round(trackers.reduce((sum, tracker) => sum + clamp(getTrackerPercent(tracker), 0, 100), 0) / trackers.length);
      return {
        category,
        count: trackers.length,
        activeCount: trackers.filter((tracker) => getTrackerStatus(tracker) === "active").length,
        avgCompletion,
        topAccent: trackers[0]?.accentColor || "#5de4c7"
      };
    })
    .sort((left, right) => right.count - left.count || right.avgCompletion - left.avgCompletion);
}

function getUpcomingItems(limit = 5) {
  return getLiveTrackers()
    .filter((tracker) => getTrackerStatus(tracker) === "active")
    .map((tracker) => ({
      tracker,
      nextMilestone: getNextMilestone(tracker),
      deadline: getDeadlineInfo(tracker.deadline)
    }))
    .sort((left, right) => {
      const leftDeadline = left.deadline.daysUntil ?? Number.POSITIVE_INFINITY;
      const rightDeadline = right.deadline.daysUntil ?? Number.POSITIVE_INFINITY;
      if (leftDeadline !== rightDeadline) {
        return leftDeadline - rightDeadline;
      }
      return (left.nextMilestone ?? 1000) - (right.nextMilestone ?? 1000);
    })
    .slice(0, limit);
}

function getWeeklyChartData() {
  const days = [];
  let currentWeekTotal = 0;
  let currentWeekEntries = 0;
  let previousWeekTotal = 0;

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = daysOffset(-offset);
    const key = getDateKey(date);
    const total = roundNumber(getPositiveTotalForDateKey(key));
    const entries = getAllHistoryEntries().filter((entry) => !entry.log.system && getDateKey(entry.log.timestamp) === key).length;
    currentWeekTotal += total;
    currentWeekEntries += entries;
    days.push({
      date,
      label: formatCalendarDate(date, { weekday: "short" }),
      total
    });
  }

  for (let offset = 13; offset >= 7; offset -= 1) {
    previousWeekTotal += roundNumber(getPositiveTotalForDateKey(getDateKey(daysOffset(-offset))));
  }

  const delta = roundNumber(currentWeekTotal - previousWeekTotal);
  const deltaPercent = previousWeekTotal === 0 ? 100 : (delta / previousWeekTotal) * 100;

  return {
    days,
    currentWeekTotal: roundNumber(currentWeekTotal),
    currentWeekEntries,
    previousWeekTotal: roundNumber(previousWeekTotal),
    delta,
    deltaPercent
  };
}

function getHeatmapData(days = 28) {
  return Array.from({ length: days }, (_, index) => {
    const date = daysOffset(index - (days - 1));
    const key = getDateKey(date);
    return {
      date,
      total: roundNumber(getPositiveTotalForDateKey(key))
    };
  });
}

function getPositiveTotalForDateKey(dateKey) {
  return getAllHistoryEntries()
    .filter((entry) => !entry.log.system && getDateKey(entry.log.timestamp) === dateKey)
    .reduce((sum, entry) => sum + Math.max(entry.log.amount, 0), 0);
}

function getTrackerPositiveTotal(tracker, days) {
  let total = 0;
  for (let offset = 0; offset < days; offset += 1) {
    const key = getDateKey(daysOffset(-offset));
    total += tracker.logs
      .filter((log) => !log.system && getDateKey(log.timestamp) === key)
      .reduce((sum, log) => sum + Math.max(log.amount, 0), 0);
  }
  return roundNumber(total);
}

function getTrackerNetForDay(tracker, dateKey) {
  return roundNumber(
    tracker.logs
      .filter((log) => !log.system && getDateKey(log.timestamp) === dateKey)
      .reduce((sum, log) => sum + log.amount, 0)
  );
}

function getTrackerTrendSeries(tracker, days = 7) {
  const series = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = daysOffset(-offset);
    const key = getDateKey(date);
    const total = getTrackerNetForDay(tracker, key);
    series.push({
      date,
      total,
      shortLabel: formatCalendarDate(date, { weekday: "short" }).slice(0, 1),
      fullLabel: formatCalendarDate(date, { weekday: "short", month: "short", day: "numeric" })
    });
  }

  return series;
}

function getTrackerPercent(tracker) {
  return roundNumber(getProgressRatio(tracker.startValue, tracker.targetValue, tracker.currentValue) * 100);
}

function getProgressRatio(startValue, targetValue, currentValue) {
  const distance = targetValue - startValue;
  if (distance <= 0) {
    return currentValue >= targetValue ? 1 : 0;
  }
  return (currentValue - startValue) / distance;
}

function getOverallCompletion(trackers) {
  const weighted = trackers.reduce(
    (accumulator, tracker) => {
      const distance = Math.max(tracker.targetValue - tracker.startValue, 0);
      if (!distance) return accumulator;
      accumulator.totalDistance += distance;
      accumulator.progress += clamp(getProgressRatio(tracker.startValue, tracker.targetValue, tracker.currentValue), 0, 1) * distance;
      return accumulator;
    },
    { progress: 0, totalDistance: 0 }
  );

  if (!weighted.totalDistance) return 0;
  return (weighted.progress / weighted.totalDistance) * 100;
}

function getTrackerStatus(tracker) {
  if (tracker.archived) return "archived";
  if (getProgressRatio(tracker.startValue, tracker.targetValue, tracker.currentValue) >= 1) return "completed";
  return "active";
}

function statusLabel(status) {
  if (status === "completed") return "Completed";
  if (status === "archived") return "Archived";
  return "Active";
}

function getDeadlineInfo(deadline) {
  if (!deadline) {
    return { label: "No deadline", daysUntil: null };
  }

  const today = stripTime(new Date());
  const due = stripTime(new Date(`${deadline}T00:00:00`));
  const daysUntil = Math.round((due - today) / 86400000);

  if (daysUntil < 0) {
    return { label: `${Math.abs(daysUntil)} day${Math.abs(daysUntil) === 1 ? "" : "s"} overdue`, daysUntil };
  }
  if (daysUntil === 0) {
    return { label: "Due today", daysUntil };
  }
  if (daysUntil === 1) {
    return { label: "Due tomorrow", daysUntil };
  }
  return { label: `Due in ${daysUntil} days`, daysUntil };
}

function sortableDeadline(deadline) {
  return deadline ? new Date(`${deadline}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
}

function getNextMilestone(tracker) {
  const percent = getTrackerPercent(tracker);
  return [25, 50, 75, 100].find((milestone) => milestone > percent) || null;
}

function getRemainingText(tracker) {
  const remaining = roundNumber(tracker.targetValue - tracker.currentValue);
  if (remaining > 0) {
    return `${formatValueWithUnit(remaining, tracker.unitLabel)} remaining to reach target.`;
  }
  if (remaining === 0) {
    return "Target reached exactly.";
  }
  return `${formatValueWithUnit(Math.abs(remaining), tracker.unitLabel)} beyond target.`;
}

function getRemainingNumericText(tracker) {
  const remaining = roundNumber(tracker.targetValue - tracker.currentValue);
  return remaining >= 0
    ? formatValueWithUnit(remaining, tracker.unitLabel)
    : `${formatValueWithUnit(Math.abs(remaining), tracker.unitLabel)} over`;
}

function calculateStreak(logs) {
  const positiveDays = new Set(
    logs.filter((log) => !log.system && log.amount > 0).map((log) => getDateKey(log.timestamp))
  );

  if (!positiveDays.size) return 0;

  const today = stripTime(new Date());
  const yesterday = stripTime(daysOffset(-1));
  const todayKey = getDateKey(today);
  const yesterdayKey = getDateKey(yesterday);

  let cursor;
  if (positiveDays.has(todayKey)) {
    cursor = today;
  } else if (positiveDays.has(yesterdayKey)) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let streak = 0;
  while (positiveDays.has(getDateKey(cursor))) {
    streak += 1;
    cursor = daysOffset(-1, cursor);
  }

  return streak;
}

function createTrackerTrendMarkup(tracker, variant = "card") {
  const series = getTrackerTrendSeries(tracker, 7);
  const percent = clamp(Math.round(getTrackerPercent(tracker)), 0, 100);
  const netTotal = roundNumber(series.reduce((sum, day) => sum + day.total, 0));
  const activeDays = series.filter((day) => day.total !== 0).length;
  const peakDay = series.reduce((best, day) => (Math.abs(day.total) > Math.abs(best.total) ? day : best), series[0] || {
    total: 0,
    fullLabel: "No activity"
  });
  const milestoneCount = [25, 50, 75, 100].filter((milestone) => percent >= milestone).length;
  const dotCount = 10;
  const filledDots = Math.round((percent / 100) * dotCount);
  const waffleCount = 25;
  const filledWaffle = Math.round((percent / 100) * waffleCount);

  return `
    <section class="sparkline-block progress-board progress-board-${variant}" aria-label="Visual progress charts for ${escapeHtml(tracker.title)}">
      <div class="progress-board-head">
        <div>
          <p class="sparkline-label">Progress board</p>
          <div class="sparkline-total">${percent}% complete</div>
        </div>
        <div class="progress-board-pills">
          <span class="progress-board-pill">${activeDays}/7 active days</span>
          <span class="progress-board-pill">Peak ${escapeHtml(formatSignedValueWithUnit(peakDay.total || 0, tracker.unitLabel))}</span>
        </div>
      </div>
      <div class="progress-board-grid">
        <article class="progress-viz-card">
          <span class="progress-viz-label">Donut</span>
          <div class="progress-board-donut" data-progress-value="${percent}">
            <span>${percent}%</span>
          </div>
        </article>

        <article class="progress-viz-card">
          <span class="progress-viz-label">Steps</span>
          <div class="progress-step-track">
            ${[25, 50, 75, 100]
              .map(
                (milestone, index) => `
                  <span class="progress-step ${percent >= milestone ? "is-active" : ""}" style="--step-index:${index}">
                    <i></i>
                    <small>${milestone}</small>
                  </span>
                `
              )
              .join("")}
          </div>
          <p class="progress-viz-note">${milestoneCount} of 4 milestones reached</p>
        </article>

        <article class="progress-viz-card">
          <span class="progress-viz-label">Dot</span>
          <div class="progress-dot-row">
            ${Array.from({ length: dotCount }, (_, index) => `
              <span class="progress-dot ${index < filledDots ? "is-active" : ""}" style="--dot-index:${index}"></span>
            `).join("")}
          </div>
          <p class="progress-viz-note">${escapeHtml(formatSignedValueWithUnit(netTotal, tracker.unitLabel))} this week</p>
        </article>

        <article class="progress-viz-card">
          <span class="progress-viz-label">Waffle</span>
          <div class="progress-waffle-grid">
            ${Array.from({ length: waffleCount }, (_, index) => `
              <span class="progress-waffle-cell ${index < filledWaffle ? "is-active" : ""}" style="--waffle-index:${index}"></span>
            `).join("")}
          </div>
          <p class="progress-viz-note">${escapeHtml(peakDay.fullLabel)} peak day</p>
        </article>
      </div>
      <p class="progress-board-footnote">${escapeHtml(formatValueWithUnit(tracker.currentValue, tracker.unitLabel))} of ${escapeHtml(formatValueWithUnit(tracker.targetValue, tracker.unitLabel))} tracked so far.</p>
    </section>
  `;
}

function setRingState(element, labelElement, percent, label) {
  if (!element || !labelElement) return;
  element.dataset.progressValue = String(clamp(percent, 0, 100));
  labelElement.textContent = label;
}

function animateProgressVisuals(root) {
  root.querySelectorAll("[data-progress-value]").forEach((element) => {
    const value = clamp(Number(element.dataset.progressValue) || 0, 0, 100);
    if (element.classList.contains("day-bar-fill")) {
      element.style.height = `${value}%`;
      return;
    }

    if (
      element.classList.contains("progress-strip-fill")
      || element.classList.contains("mini-progress-fill")
      || element.classList.contains("graph-compare-fill")
    ) {
      element.style.width = `${value}%`;
      return;
    }

    element.style.setProperty("--progress", `${value}%`);
  });
}

function animateNumber(element, target, formatter) {
  if (!element) return;
  const numericTarget = Number(target);
  if (!Number.isFinite(numericTarget)) {
    element.textContent = formatter(target);
    return;
  }

  const previous = Number(element.dataset.numericValue || 0);
  const duration = 420;
  const start = performance.now();

  if (element._animationFrame) {
    cancelAnimationFrame(element._animationFrame);
  }

  const step = (timestamp) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = previous + (numericTarget - previous) * eased;
    element.textContent = formatter(value);
    if (progress < 1) {
      element._animationFrame = requestAnimationFrame(step);
    }
  };

  element.dataset.numericValue = String(numericTarget);
  element._animationFrame = requestAnimationFrame(step);
}

function maybeCelebrateCompletion(previousStatus, nextStatus, tracker) {
  if (previousStatus !== "completed" && nextStatus === "completed") {
    showToast(`Goal complete: "${tracker.title}" just crossed the finish line.`, "success");
  }
}

function replaceTracker(nextTracker) {
  state.trackers = state.trackers.map((tracker) => (tracker.id === nextTracker.id ? nextTracker : tracker));
}

function findTracker(trackerId) {
  return state.trackers.find((tracker) => tracker.id === trackerId) || null;
}

function createLog(amount, timestamp, note = "", tag = "", system = false, proofImage = "", proofName = "", readOnly = false) {
  const iso = normalizeIso(timestamp);
  return {
    id: createId("log"),
    amount: roundNumber(amount),
    timestamp: iso,
    note: sanitizeMultiline(note, 240),
    tag: sanitizeText(tag, 40),
    proofImage: normalizeImageDataUrl(proofImage),
    proofName: sanitizeText(proofName, 80),
    system,
    readOnly: Boolean(readOnly),
    createdAt: iso,
    updatedAt: iso
  };
}

function validateTrackerPayload({ title, unitLabel, startValue, currentValue, targetValue }) {
  if (!title) {
    return "Give the tracker a clear title first.";
  }

  if (!unitLabel) {
    return "Choose a unit or enter a custom unit label.";
  }

  if (![startValue, currentValue, targetValue].every((value) => Number.isFinite(value))) {
    return "Start, current, and target values all need valid numbers.";
  }

  if (currentValue < 0) {
    return "Current value cannot be negative.";
  }

  if (targetValue <= startValue) {
    return "Target value must be greater than the starting value.";
  }

  return null;
}

function handleGlobalKeydown(event) {
  if (event.key !== "Escape") return;

  if (dom.proofModal.classList.contains("is-open")) {
    closeProofModal();
    return;
  }

  if (dom.mailModal.classList.contains("is-open")) {
    closeMailModal();
    return;
  }

  if (dom.guideModal.classList.contains("is-open")) {
    closeGuideModal();
    return;
  }

  if (dom.confirmModal.classList.contains("is-open")) {
    closeConfirmModal();
    return;
  }

  if (dom.trackerModal.classList.contains("is-open")) {
    closeTrackerModal();
    return;
  }

  if (dom.detailDrawer.classList.contains("is-open")) {
    closeDetailDrawer();
  }
}

function showToast(message, tone = "success") {
  const toast = document.createElement("div");
  toast.className = `toast is-${tone}`;
  toast.textContent = message;
  dom.toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("is-visible");
  });

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 220);
  }, 2800);
}

function createEmptyStackItem(title, message) {
  return `
    <div class="stack-item">
      <strong>${escapeHtml(title)}</strong>
      <p class="stack-item-note">${escapeHtml(message)}</p>
    </div>
  `;
}

function getBadgeContent(tracker) {
  const icon = normalizeIcon(tracker.icon);
  if (icon) return icon;

  return (
    tracker.title
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "PT"
  );
}

function guessIcon(title = "", category = "", itemName = "") {
  const combined = `${title} ${category} ${itemName}`.toLowerCase();
  if (combined.includes("game") || combined.includes("rank") || combined.includes("valorant") || combined.includes("mission")) return "🎮";
  if (combined.includes("study") || combined.includes("exam") || combined.includes("chapter") || combined.includes("syllabus")) return "📚";
  if (combined.includes("exercise") || combined.includes("workout") || combined.includes("run") || combined.includes("gym")) return "🏃";
  if (combined.includes("habit") || combined.includes("routine")) return "🌿";
  if (combined.includes("project") || combined.includes("build")) return "🛠️";
  if (combined.includes("skill") || combined.includes("learn")) return "🧠";
  if (combined.includes("read") || combined.includes("book")) return "📖";
  return "🎯";
}

function buildTrackerSearchText(tracker) {
  const custom = tracker.customFields.map((field) => `${field.label} ${field.value}`).join(" ");
  const logText = tracker.logs.map((log) => `${log.tag} ${log.note} ${log.proofName}`).join(" ");
  return `${tracker.title} ${tracker.createdBy} ${tracker.category} ${tracker.itemName} ${tracker.goalType} ${tracker.notes} ${tracker.priority} ${custom} ${logText}`.toLowerCase();
}

function buildHistorySearchText(entry) {
  return `${entry.tracker.title} ${entry.tracker.category} ${entry.tracker.itemName} ${entry.log.note} ${entry.log.tag} ${entry.log.proofName}`.toLowerCase();
}

function formatNumber(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits
  }).format(Number(value) || 0);
}

function formatSignedNumber(value, maximumFractionDigits = 1) {
  const amount = Number(value) || 0;
  if (amount === 0) return "0";
  return `${amount > 0 ? "+" : ""}${formatNumber(amount, maximumFractionDigits)}`;
}

function formatValueWithUnit(value, unitLabel) {
  const formatted = formatNumber(value, 1);
  return unitLabel === "%" ? `${formatted}%` : `${formatted} ${unitLabel}`;
}

function formatSignedValueWithUnit(value, unitLabel) {
  const formatted = formatSignedNumber(value, 1);
  return unitLabel === "%" ? `${formatted}%` : `${formatted} ${unitLabel}`;
}

function formatRelativeTime(value) {
  const date = typeof value === "string" ? new Date(value) : value;
  const now = new Date();
  const diff = stripTime(now) - stripTime(date);
  const days = Math.round(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return formatCalendarDate(date, { month: "short", day: "numeric" });
}

function formatClock(value) {
  return formatCalendarDate(value, { hour: "numeric", minute: "2-digit" });
}

function buildProofCaption(tracker, log) {
  return `${tracker.title} · ${formatCalendarDate(log.timestamp, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

function formatCalendarDate(value, options) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
}

function groupLabel(dateKey) {
  const today = getDateKey(new Date());
  const yesterday = getDateKey(daysOffset(-1));
  if (dateKey === today) return "Today";
  if (dateKey === yesterday) return "Yesterday";
  return formatCalendarDate(`${dateKey}T00:00:00`, { weekday: "long", month: "short", day: "numeric" });
}

function getHeatIntensity(total, max) {
  if (!total) return 0;
  const ratio = total / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

function daysOffset(offset, anchor = new Date()) {
  const copy = new Date(anchor);
  copy.setDate(copy.getDate() + offset);
  return copy;
}

function timestampFromOffset(dayOffset, hours, minutes) {
  const date = daysOffset(dayOffset);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function dateOnlyFromDaysOffset(offset) {
  return getDateKey(daysOffset(offset));
}

function toLocalInputValue(value) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function parseLocalInput(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDateKey(value) {
  const date = typeof value === "string" ? new Date(value) : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function stripTime(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function normalizeIso(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeDateOnly(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : getDateKey(date);
}

function normalizeEmail(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw || raw.length > 120) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw) ? raw : "";
}

function normalizeImageDataUrl(value) {
  const raw = String(value || "").trim();
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(raw)) {
    return raw;
  }
  if (/^https?:\/\/.+/i.test(raw)) {
    return raw;
  }
  return "";
}

// NEW FEATURE: robust proof-image source conversion for backend uploads.
async function createBlobFromProofSource(value) {
  const source = normalizeImageDataUrl(value);
  if (!source) {
    throw new Error("Proof image is invalid or missing.");
  }

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(source)) {
    return dataUrlToBlob(source);
  }

  const response = await fetch(source, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Could not read the selected proof image.");
  }

  return response.blob();
}

// NEW FEATURE: manual data URL -> Blob conversion avoids Edge/Chromium fetch(dataUrl) failures.
function dataUrlToBlob(dataUrl) {
  const matches = String(dataUrl || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/i);
  if (!matches) {
    throw new Error("Unsupported proof image format.");
  }

  const mimeType = matches[1] || "application/octet-stream";
  const isBase64 = Boolean(matches[2]);
  const payload = matches[3] || "";

  if (!isBase64) {
    return new Blob([decodeURIComponent(payload)], { type: mimeType });
  }

  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

async function hashSecret(value) {
  const payload = new TextEncoder().encode(String(value || "").trim());
  if (!payload.length) return "";

  if (window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", payload);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  return Array.from(payload, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function prepareProofImage(file) {
  const image = await loadImageFromFile(file);
  const maxDimension = 1280;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is unavailable");
  }

  canvas.width = width;
  canvas.height = height;
  context.fillStyle = document.body?.dataset.theme === "light" ? "#f7f1e8" : "#08131a";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.86;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);

  while (estimateDataUrlBytes(dataUrl) > 360000 && quality > 0.48) {
    quality = roundNumber(quality - 0.08, 2);
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  return {
    dataUrl,
    width,
    height
  };
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image decode failed"));
      image.src = String(reader.result || "");
    };

    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlBytes(dataUrl) {
  const payload = String(dataUrl).split(",")[1] || "";
  return Math.ceil(payload.length * 0.75);
}

function normalizeHexColor(value) {
  const raw = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : "";
}

function normalizeIcon(value) {
  const raw = String(value || "").trim();
  return raw.slice(0, 4);
}

function sanitizeText(value, maxLength = 80) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function sanitizeMultiline(value, maxLength = 400) {
  return String(value || "").trim().replace(/\r\n/g, "\n").slice(0, maxLength);
}

function roundNumber(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) || 0) * factor) / factor;
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createId(prefix = "id") {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

function getLatestTimestamp(values) {
  return values
    .map((value) => normalizeIso(value))
    .sort((left, right) => new Date(right) - new Date(left))[0];
}

function adjustHexColor(hex, percent) {
  const value = hex.replace("#", "");
  const amount = Math.round(2.55 * percent);
  const r = clamp(parseInt(value.slice(0, 2), 16) + amount, 0, 255);
  const g = clamp(parseInt(value.slice(2, 4), 16) + amount, 0, 255);
  const b = clamp(parseInt(value.slice(4, 6), 16) + amount, 0, 255);
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgba(hex, alpha = 0.2) {
  const value = hex.replace("#", "");
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function capitalize(value) {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : "";
}
