document.addEventListener('DOMContentLoaded', function () {
  


  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    switch (request.action) {
     case 'getCurrentLinkedInUser':
        getLoggedInUser(sendResponse);
        return true;

      case 'getConnectionCount':
        getConnectionCount( sendResponse);
        return true;
      case 'getMessageSentCount':
        getMessageSentCount( sendResponse);

        return true;
      case 'getUserFollowCount':
        getUserFollowCount(sendResponse);
        return true;
    }

  })
  
  
  // Find the csrf token of the logged in linked in user
  async function getCsrfToken() {
    const csrf = await chrome.cookies.get({
      url: 'https://www.linkedin.com',
      name: 'JSESSIONID',
      
    });
    alert(csrf)


    if (csrf && csrf.value && csrf.value.startsWith('"')) {
      
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
          accept: 'application/json',
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
  
      
      const res = await fetch(url, {
        method: method,
        headers: headers,
        body,
        credentials: 'include',
      });
  


      // console.log(res);
      const text = await res.json();
      // console.log(text);
      const data = JSON.parse(text);
      console.log(data);
      return data;
    } catch (e) {
      console.log(e);
    }
  }
  
  
  const chartdata = []
  // get number of connections using the currently loggedin user
  async function getConnectionCount(sendResponse) {
    // get the profile id first
    try {
      const response = await fetchLinkedInUrl(
        'https://www.linkedin.com/voyager/api/identity/profiles/me',
        true
      );
  
      if (!response) {
        if (sendResponse) {
          sendNotLoggedInResponse(sendResponse);
        }
        return resp;
      }
  
      const profile = {
        profileId:
          resp.entityUrn &&
          resp.entityUrn
            .replace('urn:li:fsd_profile:', '')
            .replace('urn:li:fs_profile:', ''),
      };
    
      const resp = await fetchLinkedInUrl(
        `https://www.linkedin.com/voyager/api/identity/profiles/${profile}/networkinfo`,
        true
      );
  
      if (!resp) {
        if (sendResponse) {
          sendNotLoggedInResponse(sendResponse);
        }
        return resp;
      }
      let result = {
        connectionsCount: resp.connectionsCount,
  
      };
  
      console.log(result)
      result.push(chartdata)
      alert(chartdata)
      document.getElementById("connectioncount").innerHTML = result
  
      if (sendResponse) {
        sendResponse({ linkedInUser: result });
      }
  
      return result;
  
    } catch (e) {
      console.log(e);
    }
  
  }
  
  // get number of messages sent by the currently loggedin user. 
  async function getMessageSentCount(sendResponse) {
    
    try {
     
      const resp = await fetchLinkedInUrl(
        `https://www.linkedin.com/voyager/api/messaging/conversations`,
        true
      );
      console.log(resp)
  
      if (!resp) {
        if (sendResponse) {
          sendNotLoggedInResponse(sendResponse);
        }
        return resp;
      }
      let result = {
        messagecount: resp.totalEventCount,
  
      };
      result.push(chartdata)
      document.getElementById("messagecount").innerHTML = result
  
      if (sendResponse) {
        sendResponse({ linkedInUser: result });
      }
  
      return result;
  
    } catch (e) {
      console.log(e);
    }
  
  }
  // get number of users following 
  async function getUserFollowCount(sendResponse) {
    try {
      let profile ={
        profileId:
        resp.entityUrn &&
        resp.entityUrn
          .replace('urn:li:fsd_profile:', '')
          .replace('urn:li:fs_profile:', ''),
       } 
      const resp = await fetchLinkedInUrl(
        `https://www.linkedin.com/voyager/api/identity/profiles/${profile}/networkinfo`,
        true
      );
  
      if (!resp) {
        if (sendResponse) {
          sendNotLoggedInResponse(sendResponse);
        }
        return resp;
      }
      let result = {
        followersCount: resp.followersCount,
  
      };
      result.followersCount.push(chartdata)
  alert(chartdata)
      if (sendResponse) {
        sendResponse({ linkedInUser: result });
        document.getElementById("followcount").innerHTML = result
      }
      return result;
  
    } catch (e) {
      console.log(e);
    }
  
  }
  
  const ctx = document.getElementById('myChart');

  new Chart(ctx, {
      type: 'bar',
      data: {
          labels: ['Connections', 'Messages', 'Followers'],
          datasets: [{
              label: 'User Info',
              data: chartdata,
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: true
              }
          }
      }
  });
});
  
  