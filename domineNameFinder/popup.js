document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("tog");
    const statusText = document.getElementById("hi");

    // Load current state
    chrome.storage.local.get('isEnabled', (data) => {
        const isEnabled = data.isEnabled ?? false;
        statusText.innerHTML = isEnabled ? "Hand Mode: ON" : "Hand Mode: OFF";
    });

    button.addEventListener("click", function () {
        chrome.storage.local.get('isEnabled', (data) => {
            const newState = !(data.isEnabled ?? false);
            chrome.storage.local.set({ isEnabled: newState }, () => {
                statusText.innerHTML = newState ? "Hand Mode: ON" : "Hand Mode: OFF";
                // Send message with the new state
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: "toggleState",
                        isEnabled: newState
                    });
                });
            });
        });
    });
});
