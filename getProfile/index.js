require('dotenv').config()
const axios = require('axios')
const { PutItemCommand, DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const sendResponse = (body = {}, statusCode = 400) => ({ statusCode, body: JSON.stringify(body) })

exports.handler = async (event) => {
    try {
        let token = '';

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
            data.append("redirect_uri", "http://localhost:5173/");

            const res = await axios.post(`${cognitoDomain}/oauth2/token`, data, { headers })
            if (res.status != 200) {
                return sendResponse({ message: 'Something went wrong!!!' }, res.status)
            }

            token = res?.data?.access_token;
        } else return sendResponse({ message: 'UnAuthorized, token or code missing' }, 401)

        const userInfoHeaders = {
            Authorization: "Bearer " + token,
        };

        const { data: userData } = await axios.get(`${cognitoDomain}/oauth2/userInfo`, { headers: userInfoHeaders });

        const client = new DynamoDBClient(awsConfig);

        const getCommand = new GetItemCommand({
            TableName: process.env.USERDETAILS_COLLECTION,
            Key: {
                userId: { S: userData?.sub },
            },
        });

        let getUserData = await client.send(getCommand);

        if (!getUserData.Item) {
            const putCommand = new PutItemCommand({
                TableName: process.env.USERDETAILS_COLLECTION,
                Item: unmarshall(userData)
            });

            const insertUserData = await client.send(putCommand);
            if (!insertUserData.$metadata) return sendResponse({ message: 'Something went wrong while fetching user data' }, 400)
            getUserData = await client.send(getCommand);
        }
        getUserData.Item = unmarshall(getUserData.Item)

        if (event?.queryStringParameters?.code) getUserData.Item.token = token
        return sendResponse({ data: getUserData.Item, message: 'User Data fetched successfully' }, 200)
    } catch (error) {
        console.log({ error })
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
};

(async (event) => {
    try {
        let token = '';

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
            data.append("redirect_uri", "http://localhost:5173/");

            const res = await axios.post(`${cognitoDomain}/oauth2/token`, data, { headers })
            if (res.status !== 200) {
                return sendResponse({ message: 'Something went wrong!!!' }, res.status)
            }

            token = res?.data?.access_token;
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
        return sendResponse({ data: getUserData.Item, message: 'User Data fetched successfully' }, 200)
    } catch (error) {
        console.log(error)
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
})({ headers: { token: 'eyJraWQiOiJQNHBJTzFiMVZJZlNJbW1iRzk4cXhMQWRLTVhleG1cL0JHV3JYeFV1TzNQbz0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiI0MTAzOGRkYS01MGQxLTcwNTMtZjdjNC0wMTE0ZjQzODExZmUiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGgtMS5hbWF6b25hd3MuY29tXC9hcC1zb3V0aC0xX0pWa04xYnF1TSIsInZlcnNpb24iOjIsImNsaWVudF9pZCI6InA2azVjcGVqMHIwcmxiMzA5bWE0a3IxY3EiLCJvcmlnaW5fanRpIjoiYzYyNmVlNDItMTU5Zi00MDliLTkzYzctOGM0ZTMyODAxZDU5IiwidG9rZW5fdXNlIjoiYWNjZXNzIiwic2NvcGUiOiJwaG9uZSBvcGVuaWQgZW1haWwiLCJhdXRoX3RpbWUiOjE3MTUyNjU3NjcsImV4cCI6MTcxNTI2OTM2NywiaWF0IjoxNzE1MjY1NzY3LCJqdGkiOiI4NWYwMDRjMi01Y2RmLTQ0ZDQtODUzZC00ZTdhZGVlOWMwMWEiLCJ1c2VybmFtZSI6ImJyaWplc2hfMTExNiJ9.QZw8bms_W3dEg14U5q77L0yqLJRmAPSxJqaEsD61_sctlM4ZcN_6Va2_TFVoF0uBvgp2Z8swaU5QcBtDgmB7t3BRBvwK8MBNsJKyvj7ieduUCF1UMkvMh-WJDUhkNsWBES7B5TXcb_p8M1rKwiCWnjxLyEAgk-eh9D4yVqGMA5LM1sNvRZS4Lv88ST3BJ0ZjLkJyegrfOCewUduNGqn4v6p141qRP56CRhXrSdKkfA58LSB4uCYxZ-wMOuQgHyi4fOCMQqqY-Sx24_kznYLUsqWzbJliKOENRBJygtqgxxGd9q8ZU8O7IVOUdgQMK_RUfO6-gBy1XkbKoqvZfYx0zg' } })
