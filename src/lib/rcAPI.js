const axios = require('axios');

const createConversation = async (userIds, accessToken) => {
    const members = userIds.map(function (id) { return { id } });
    const postBody = {
        members
    };
    const response = await axios.post(`${process.env.RINGCENTRAL_SERVER}/restapi/v1.0/glip/conversations`,
        postBody,
        {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            }
        });

    return response.data;
}

exports.createConversation = createConversation;