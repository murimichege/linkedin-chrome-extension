// get message

chrome.runtime.onMessage.addListener((sender, sendResponse, message) => {
    console.log(message)
    console.log(sender)
    sendResponse("received")
})