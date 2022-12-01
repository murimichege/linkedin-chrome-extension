

// get message
chrome.runtime.onMessage.addListener((sender, sendResponse, message) => {
    console.log(message)
    console.log(sender)
    sendResponse("received")
})
document.addEventListener('DOMContentLoaded', function(sender)
{

    new Chart(document.getElementById("bar-chart"), {
        type: 'bar',
        data: {
            labels: ["Connections", "Messages", "Followers"],
            datasets: [
                {
                    label: "User Info",
                    backgroundColor: ["#8e5ea2", "#3cba9f", "#e8c3b9", "#c45850"],
                    data: []
                },
            ]
        },
        options: {
            legend: { display: true },
            title: {
                display: true,
                text: 'Your LinkedIn Metrics'
            }
        }
    });

    
    
})
