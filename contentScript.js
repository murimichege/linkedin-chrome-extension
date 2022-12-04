const results = chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message) {
    console.log('From the content script', message);
    console.log(sender);
    console.log(message);
  }

  sendResponse({ working: 'working' });

  setupChart(message.metrics);
  //   return sender;
});

function setupChart(results) {
  return new Chart(document.getElementById('barchart').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Connections', 'Messages', 'Followers'],
      datasets: [
        {
          label: 'User Info',
          backgroundColor: ['#8e5ea2', '#3cba9f', '#e8c3b9', '#c45850'],
          data: Object.values(results || {}),
        },
      ],
    },
    options: {
      legend: { display: true },
      title: {
        display: true,
        text: 'Your LinkedIn Metrics',
      },
    },
  });
}
