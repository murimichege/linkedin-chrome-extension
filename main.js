new Chart(document.getElementById("bar-chart"), {
    type: 'bar',
    data: {
        labels: ["Connections", "Messages", "Followers"],
        datasets: [
            {
                label: "User Info",
                backgroundColor: ["#8e5ea2", "#3cba9f", "#e8c3b9", "#c45850"],
                data: [20, 52, 74]
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