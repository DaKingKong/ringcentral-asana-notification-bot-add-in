const axios = require('axios');
const multipartParser = require('parse-multipart-data');

const getUserInfo = async (userId, accessToken) => {
    const response = await axios.get(`${process.env.RINGCENTRAL_SERVER}/restapi/v1.0/glip/persons/${userId}`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        }
    });

    return response.data;
}

// Note: max number of persons for this API call is 30
const getBulkUserInfo = async (userIds, accessToken) => {
    const userIdsMatrix = listToMatrix(userIds, 30);
    const bulkUserInfo = []
    for(const userIdsArray of userIdsMatrix){
        const response = await axios.get(`${process.env.RINGCENTRAL_SERVER}/restapi/v1.0/glip/persons/${userIdsArray.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'Accept': 'multipart/form-data'
            }
        });
    
        const boundary = response.headers['content-type'].split('boundary=')[1];
        const parts = multipartParser.parse(Buffer.from(response.data), boundary);
        for (const p of parts) {
            const userInfo = JSON.parse(p.data.toString());
            // userInfo.response is the leading info in list which has response codes only
            if(userInfo.response || userInfo.error)
            {
                continue;
            }
    
            bulkUserInfo.push(userInfo);
        }
    }

    return bulkUserInfo;
}

const getGroupInfo = async (groupId, accessToken) => {
    const response = await axios.get(`${process.env.RINGCENTRAL_SERVER}/restapi/v1.0/glip/groups/${groupId}`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        }
    });

    return response.data;
}

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

function listToMatrix(list, elementsPerSubArray) {
    var matrix = [], i, k;

    for (i = 0, k = -1; i < list.length; i++) {
        if (i % elementsPerSubArray === 0) {
            k++;
            matrix[k] = [];
        }

        matrix[k].push(list[i]);
    }

    return matrix;
}

exports.getUserInfo = getUserInfo;
exports.getBulkUserInfo = getBulkUserInfo;
exports.getGroupInfo = getGroupInfo;
exports.createConversation = createConversation;