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
    const width = 900; 
    const height = 1500;

    chrome.system.display.getInfo((displays) => {
      const primaryDisplay = displays[0];
      const screenWidth = primaryDisplay.workArea.width;
      const screenHeight = primaryDisplay.workArea.height;
      const screenLeft = primaryDisplay.workArea.left;
      const screenTop = primaryDisplay.workArea.top;

      // Calculate top-right position
      let left = (currentWindow.width - width) + currentWindow.left;
      let top = currentWindow.top;

      // Ensure 50% visibility
      const minVisibleWidth = width * 0.5;
      const minVisibleHeight = height * 0.5;
      if (left + minVisibleWidth > screenLeft + screenWidth) {
        left = screenLeft + screenWidth - width;
      }
      if (left < screenLeft) left = screenLeft;
      if (top + minVisibleHeight > screenTop + screenHeight) {
        top = screenTop + screenHeight - height;
      }
      if (top < screenTop) top = screenTop;

      chrome.windows.create({
        url: chrome.runtime.getURL('popup.html'),
        // Remove type: 'popup' to test Arc's default behavior
        width: width,
        height: height,
        top: Math.round(top),
        left: Math.round(left),
        focused: true,
        state: 'normal'
      }, (window) => {
        if (chrome.runtime.lastError) {
          console.error('Window creation failed:', chrome.runtime.lastError.message);
          chrome.windows.create({
            url: chrome.runtime.getURL('popup.html'),
            width: width,
            height: height,
            left: Math.round(screenLeft + (screenWidth - width) / 2),
            top: Math.round(screenTop + (screenHeight - height) / 2),
            focused: true,
            state: 'normal'
          }, (fallbackWindow) => {
            popupWindow = fallbackWindow;
            if (fallbackWindow) enforceWindowProperties(fallbackWindow.id);
          });
        } else {
          popupWindow = window;
          enforceWindowProperties(window.id);
        }
      });
    });
  });
}

function enforceWindowProperties(windowId) {
  // Immediately enforce size and position
  chrome.windows.update(windowId, {
    width: 900,
    height: 1500,
    top: Math.round(popupWindow.top || 0), // Use initial top if available
    left: Math.round(popupWindow.left || 0),
    focused: true,
    state: 'normal'
  });

  clearFocusInterval();
  focusIntervalId = setInterval(() => {
    if (popupWindow) {
      chrome.windows.get(popupWindow.id, {}, (window) => {
        if (chrome.runtime.lastError) {
          clearFocusInterval();
          popupWindow = null;
        } else {
          console.log('Window state:', window); // Debug log
          if (!window.focused || window.state !== 'normal' || window.width > 400 || window.height > 550) {
            chrome.windows.update(popupWindow.id, {
              width: 900,
              height: 1500,
              top: Math.round(window.top),
              left: Math.round(window.left),
              focused: true,
              state: 'normal',
              drawAttention: true // Flash to regain attention
            });
          }
        }
      });
    } else {
      clearFocusInterval();
    }
  }, 2000); // Check every 0.5 seconds
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