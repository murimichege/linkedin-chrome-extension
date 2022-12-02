const metrics = chrome.runtime.onMessage.addListener((sender, sendResponse, message) => {
    console.log(sender)
    return sender
})
setupChart(metrics)
function setupChart(metrics){

    return new Chart(document.getElementById("barchart").getContext('2d'), {

    type: 'bar',
    data: {
        labels: ["Connections", "Messages", "Followers"],
        datasets: [
            {
                label: "User Info",
                backgroundColor: ["#8e5ea2", "#3cba9f", "#e8c3b9", "#c45850"],
                data: Object.keys(metrics || {})
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

}
 


