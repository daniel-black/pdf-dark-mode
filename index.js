// Application state
const appState = {
  currentView: "uploadView",
  file: null,
  pdfDoc: null,
  currentPage: 1,
  zoom: 1.0,
};

// Elements
const views = {
  uploadView: document.getElementById("upload-view"),
  loadingView: document.getElementById("loading-view"),
  viewerView: document.getElementById("viewer-view"),
  errorView: document.getElementById("error-view"),
  shortcutsOverlay: document.getElementById("shortcuts-overlay"),
};

const elements = {
  fileInput: document.getElementById("pdf-upload"),
  uploadLabel: document.getElementById("upload-label"),
  fileInfo: document.getElementById("file-info"),
  currentFilename: document.getElementById("current-filename"),
  fileSize: document.getElementById("file-size"),
  pageControls: document.getElementById("page-controls"),
  prevPageBtn: document.getElementById("prev-page"),
  nextPageBtn: document.getElementById("next-page"),
  currentPageEl: document.getElementById("current-page"),
  totalPagesEl: document.getElementById("total-pages"),
  pdfCanvas: document.getElementById("pdf-canvas"),
  loadingFilename: document.getElementById("loading-filename"),
  loadingProgress: document.getElementById("loading-progress"),
  errorMessage: document.getElementById("error-message"),
  errorRetryBtn: document.getElementById("error-retry-btn"),
  helpButton: document.getElementById("help-button"),
  closeShortcutsBtn: document.getElementById("close-shortcuts"),
  zoomControls: document.getElementById("zoom-controls"),
  zoomInBtn: document.getElementById("zoom-in"),
  zoomOutBtn: document.getElementById("zoom-out"),
  zoomLevelEl: document.getElementById("zoom-level"),
};

// Create a PDF rendering context
const pdfContext = elements.pdfCanvas.getContext("2d");

// ----- View Management Functions -----
function switchView(viewName) {
  // Hide all views except shortcuts overlay
  Object.entries(views).forEach(([key, view]) => {
    if (key !== "shortcutsOverlay") {
      view.classList.add("hidden");
    }
  });

  // Show the requested view
  views[viewName].classList.remove("hidden");
  appState.currentView = viewName;

  // Update UI elements based on view
  if (viewName === "viewerView") {
    elements.fileInfo.classList.remove("hidden");
    elements.pageControls.classList.remove("hidden");
    elements.pageControls.classList.add("flex");
    elements.zoomControls.classList.remove("hidden");
    elements.zoomControls.classList.add("flex");
    elements.uploadLabel.textContent = "Change PDF";
  } else {
    elements.fileInfo.classList.add("hidden");
    elements.pageControls.classList.add("hidden");
    elements.pageControls.classList.remove("flex");
    elements.zoomControls.classList.add("hidden");
    elements.zoomControls.classList.remove("flex");
    elements.uploadLabel.textContent = "Upload PDF";
  }
}

// ----- PDF Handling Functions -----
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file && file.type === "application/pdf") {
    appState.file = file;

    // Switch to loading view
    switchView("loadingView");
    elements.loadingFilename.textContent = file.name;

    // Start loading the PDF
    loadPdf(file);
  }
}

function loadPdf(file) {
  const fileReader = new FileReader();

  // Setup progress tracking
  fileReader.onprogress = (event) => {
    if (event.lengthComputable) {
      const percentLoaded = Math.round((event.loaded / event.total) * 100);
      elements.loadingProgress.style.width = percentLoaded + "%";
    }
  };

  fileReader.onload = async (event) => {
    try {
      // Load the PDF document
      const typedArray = new Uint8Array(event.target.result);
      const loadingTask = pdfjsLib.getDocument(typedArray);

      loadingTask.promise
        .then((pdf) => {
          appState.pdfDoc = pdf;
          appState.currentPage = 1;

          // Update viewer information
          elements.currentFilename.textContent = file.name;
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
          elements.fileSize.textContent = `${fileSizeMB} MB`;
          elements.totalPagesEl.textContent = pdf.numPages;

          // Switch to viewer view
          switchView("viewerView");

          // Render the first page
          renderPage(1);
        })
        .catch((error) => {
          showError("Failed to load PDF: " + error.message);
        });
    } catch (error) {
      showError("Error processing the file: " + error.message);
    }
  };

  fileReader.onerror = () => {
    showError("Error reading the file. Please try again.");
  };

  // Start reading the file
  fileReader.readAsArrayBuffer(file);
}

async function renderPage(pageNumber) {
  if (!appState.pdfDoc) return;

  try {
    // Get the page
    const page = await appState.pdfDoc.getPage(pageNumber);

    // Adjust canvas dimensions for the page
    const viewport = page.getViewport({ scale: appState.zoom });
    elements.pdfCanvas.height = viewport.height;
    elements.pdfCanvas.width = viewport.width;

    // Clear canvas before rendering
    pdfContext.clearRect(
      0,
      0,
      elements.pdfCanvas.width,
      elements.pdfCanvas.height
    );

    // Render the page
    const renderContext = {
      canvasContext: pdfContext,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    // Update current page display
    elements.currentPageEl.textContent = pageNumber;
    appState.currentPage = pageNumber;

    // Update button states
    updateButtonStates();
  } catch (error) {
    showError("Error rendering page: " + error.message);
  }
}

function renderCurrentPage() {
  renderPage(appState.currentPage);
}

function updateButtonStates() {
  // Disable prev button on first page
  if (appState.currentPage <= 1) {
    elements.prevPageBtn.classList.add("opacity-50", "cursor-not-allowed");
    elements.prevPageBtn.disabled = true;
  } else {
    elements.prevPageBtn.classList.remove("opacity-50", "cursor-not-allowed");
    elements.prevPageBtn.disabled = false;
  }

  // Disable next button on last page
  if (appState.pdfDoc && appState.currentPage >= appState.pdfDoc.numPages) {
    elements.nextPageBtn.classList.add("opacity-50", "cursor-not-allowed");
    elements.nextPageBtn.disabled = true;
  } else {
    elements.nextPageBtn.classList.remove("opacity-50", "cursor-not-allowed");
    elements.nextPageBtn.disabled = false;
  }
}

function showError(message) {
  elements.errorMessage.textContent = message;
  switchView("errorView");
}

// ----- Zoom Functions -----
function zoomIn() {
  if (appState.zoom < 3.0) {
    // Max zoom limit
    appState.zoom += 0.1;
    updateZoomLevel();
    renderCurrentPage();
  }
}

function zoomOut() {
  if (appState.zoom > 0.5) {
    // Min zoom limit
    appState.zoom -= 0.1;
    updateZoomLevel();
    renderCurrentPage();
  }
}

function resetZoom() {
  appState.zoom = 1.0;
  updateZoomLevel();
  renderCurrentPage();
}

function updateZoomLevel() {
  // Update zoom display with percentage
  const zoomPercent = Math.round(appState.zoom * 100);
  elements.zoomLevelEl.textContent = `${zoomPercent}%`;
}

// Toggle shortcuts overlay
function toggleShortcutsOverlay() {
  if (views.shortcutsOverlay.classList.contains("hidden")) {
    views.shortcutsOverlay.classList.remove("hidden");
    views.shortcutsOverlay.classList.add("flex");
  } else {
    views.shortcutsOverlay.classList.add("hidden");
    views.shortcutsOverlay.classList.remove("flex");
  }
}

// ----- Event Listeners -----
// File selection
elements.fileInput.addEventListener("change", handleFileSelect);

// Navigation buttons
elements.prevPageBtn.addEventListener("click", () => {
  if (appState.currentPage > 1) {
    renderPage(appState.currentPage - 1);
  }
});

elements.nextPageBtn.addEventListener("click", () => {
  if (appState.pdfDoc && appState.currentPage < appState.pdfDoc.numPages) {
    renderPage(appState.currentPage + 1);
  }
});

// Zoom controls
elements.zoomInBtn.addEventListener("click", zoomIn);
elements.zoomOutBtn.addEventListener("click", zoomOut);

// Help button
elements.helpButton.addEventListener("click", toggleShortcutsOverlay);
elements.closeShortcutsBtn.addEventListener("click", toggleShortcutsOverlay);

// Error retry button
elements.errorRetryBtn.addEventListener("click", () => {
  switchView("uploadView");
});

// ----- Keyboard Shortcuts -----
document.addEventListener("keydown", (e) => {
  // Don't process shortcuts when user is typing in an input field
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    return;
  }

  // Shortcuts that work globally
  if (e.key === "q" && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    toggleShortcutsOverlay();
    return;
  }

  if (e.ctrlKey && e.key.toLowerCase() === "o") {
    e.preventDefault(); // Prevent browser's open dialog
    elements.fileInput.click();
    return;
  }

  // Shortcuts that only work in viewer mode
  if (appState.currentView === "viewerView") {
    // Page navigation
    if (e.key === "ArrowLeft" && appState.currentPage > 1) {
      renderPage(appState.currentPage - 1);
    } else if (
      e.key === "ArrowRight" &&
      appState.pdfDoc &&
      appState.currentPage < appState.pdfDoc.numPages
    ) {
      renderPage(appState.currentPage + 1);
    }

    // Zoom controls
    if (e.ctrlKey && (e.key === "+" || e.key === "=")) {
      e.preventDefault(); // Prevent browser zoom
      zoomIn();
    } else if (e.ctrlKey && e.key === "-") {
      e.preventDefault(); // Prevent browser zoom
      zoomOut();
    } else if (e.ctrlKey && e.key === "0") {
      e.preventDefault(); // Prevent browser zoom reset
      resetZoom();
    }
  }
});

// Initialize the app
updateZoomLevel();
switchView("uploadView");
