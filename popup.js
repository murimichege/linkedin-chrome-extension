chrome.tabs.query({ currentWindow: true, active: true }).then(initExtension);

const config = Object.freeze({
  LINKEDIN_URL: "https://www.linkedin.com",
  LINKEDIN_API_BASE_URL: "https://www.linkedin.com/voyager/api",
  REALPLY_API_BASE_URL: "http://127.0.0.1:3000/api/v1",
});

const WEBHOOK_EVENTS = Object.freeze({
  EXTENSION_INSTALLED: "EXTENSION_INSTALLED",
  CONVERSATIONS_SYNCED: "CONVERSATIONS_SYNCED",
});

const LINKEDIN_ENTITY_TYPES = Object.freeze({
  CONVERSATION: "com.linkedin.voyager.messaging.Conversation",
  MEMBER: "com.linkedin.voyager.messaging.MessagingMember",
  MINI_PROFILE: "com.linkedin.voyager.identity.shared.MiniProfile",
  EVENT: "com.linkedin.voyager.messaging.Event",
});

async function initExtension(tabs) {
  if (!Array.isArray(tabs) || !tabs[0]) {
    console.error("No tabs found");
    return;
  }
  const currentTab = tabs[0];
  // todo: Check that there's a linkedin page tab open

  // if (!currentTab.url || !currentTab.url.includes("linkedin.com")) {
  //   console.error("Not a linkedin url");
  //   return;
  // }
  // console.log("tab", currentTab);
  const { jsessionID } = await getAuthCookies();
  const linkedInClient = new LinkedInClient(jsessionID);
  const userProfile = await getProfileDetails(linkedInClient);

  // await renderMetrics(linkedInClient, userProfile);
  // await sendWebhook(WEBHOOK_EVENTS.EXTENSION_INSTALLED, {
  //   linkedInClient,
  //   userProfile,
  // });
  await syncMessages(linkedInClient, userProfile);
}

async function getProfileDetails(linkedInClient) {
  const profileDetails = await linkedInClient.getProfileDetails();

  if (!profileDetails || !profileDetails.entityUrn) {
    throw new Error("No profile details found");
    return;
  }

  return profileDetails;
}

async function renderMetrics(linkedInClient, userProfile) {
  try {
    const metrics = await getMetrics(linkedInClient, userProfile);

    renderChart(metrics);
  } catch (error) {
    // TODO: Catch webhook event error
    console.log("error found", error);
  }
}

async function getMetrics(linkedInClient, userProfile) {
  const profileID = getProfileId(userProfile);
  const userNetworkInfo = await linkedInClient.getUserNetworkInfo(profileID);
  // TODO: Fix the metric for sent messages
  const userSentMessages = await linkedInClient.getUserSentMessages();
  const metrics = {
    connections: userNetworkInfo.connectionsCount,
    messages: userSentMessages.data.paging.count,
    followers: userNetworkInfo.followersCount,
  };
  return metrics;
}

function getProfileId(user) {
  return user.entityUrn.split(":").pop();
}

async function sendWebhook(eventType, args) {
  try {
    let payload = {};
    const { userProfile, linkedInClient } = args;
    const profileID = getProfileId(userProfile);
    const contactInfo = await linkedInClient.getProfileContactInfo(profileID);
    switch (eventType) {
      case WEBHOOK_EVENTS.EXTENSION_INSTALLED:
        const { jsessionID, liAt, liA } = await getAuthCookies();
        payload = {
          profileID,
          email: contactInfo?.data?.emailAddress,
          cookies: { jsessionID, liAt, liA },
        };
        break;
      case WEBHOOK_EVENTS.CONVERSATIONS_SYNCED:
        const { conversations } = args;
        payload = {
          email: contactInfo?.data?.emailAddress,
          conversations
        };
        break;
      default:
        console.error("Wrong webhook event type", eventType);
        return;
    }

    await fetch(`${config.REALPLY_API_BASE_URL}/webhooks/extension`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: eventType, data: payload }),
    })
    .then((response) => response.json())
    .then((data) => console.log(data))
  } catch (error) {
    console.error("Error while sending webhook", error);
  }
}

async function syncMessages(linkedInClient, userProfile) {
  let conversationCreatedBefore;
  let loadMoreConversations = true;
  const conversationsAccumulator = [];
  while (loadMoreConversations) {
    const conversations = await linkedInClient.getUserConversations(
      conversationCreatedBefore
    );
    const parsedConversations = parseConversations(conversations.included);
    const conversationWithMessages = await Promise.all(
      parsedConversations.map(async (conversation) => {
        let loadMore = true;
        let createdBefore;
        const messagesAccumulator = [];
        while (loadMore) {
          const messages = await linkedInClient.getConversationMessages(
            conversation.id,
            createdBefore
          );
          const parsedMessages = parseMessages(messages.included);
          const sortedMessages = parsedMessages.sort(
            (a, b) => a.createdAt - b.createdAt
          );

          messagesAccumulator.push(...sortedMessages);

          createdBefore = sortedMessages[0]?.createdAt;
          loadMore = (messages.data["*elements"]?.length ?? 0) === 20;

          // TODO: Fix properly based on LinkedIn API's rate limit
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        return {
          ...conversation,
          totalMessagesCount: messagesAccumulator.length,
          messages: messagesAccumulator,
        };
      })
    );
    const sortedConversations = conversationWithMessages.sort(
      (a, b) => a.lastActivityAt - b.lastActivityAt
    );
    conversationCreatedBefore = sortedConversations[0]?.lastActivityAt;
    loadMoreConversations =
      (conversations.data["*elements"]?.length ?? 0) === 20;
    conversationsAccumulator.push(...sortedConversations);

    // TODO: Fix properly based on LinkedIn API's rate limit
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(
    "🚀 ~ file: popup.js:122 ~ syncMessages ~ conversationsAccumulator",
    conversationsAccumulator
  );
 await sendWebhook(WEBHOOK_EVENTS.CONVERSATIONS_SYNCED, {
    linkedInClient,
    userProfile,
    conversations: conversationsAccumulator,
  });
}

function parseConversations(includedConversations) {
  return includedConversations
    .filter(
      (includedItem) =>
        includedItem["$type"] === LINKEDIN_ENTITY_TYPES.CONVERSATION
    )
    .map((conversation) => {
      const {
        entityUrn,
        lastActivityAt,
        lastReadAt,
        archived,
        blocked,
        muted,
        read,
        starred,
        totalEventCount,
      } = conversation;
      const participants =
        conversation["*participants"]?.map((participant) => {
          const member = includedConversations.find(
            (includedItem) => includedItem.entityUrn === participant
          );
          const memberProfile = includedConversations.find(
            (includedItem) => includedItem.entityUrn === member["*miniProfile"]
          );

          return parseUserProfile(member, memberProfile);
        }) ?? [];
      return {
        id: conversation.entityUrn.split(":").pop(),
        entityUrn,
        lastActivityAt,
        lastReadAt,
        archived,
        blocked,
        muted,
        read,
        starred,
        totalEventsCount: totalEventCount,
        participants,
      };
    });
}

function parseMessages(includedEvents) {
  return includedEvents
    .filter(
      (includedItem) => includedItem["$type"] === LINKEDIN_ENTITY_TYPES.EVENT
    )
    .map((conversationEvent) => {
      const { createdAt, entityUrn, subtype, eventContent } = conversationEvent;
      const member = includedEvents.find(
        (includedItem) => includedItem.entityUrn === conversationEvent["*from"]
      );
      const memberProfile = includedEvents.find(
        (includedItem) => includedItem.entityUrn === member["*miniProfile"]
      );
      return {
        createdAt,
        entityUrn,
        subtype,
        content: {
          text: eventContent.attributedBody?.text,
          subject: eventContent?.subject,
          attachments: eventContent?.attachments,
        },
        sender: parseUserProfile(member, memberProfile),
      };
    });
}

function parseUserProfile(member, memberProfile) {
  return {
    initials: member?.nameInitials,
    firstName: memberProfile?.firstName,
    lastName: memberProfile?.lastName,
    entityUrn: memberProfile?.entityUrn,
    occupation: memberProfile?.occupation,
    publicIdentifier: memberProfile?.publicIdentifier,
    profilePicture:
      (memberProfile?.picture?.rootUrl ?? "") +
      ((
        memberProfile?.picture?.artifacts?.[2] ??
        memberProfile?.picture?.artifacts?.[0]
      )?.fileIdentifyingUrlPathSegment ?? ""),
    backgroundImage:
      (memberProfile?.backgroundImage?.rootUrl ?? "") +
      ((
        memberProfile?.backgroundImage?.artifacts?.[1] ??
        memberProfile?.backgroundImage?.artifacts?.[0]
      )?.fileIdentifyingUrlPathSegment ?? ""),
  };
}

async function getAuthCookies() {
  const jsessionID = await chrome.cookies.get({
    url: `${config.LINKEDIN_URL}/*`,
    name: "JSESSIONID",
  });
  const li_at = await chrome.cookies.get({
    url: `${config.LINKEDIN_URL}/*`,
    name: "li_at",
  });
  const li_a = await chrome.cookies.get({
    url: `${config.LINKEDIN_URL}/*`,
    name: "li_a",
  });

  if (!jsessionID) {
    console.error("No JSESSIONID cookie found");
    return;
  }

  if (!li_at) {
    console.error("No li_at cookie found");
    return;
  }

  if (!li_a) {
    console.log("User does not have Sales Navigator");
  }

  return {
    jsessionID: jsessionID.value.replace(/(^"|"$)/g, ""),
    liAt: li_at.value
    // liA: li_a.value,
  };
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
  baseUrl = config.LINKEDIN_API_BASE_URL;
  commonHeaders = {
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
  };

  constructor(token) {
    this.token = token;
    this.commonHeaders = {
      ...this.commonHeaders,
      "csrf-token": this.token,
    };
  }

  async getProfileDetails() {
    return fetch(`${this.baseUrl}/identity/profiles/me`, {
      method: "GET",
      headers: this.commonHeaders,
    }).then((response) => response.json());
  }

  async getUserNetworkInfo(profileID) {
    return fetch(`${this.baseUrl}/identity/profiles/${profileID}/networkinfo`, {
      method: "GET",
      headers: this.commonHeaders,
    }).then((response) => response.json());
  }

  async getUserProfile() {
    return fetch(`${this.baseUrl}/me`, {
      method: "GET",
      headers: this.commonHeaders,
    }).then((response) => response.json());
  }

  async getProfileContactInfo(publicIdentifier) {
    return fetch(
      `${this.baseUrl}/identity/profiles/${publicIdentifier}/profileContactInfo`,
      {
        method: "GET",
        headers: {
          ...this.commonHeaders,
          accept: "application/vnd.linkedin.normalized+json+2.1",
        },
      }
    ).then((response) => response.json());
  }

  async getUserData(conversationId, createdBefore) {
    return fetch(
      `${this.baseUrl}/messaging/conversations/${conversationId}/events?${
        createdBefore ? `createdBefore=${createdBefore}` : ""
      }`,
      {
        method: "GET",
        headers: {
          ...this.commonHeaders,
          accept: "application/vnd.linkedin.normalized+json+2.1",
        },
      }
    ).then((response) => response.json());
  }

  async getUserEmailAddress(publicIdentifier) {
    return await fetch(
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

  async getConversationMessages(conversationId, createdBefore) {
    return await fetch(
      `${this.baseUrl}/messaging/conversations/${conversationId}/events?${
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

  async getUserConversations(createdBefore) {
    return fetch(
      ` ${this.baseUrl}/messaging/conversations?${
        createdBefore ? `createdBefore=${createdBefore}` : ""
      }`,
      {
        method: "GET",
        headers: {
          ...this.commonHeaders,
          accept: "application/vnd.linkedin.normalized+json+2.1",
        },
      }
    ).then((data) => data.json());
  }
}
