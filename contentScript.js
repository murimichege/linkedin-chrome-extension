const results = chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if(sender){
        console.log(sender)   
        console.log(request)
    }
    sendResponse({working:"working"})

    return sender
})
setupChart(results)

function setupChart(results){

            return new Chart(document.getElementById("barchart").getContext('2d'), {
    
                type: 'bar',
                data: {
                    labels: ["Connections", "Messages", "Followers"],
                    datasets: [
                        {
                            label: "User Info",
                            backgroundColor: ["#8e5ea2", "#3cba9f", "#e8c3b9", "#c45850"],
                            data: Object.keys(results || {})
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
  

 


 


