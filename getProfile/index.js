require('dotenv').config()
const axios = require('axios')
const { PutItemCommand, DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const sendResponse = (body = {}, statusCode = 400) => ({
    statusCode, body: JSON.stringify(body), headers: {
        "Access-Control-Allow-Origin": "*", // Required for CORS support to work
        "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
        "Access-Control-Allow-Headers": "*"
    }
})

exports.handler = async (event) => {
    try {
        let token = '';
        let idToken = '';

        const awsConfig = {
            region: process.env.AWS_REGION_CUSTOM,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_CUSTOM,
                secretAccessKey: process.env.AWS_SECRET_KEY_CUSTOM
            }
        };

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
            if (res.status !== 200) {
                return sendResponse({ message: 'Something went wrong!!!' }, res.status)
            }

            token = res?.data?.access_token;
            idToken = res?.data?.id_token;
        } else return sendResponse({ message: 'UnAuthorized, token or code missing' }, 401)

        const userInfoHeaders = {
            Authorization: "Bearer " + token,
        };

        const { data: userData } = await axios.get(`${cognitoDomain}/oauth2/userInfo`, { headers: userInfoHeaders });

        const client = new DynamoDBClient(awsConfig);

        const getCommand = new GetItemCommand({
            TableName: process.env.USERDETAILS_COLLECTION,
            Key: {
                userId: { S: userData?.sub }
            },
        });

        let getUserData = await client.send(getCommand).catch((error) => console.log('No User Found'));

        if (!getUserData?.Item) {
            const putCommand = new PutItemCommand({
                TableName: process.env.USERDETAILS_COLLECTION,
                Item: {
                    userId: { S: userData.sub },
                    userName: { S: userData.username },
                    email_verified: { BOOL: userData?.email_verified || true },
                    email: { S: userData.email },
                    createdAt: { N: `${+new Date(new Date().toUTCString())}` }
                },
            });

            const insertUserData = await client.send(putCommand);
            if (!insertUserData.$metadata) return sendResponse({ message: 'Something went wrong while fetching user data' }, 400)
            getUserData = await client.send(getCommand);
        }
        getUserData.Item = unmarshall(getUserData.Item);

        if (event?.queryStringParameters?.code) getUserData.Item.token = token
        if (event?.queryStringParameters?.code) getUserData.Item.idToken = idToken

        return sendResponse({ data: getUserData.Item, message: 'User Data fetched successfully' }, 200)
    } catch (error) {
        console.log(error)
        if (error?.response?.status) return sendResponse({ message: 'Unauthorized' }, 401)
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
};
