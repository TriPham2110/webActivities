console.log('This is background service worker - edit me!');

let lastTabID = 0;

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason === 'install') {
		chrome.tabs.query({ currentWindow: true }, function (tabs) {
			if (tabs.length === 1 && tabs[0].url === "chrome://extensions/") {
				chrome.tabs.create({ url: "chrome://newtab" });
			}
			else {
				chrome.windows.create({ url: "chrome://newtab" });
			}
		});
	}
	else {
		chrome.storage.local.clear();
	};
});

chrome.tabs.onActivated.addListener(function (activeInfo) {
	lastTabID = activeInfo.tabId;
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
	for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
		console.log(key, oldValue, newValue);
	}
});

// Sets a key and stores its value into the storage
function setStorageKey(key, value) {
	chrome.storage.local.set({ [key]: value });
}

// Gets a key value from the storage
function getStorageKeyValue(key, onGetStorageKeyValue) {
	chrome.storage.local.get([key], function (result) {
		onGetStorageKeyValue(result[key]);
	});
}

function docReferrer() {
	return document.referrer;
}

function new_tab_checker(id, onGetLastTabId) {
	chrome.tabs.query({ currentWindow: true }, function (tabs) {
		for (var i = 0; i < tabs.length; i++) {
			if (tabs[i].id == id) {
				onGetLastTabId(tabs[i]);
			}
		}
	});
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
	if (changeInfo.status === 'complete') {
		chrome.scripting.executeScript({
				target: { tabId: tabId },
				func: docReferrer,
			},
			function (ref) {
				var e = chrome.runtime.lastError;
				if (e !== undefined) {
					console.log(tabId, e);
				}
				console.log(ref);
				getStorageKeyValue(tabId.toString(), function (value) {
					if (typeof value === 'undefined') {
						// open hyperlink in new tab or omnibox search
						if (lastTabID === tabId) {
							// hyperlink opened in new tab and new tab is active tab
							new_tab_checker(tabId, function (tab) {
								if (tab.openerTabId) {
									getStorageKeyValue(tab.openerTabId.toString(), function (v) {
										if (typeof v !== 'undefined') {
											setStorageKey(tabId.toString(), { "curUrl": tab.url, "prevUrl": v.curUrl, "prevTabId": tab.openerTabId });
										}
										else {
											// empty new tab or omnibox search
											setStorageKey(tabId.toString(), { "curUrl": tab.url, "prevUrl": "", "prevTabId": tabId });
										}
									});
								}
								else {
									setStorageKey(tabId.toString(), { "curUrl": tab.url, "prevUrl": "", "prevTabId": tabId });
								}
							});
						}
						else {
							// hyperlink opened in new tab but new tab is not active tab
							getStorageKeyValue(lastTabID.toString(), function (v) {
								if (typeof v !== 'undefined') {
									setStorageKey(tabId.toString(), { "curUrl": tab.url, "prevUrl": v.curUrl, "prevTabId": lastTabID });
								}
							});
						}
					}
					else {
						// navigate between urls in a same tab
						value.prevUrl = value.curUrl;
						value.curUrl = tab.url;
						value.prevTabId = tab.id;
						setStorageKey(tabId.toString(), value);
					}
				});
			});
	}
});