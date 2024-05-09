require('dotenv').config()
const axios = require('axios')
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");

const sendResponse = (body = {}, statusCode = 400) => ({ statusCode, body: JSON.stringify(body) })

exports.handler = async (event) => {
    try {
        const token = event?.headers?.token
        if (!token) return sendResponse({ message: 'UnAuthorized, token or code missing' }, 401)

        const awsConfig = {
            region: process.env.AWS_REGION_CUSTOM,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_CUSTOM,
                secretAccessKey: process.env.AWS_SECRET_KEY_CUSTOM
            }
        };

        const cognitoDomain = process.env.COGNITO_DOMAIN;

        const userInfoHeaders = {
            Authorization: "Bearer " + token,
        };

        const { status } = await axios.get(`${cognitoDomain}/oauth2/userInfo`, { headers: userInfoHeaders });
        if (status != 200) return sendResponse({ message: 'Something went wrong!!!' }, res.status);

        const client = new CognitoIdentityProviderClient(awsConfig);

        const getUsersCommand = new ListUsersCommand({
            UserPoolId: process.env.USER_POOL_ID,
        });

        const getUserData = await client.send(getUsersCommand);


        return sendResponse({ data: getUserData, message: 'User Data fetched successfully' }, 200)
    } catch (error) {
        console.log({ error })
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
};

(async (event) => {
    try {
        const token = event?.headers?.token
        if (!token) return sendResponse({ message: 'UnAuthorized, token or code missing' }, 401)

        const awsConfig = {
            region: process.env.AWS_REGION_CUSTOM,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_CUSTOM,
                secretAccessKey: process.env.AWS_SECRET_KEY_CUSTOM
            }
        };

        const cognitoDomain = process.env.COGNITO_DOMAIN;

        const userInfoHeaders = {
            Authorization: "Bearer " + token,
        };

        const { status } = await axios.get(`${cognitoDomain}/oauth2/userInfo`, { headers: userInfoHeaders });
        if (status != 200) return sendResponse({ message: 'Something went wrong!!!' }, status);

        const client = new DynamoDBClient(awsConfig);

        const inputCommand = {
            TableName: process.env.USERDETAILS_COLLECTION,
            Limit: 1,
            ExclusiveStartKey: {
                userId: {
                    S: '41038dda-50d1-7053-f7c4-0114f43811fe'
                }
            }
        };

        const command = new ScanCommand(inputCommand);

        const response = await client.send(command);

        return sendResponse({ data: response, message: 'User Data fetched successfully' }, 200)
    } catch (error) {
        console.log(error);
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
})({ headers: { token: 'eyJraWQiOiJoYmVRZ3krMjZyK3RFdWdoQVZQbXl1SHhrZFwvaHAzVlh1NXllNHZ2SkZaUT0iLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJjMWEzNGQxYS03MGUxLTcwYzAtYmYyMC1jNjk2ZjZmMGViNWIiLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtc291dGgtMS5hbWF6b25hd3MuY29tXC9hcC1zb3V0aC0xX2xQNk5XQWlEayIsInZlcnNpb24iOjIsImNsaWVudF9pZCI6IjIzNWRxNTc0MTFra2gzamtiYWg4NG52aWZrIiwib3JpZ2luX2p0aSI6IjkwMTg5ZGNiLTVmMmQtNDVkOS1iYTI1LWNhNDc2Y2M3NTMwYSIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoicGhvbmUgb3BlbmlkIGVtYWlsIiwiYXV0aF90aW1lIjoxNzE1MjYwMjM5LCJleHAiOjE3MTUyNjM4MzksImlhdCI6MTcxNTI2MDIzOSwianRpIjoiZDljZmFmY2ItZjUyMi00MjdhLTliNjQtYjkzODMwNWM1ZmFiIiwidXNlcm5hbWUiOiJjMWEzNGQxYS03MGUxLTcwYzAtYmYyMC1jNjk2ZjZmMGViNWIifQ.AgzlQwneVz7jKuKb2VxmCUU4r61JJdtUgYO7b-EITLW1FDWYBZal4oDBmxQwqL-ZDtCdkAbnDDorllB9Lo2tgjO8DjEWubbfCqw7Gm2KlY3nOWX2smt87FgfqP2NQBoPgHx1WTKS29AZzRPjHnAu8bSWjA9zvbVnQZa5tqKumyYGrxPd_vIU-mV9NzYqCsN5f05JCHoWg0r0cA3D2p4FsraXr_PaoO9bKa69bCqbYXouVDa0ucW59jX5G8SCbF34QCESm3shFvymdm9VIP3N39GCHgkcDZUr8FSW2gFlUf7irvSWuN0Ac4mVFUu07GvX7451-zxsBzTxOWmLSPfx9A' } })
