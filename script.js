
/**
 * @desc LISTENER - handles the install and update of the extension
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Details : ', details);
  if (details.reason === 'install') {
    // set state in chrome storage to current cookie
 
    chrome.storage.sync.set({ })
  } else if (details.reason === 'update') {
    // JUST FOR DEVELOPMENT *******************************************
    console.log('Update');

  }
});
// Listener for runtime messages
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  switch (req.action) {
   
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
});




/**
 * @desc 
 * @return {promise} => user is logged in ? csrfToken : undefined
 * @error if user is not logged in
 */


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

// -----------------

/**
 * @desc 
 * @param {string} url - fetch link
 * @param {boolean} withAcceptHeader - To use accept header or not
 * @param {string} [method = 'GET'] - Method of the fetch request
 * @param {object} [body = null] - body of the fetch request
 * @return {promise} => user is logged in ? userInfo : undefined
 */
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

    if (!csrfToken) {
      return false;
    }

    const headers = withAcceptHeader
      ? {
          'x-restli-protocol-version': '2.0.0',
          'csrf-token': csrfToken,
          'x-li-track':
            '{"clientVersion":"1.5.*","osName":"web","timezoneOffset":1,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
        }
      : {
          accept: 'application/vnd.linkedin.normalized+json+2.1',
          'x-restli-protocol-version': '2.0.0',
          'csrf-token': csrfToken,
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
    // console.log(data);
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
// -----------------

/**
 * @desc Get contact info of a profile
 * @param {String} [profileId]
 * @return {Object} number of connections to this user. 
 */
async function getConnectionCount({profileId, sendResponse}) {
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
      connectionsCount:resp.connectionsCount,
     
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

async function getMessageSentCount({sendResponse,profileId}) {
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
      followersCount:resp.followersCount,
     
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
      followersCount:resp.followersCount,
     
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