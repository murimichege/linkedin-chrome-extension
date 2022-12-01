
chrome.tabs.onActivated.addListener((tab) => {


  // get the url
  chrome.tabs.get(tab.tabId, async (currentTabData) => {


      // check if ut a linked in url
      if (currentTabData.url && currentTabData.url.includes("linkedin.com")) {


          // this returns a promise name: 'li_at',

          // JSESSIONID
          let jsessionID = await chrome.cookies.get({
              url: 'https://www.linkedin.com/*',
              name: "JSESSIONID",

          })

          // console.log("ss", jsessionID.value.replace(/(^"|"$)/g, ''));

          // LI_AT
          let li_at = await chrome.cookies.get({
              url: 'https://www.linkedin.com/*',
              name: "li_at",
          })

          // console.log(li_at.value);

          // get current logged in user details
          const profileDetails = await fetch(
              "https://www.linkedin.com/voyager/api/identity/profiles/me",
              {
                  method: "GET",
                  headers: {
                      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
                      "csrf-token": jsessionID.value.replace(/(^"|"$)/g, '')
                  }
              }

          ).then(response => response.json())
              .then(json => json)

          // console.log("profileDetails", profileDetails)

          // get entityUrn obj
          const { entityUrn } = profileDetails

          // profile id
          let profileID = entityUrn.split(":")[3]


          // get the number of users following
          const userNetworkInfo = await fetch(
              `https://www.linkedin.com/voyager/api/identity/profiles/${profileID}/networkinfo`,
              {
                  method: "GET",
                  headers: {
                      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
                      "csrf-token": jsessionID.value.replace(/(^"|"$)/g, '')
                  }
              }
          ).then(response => response.json())
              .then(json => json)


          //  number of connections for the user
          const { connectionsCount } = userNetworkInfo

          // number of followers 
          const { followersCount } = userNetworkInfo

          console.log("connections Count", connectionsCount)
          console.log("followers Count", followersCount)


          // number of messages that the logged in user has sent
          const userSentMessages = await fetch(
              `https://www.linkedin.com/voyager/api/messaging/conversations`,
              {
                  method: "GET",
                  headers: {
                      // "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36",
                      "csrf-token": jsessionID.value.replace(/(^"|"$)/g, '')
                  }
              }

          ).then(response => {
              
              return response.json()
          })
              .then(json => json)



          const metrics = {
              connections: connectionsCount,
              messages: userSentMessages.paging.count,
              followers: followersCount
          }

          console.log("metrics", metrics)

// wait for tab to fully load
        chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {          
            if (changeInfo.status == 'complete') {   
                         // sendMessage
          chrome.tabs.query({currentWindow:true, active:true},(tabs) => {
            chrome.tabs.sendMessage(tabs[0]?.id,{metrics:metrics},(response) => {
                console.log(response)
            })
        })
            }
         });

      }
  })
})

