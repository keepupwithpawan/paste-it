let popupWindow = null;
 let focusIntervalId = null;
 
 // Listen for clicks on the extension icon
 chrome.action.onClicked.addListener(() => {
   if (popupWindow) {
     // Check if the window still exists
     chrome.windows.get(popupWindow.id, {}, (window) => {
       if (chrome.runtime.lastError) {
         // Window doesn't exist anymore, create a new one
         createPopupWindow();
       } else {
         // Window exists, toggle it (close it)
         chrome.windows.remove(popupWindow.id);
         popupWindow = null;
         clearFocusInterval();
       }
     });
   } else {
     // No window exists, create one
     createPopupWindow();
   }
 });
 
 // Function to create the popup window
 function createPopupWindow() {
   // Get the current window first to determine positioning
   chrome.windows.getCurrent((currentWindow) => {
     // Get display information
     const width = 350;
     const height = 500;
     
     // Calculate position (top-right corner of the current window)
     let left = (currentWindow.width - width) + currentWindow.left;
     let top = currentWindow.top;
     
     // Ensure window is within visible area
     if (left < 0) left = 0;
     if (top < 0) top = 0;
     
     // Create a new popup window
     chrome.windows.create({
       url: chrome.runtime.getURL('popup.html'),
       type: 'popup',
       width: width,
       height: height,
       top: top,
       left: left,
       focused: true
     }, (window) => {
       popupWindow = window;
       
       // Create a focus interval to keep the window on top
       setupFocusInterval();
     });
   });
 }
 
 // Function to set up the focus interval
 function setupFocusInterval() {
   // Clear any existing intervals
   clearFocusInterval();
   
   // Set up a new interval to check and bring the window to front
   // This interval is less frequent to be less intrusive
   focusIntervalId = setInterval(() => {
     if (popupWindow) {
       // Check if the window is focused
       chrome.windows.get(popupWindow.id, {}, (window) => {
         if (!chrome.runtime.lastError && !window.focused) {
           // Only focus if the window isn't already focused
           chrome.windows.update(popupWindow.id, { focused: true });
         }
       });
     } else {
       clearFocusInterval();
     }
   }, 0); // Check every 3 seconds - balance between staying on top and being intrusive
 }
 
 // Function to clear the focus interval
 function clearFocusInterval() {
   if (focusIntervalId) {
     clearInterval(focusIntervalId);
     focusIntervalId = null;
   }
 }
 
 // Listen for popup window being closed
 chrome.windows.onRemoved.addListener((windowId) => {
   if (popupWindow && popupWindow.id === windowId) {
     popupWindow = null;
     clearFocusInterval();
   }
 });
 
 // Listen for when the browser is shutting down
 chrome.runtime.onSuspend.addListener(() => {
   clearFocusInterval();
 });