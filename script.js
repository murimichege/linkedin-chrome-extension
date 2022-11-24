
// Listener for runtime messages
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  switch (request.action) {
    case 'getTabs':
      getAllTabs(sendResponse)
      return true;

    case 'getCurrentTab':
      getCurrentTab(sendResponse)
      return true;

    case 'getAllCookies':
     getAllCookies(sendResponse)
      return true;

    case 'saveCookie':
      saveCookie(sendResponse)
      return true;
    case 'getCurrentLinkedInUser':
      getLoggedInUser(sendResponse);
      return true;
    case 'getConnectionCount':
      getConnectionCount(req.profileId, sendResponse);
      return true;
    case 'getMessageSentCount':
      getMessageSentCount(req.profileId, sendResponse);
      return true;
    case 'getUserFollowCount':
      getUserFollowCount(sendResponse);
      return true;
  }

})
  

async function getAllTabs(sendResponse) {
  await chrome.runtime.tabs.query({}, function (tabs) {
    sendResponse(tabs);
  });
}
async function getCurrentTab(sendResponse){
  chrome.runtime.tabs.query({ active: true, currentWindow: true }, function (tabInfo) {
    sendResponse(tabInfo);
  });
}
// gets all cookies from a linkedIn signedin user
async function getAllCookies(sendResponse){
  const getAllCookiesParams = {
    url: request.params.url
  };
  await chrome.runtime.cookies.getAll(getAllCookiesParams, sendResponse);
  
  
}



// find cookie for loggedin user
async function getauthCookie(){
 const authCookie=  chrome.cookies.get({
    url: 'https://www.linkedin.com',
    name: 'li_at',
  });
  if (authCookie && authCookie.value && authCookie.value.startsWith('"')) {
    console.log(authCookie)
    return authCookie.value.slice(1, -1);

  } else {
    return false;
  }
}


// Find the csrf token of the logged in linked in user
async function getCsrfToken() {
   const csrf = await chrome.cookies.get({
    url: 'https://www.linkedin.com',
    name: 'JSESSIONID',
  });
  if (csrf && csrf.value && csrf.value.startsWith('"')) {
    console.log(csrf)
    return csrf.value.slice(1, -1);

  } else {
    return false;
  }
}


//Get the info of the logged in user
async function fetchLinkedInUrl(
  url,
  withAcceptHeader = false,
  method = 'GET',
  body = null,
  params
) {
  try {
    if (body) body = JSON.stringify(body);
    const csrfToken = await getCsrfToken();
    const licookie = await getauthCookie()

    if (!csrfToken) {
      return false;
    }

    const headers = withAcceptHeader
      ? {
        'x-restli-protocol-version': '2.0.0',
        'csrf-token': csrfToken,
        'Cookie':licookie,
        'x-li-track':
          '{"clientVersion":"1.5.*","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
      }
      : {
        accept: 'application/vnd.linkedin.normalized+json+2.1',
        'x-restli-protocol-version': '2.0.0',
        'csrf-token': csrfToken,
        'Cookie':licookie,
        'x-li-track':
          '{"clientVersion":"1.5.*","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
      };

    if (params) {
      let paramStr = '';
      Object.keys(params).forEach(
        (cur) => (paramStr += `${cur}=${params[cur]}&`)
      );

      url += `?${paramStr}`;
    }

    // console.log(url);

    const res = await fetch(url, {
      method: method,
      headers: headers,
      body,
      credentials: 'include',
    });

    // console.log(res);
    const text = await res.text();
    // console.log(text);
    const data = JSON.parse(text);
    console.log(data);
    return data;
  } catch (e) {
    console.log(e);
  }
}


async function getLoggedInUser(sendResponse) {
  try {
    const resp = await fetchLinkedInUrl(
      'https://www.linkedin.com/voyager/api/identity/profiles/me',
      true
    );
    console.log(resp.firstName)

    if (!resp) {
      if (sendResponse) {
        sendNotLoggedInResponse(sendResponse);
      }
      return resp;
    }

    const result = {
      firstName: resp.firstName,
      lastName: resp.lastName,

    };

    if (sendResponse) {
      sendResponse({ linkedInUser: result });
      console.log(result.firstName)
    }

    return result;
  } catch (e) {
    console.log(e);
  }
}

async function getConnectionCount({ profileId, sendResponse }) {
  try {
    const resp = await fetchLinkedInUrl(
      `https://www.linkedin.com/voyager/api/identity/profiles/${profileId}/networkinfo`,
      true
    );

    if (!resp) {
      if (sendResponse) {
        sendNotLoggedInResponse(sendResponse);
      }
      return resp;
    }
    const result = {
      connectionsCount: resp.connectionsCount,

    };

    console.log(result)

    if (sendResponse) {
      sendResponse({ linkedInUser: result });
    }
    document.getElementById("followcount").innerHTML = result.connectionsCount

    return result;

  } catch (e) {
    console.log(e);
  }

}

async function getMessageSentCount({ sendResponse, profileId }) {
  try {
    const resp = await fetchLinkedInUrl(
      `https://www.linkedin.com/voyager/api/identity/profiles/${profileId}/networkinfo`,
      true
    );
    console.log(resp)

    if (!resp) {
      if (sendResponse) {
        sendNotLoggedInResponse(sendResponse);
      }
      return resp;
    }
    const result = {
      followersCount: resp.followersCount,

    };

    if (sendResponse) {
      sendResponse({ linkedInUser: result });
      document.getElementById("connectioncount").innerHTML = JSON.stringify(result.followersCount)
    }

    return result;

  } catch (e) {
    console.log(e);
  }

}

async function getUserFollowCount(sendResponse) {
  try {
    const resp = await fetchLinkedInUrl(
      'https://www.linkedin.com//voyager/api/identity/profiles/ACoAAAC2eqYB5Eg-JCzGJxAmnBCGS72UBnYyaA8/networkinfo',
      true
    );

    if (!resp) {
      if (sendResponse) {
        sendNotLoggedInResponse(sendResponse);
      }
      return resp;
    }
    const result = {
      followersCount: resp.followersCount,

    };

    if (sendResponse) {
      sendResponse({ linkedInUser: result });
      document.getElementById("followcount").innerHTML = JSON.stringify(result.followersCount)
    }

    return result;

  } catch (e) {
    console.log(e);
  }

}