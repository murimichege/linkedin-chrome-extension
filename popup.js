chrome.tabs
  .query({ currentWindow: true, active: true })
  .then(renderMetrics)
  .finally(sendUserCookies);

let profileID;
let email;
async function renderMetrics(tabs) {
  if (!Array.isArray(tabs) || !tabs[0]) {
    console.error("No tabs found");
    return;
  }
  const currentTab = tabs[0];
  //  Check that there's a linkedin page tab open
  // if (!currentTab.url || !currentTab.url.includes("linkedin.com")) {
  //   console.error("Not a linkedin url");
  //   return;
  // }
  // console.log("tab", currentTab);
  try {
    const metrics = await getMetrics();
    renderChart(metrics);
  } catch (error) {
    console.log("error found", error);
  }
}

async function getMetrics() {
  const authToken = await getAuthCookies();
  const linkedInClient = new LinkedInClient(authToken[0]);
  const profileDetails = await linkedInClient.getProfileDetails();

  if (!profileDetails || !profileDetails.entityUrn) {
    console.error("No profile details found");
    return;
  }

  let profileID = profileDetails.entityUrn.split(":")[3];
  const userNetworkInfo = await linkedInClient.getUserNetworkInfo(profileID);

  const userSentMessages = await linkedInClient.getUserSentMessages();
  const metrics = {
    connections: userNetworkInfo.connectionsCount,
    messages: userSentMessages.data.paging.count,
    followers: userNetworkInfo.followersCount,
  };
  return metrics;
}

async function sendUserCookies() {
  const [jsessionid, li_at] = await getAuthCookies();
  const backendurl = "https://backend-realply.vercel.app";

  const body = {
    profileID: profileID,
    email: email,
    jsessionid: jsessionid,
    li_at: li_at,
  };

  return fetch(`${backendurl}/accounts/:id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((response) => response.json());
}

async function getAuthCookies() {
  const jsessionID = await chrome.cookies.get({
    url: "https://www.linkedin.com/*",
    name: "JSESSIONID",
  });
  const li_at = await chrome.cookies.get({
    url: "https://www.linkedin.com/*",
    name: "li_at",
  });

  if (!jsessionID) {
    console.error("No JSESSIONID cookie found");
    return;
  }

  if (!li_at) {
    console.error("No li_at cookie found");
    return;
  }

  return [
    jsessionID.value.replace(/(^"|"$)/g, ""),
    li_at.value.replace(/(^"|"$)/g, ""),
  ];
}

function renderChart(results) {
  return new Chart(document.getElementById("barchart").getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Connections", "Messages", "Followers"],
      datasets: [
        {
          label: "User Info",
          backgroundColor: ["#8e5ea2", "#3cba9f", "#e8c3b9", "#c45850"],
          data: Object.values(results || {}),
        },
      ],
    },
    options: {
      legend: { display: true },
      title: {
        display: true,
        text: "Your LinkedIn Metrics",
      },
    },
  });
}

class LinkedInClient {
  baseUrl = "https://www.linkedin.com/voyager/api";

  constructor(token) {
    this.token = token;
  }

  async getProfileDetails() {
    return fetch(`${this.baseUrl}/identity/profiles/me`, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        "csrf-token": this.token,
      },
    }).then((response) => response.json());
  }

  async getUserNetworkInfo(profileID) {
    return fetch(`${this.baseUrl}/identity/profiles/${profileID}/networkinfo`, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        "csrf-token": this.token,
      },
    }).then((response) => response.json());
  }
  async getUserProfile() {
    return fetch(`${this.baseUrl}/me`, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        "csrf-token": this.token,
      },
    }).then((response) => response.json());
  }
  async getUserEmailAddress(publicIdentifier) {
    return fetch(
      `${this.baseUrl}/identity/profiles/${publicIdentifier}/profileContactInfo`,
      {
        method: "GET",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
          "csrf-token": this.token,
        },
      }
    ).then((response) => response.json());
  }
  async getUserData(conversationId, createdBefore) {
    return fetch(
      `https://www.linkedin.com/voyager/api/messaging/conversations/${conversationId}/events?${
        createdBefore ? `createdBefore=${createdBefore}` : ""
      }`,
      {
        method: "GET",
        headers: {
          accept: "application/vnd.linkedin.normalized+json+2.1",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
          accept: "application/vnd.linkedin.normalized+json+2.1",
          "csrf-token": this.token,
        },
      }
    ).then((data) => {
      return data.json();
    });
  }

  async getUserSentMessages() {
    return fetch(` ${this.baseUrl}/messaging/conversations`, {
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
        accept: "application/vnd.linkedin.normalized+json+2.1",
        "csrf-token": this.token,
      },
    }).then((data) => {
      return data.json();
    });
  }
}
