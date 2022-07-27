const ClientOAuth2 = require('client-oauth2');
const axios = require('axios');

// oauthApp strategy is default to 'code' which use credentials to get accessCode, then exchange for accessToken and refreshToken.
// To change to other strategies, please refer to: https://github.com/mulesoft-labs/js-client-oauth2
const oauthApp = new ClientOAuth2({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    accessTokenUri: process.env.ACCESS_TOKEN_URI,
    authorizationUri: process.env.AUTHORIZATION_URI,
    redirectUri: `${process.env.RINGCENTRAL_CHATBOT_SERVER}/oauth-callback`,
    scopes: process.env.SCOPES.split(process.env.SCOPES_SEPARATOR)
});

function getOAuthApp() {
    return oauthApp;
}

async function checkAndRefreshAccessToken(asanaUser) {
    const dateNow = new Date();
    if (asanaUser && asanaUser.refreshToken && (asanaUser.tokenExpiredAt < dateNow || !asanaUser.accessToken)) {
        console.log(`refreshing token...revoking ${asanaUser.accessToken}`);
        const token = oauthApp.createToken(asanaUser.accessToken, asanaUser.refreshToken);
        const { accessToken, refreshToken, expires } = await token.refresh();
        console.log(`refreshing token...updating new token: ${asanaUser.accessToken}`);
        await asanaUser.update(
            {
                accessToken,
                refreshToken,
                tokenExpiredAt: expires,
            }
        );
    }
}

async function revokeToken(asanaUser){
    await checkAndRefreshAccessToken(asanaUser);
    await axios.post(
        `https://app.asana.com/-/oauth_revoke?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&token=${asanaUser.refreshToken}`
    );
}

exports.getOAuthApp = getOAuthApp;
exports.checkAndRefreshAccessToken = checkAndRefreshAccessToken;
exports.revokeToken = revokeToken;