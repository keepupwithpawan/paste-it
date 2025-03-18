let popupWindow = null;
let focusIntervalId = null;

chrome.action.onClicked.addListener(() => {
  if (popupWindow) {
    chrome.windows.get(popupWindow.id, {}, (window) => {
      if (chrome.runtime.lastError) {
        createPopupWindow();
      } else {
        chrome.windows.remove(popupWindow.id);
        popupWindow = null;
        clearFocusInterval();
      }
    });
  } else {
    createPopupWindow();
  }
});

function createPopupWindow() {
  chrome.windows.getCurrent((currentWindow) => {
    const width = 350;
    const height = 500;

    // Get display info asynchronously
    chrome.system.display.getInfo((displays) => {
      // Use the primary display (index 0) or adjust for multi-monitor if needed
      const primaryDisplay = displays[0];
      const screenWidth = primaryDisplay.workArea.width;
      const screenHeight = primaryDisplay.workArea.height;
      const screenLeft = primaryDisplay.workArea.left;
      const screenTop = primaryDisplay.workArea.top;

      // Calculate initial position based on current window
      let left = (currentWindow.width - width) + currentWindow.left;
      let top = currentWindow.top;

      // Adjust bounds to ensure 50% of the window is visible
      const minVisibleWidth = width * 0.5;
      const minVisibleHeight = height * 0.5;

      // Ensure left keeps at least 50% of width on screen
      if (left + minVisibleWidth > screenLeft + screenWidth) {
        left = screenLeft + screenWidth - width; // Align to right edge
      }
      if (left < screenLeft) left = screenLeft; // Prevent off-screen left

      // Ensure top keeps at least 50% of height on screen
      if (top + minVisibleHeight > screenTop + screenHeight) {
        top = screenTop + screenHeight - height; // Align to bottom edge
      }
      if (top < screenTop) top = screenTop; // Prevent off-screen top

      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        type: 'popup',
        width: width,
        height: height,
        top: Math.round(top),
        left: Math.round(left),
        focused: true
      }, (window) => {
        if (chrome.runtime.lastError) {
          console.error('Window creation failed:', chrome.runtime.lastError.message);
          // Fallback: Center the window on the primary display
          chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            type: 'popup',
            width: width,
            height: height,
            left: Math.round(screenLeft + (screenWidth - width) / 2),
            top: Math.round(screenTop + (screenHeight - height) / 2),
            focused: true
          }, (fallbackWindow) => {
            popupWindow = fallbackWindow;
            if (fallbackWindow) setupFocusInterval();
          });
        } else {
          popupWindow = window;
          setupFocusInterval();
        }
      });
    });
  });
}

function setupFocusInterval() {
  clearFocusInterval();
  focusIntervalId = setInterval(() => {
    if (popupWindow) {
      chrome.windows.get(popupWindow.id, {}, (window) => {
        if (!chrome.runtime.lastError && !window.focused) {
          chrome.windows.update(popupWindow.id, { focused: true });
        }
      });
    } else {
      clearFocusInterval();
    }
  }, 3000);
}

function clearFocusInterval() {
  if (focusIntervalId) {
    clearInterval(focusIntervalId);
    focusIntervalId = null;
  }
}

chrome.windows.onRemoved.addListener((windowId) => {
  if (popupWindow && popupWindow.id === windowId) {
    popupWindow = null;
    clearFocusInterval();
  }
});

chrome.runtime.onSuspend.addListener(() => {
  clearFocusInterval();
});