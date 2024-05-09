require('dotenv').config()
const axios = require('axios')
const sendResponse = (body = {}, statusCode = 400) => ({ statusCode, body: JSON.stringify(body) })

exports.handler = async (event) => {
    try {
        let token = '';

        const clientID = process.env.CLIENT_ID;
        const clientSecret = process.env.CLIENT_SECRET;
        const cognitoDomain = process.env.COGNITO_DOMAIN;
        if (event?.headers?.token) token = event?.headers?.token
        else if (event?.queryStringParameters?.code) {
            const code = event?.queryStringParameters?.code

            const credentials = `${clientID}:${clientSecret}`;
            const base64Credentials = Buffer.from(credentials).toString("base64");
            const basicAuthorization = `Basic ${base64Credentials}`;

            const headers = {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: basicAuthorization,
            };

            const data = new URLSearchParams();
            data.append("grant_type", "authorization_code");
            data.append("client_id", clientID);
            data.append("code", code);
            data.append("redirect_uri", process.env.REDIRECT_URI);

            const res = await axios.post(`${cognitoDomain}/oauth2/token`, data, { headers })
            if (res.status != 200) return sendResponse({ message: 'Something went wrong!!!' }, res.status)

            token = res?.data?.access_token;
        } else return sendResponse({ message: 'UnAuthorized, token or code missing' }, 401)

        const userInfoHeaders = {
            Authorization: "Bearer " + token,
        };

        const { data: userData } = await axios.get(`${cognitoDomain}/oauth2/userInfo`, { headers: userInfoHeaders });

        if (event?.queryStringParameters?.code) userData.token = token
        return sendResponse({ data: userData, message: 'Admin Data fetched successfully' }, 200)
    } catch (error) {
        console.log({ error })
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
};
