require('dotenv').config()
const axios = require('axios')
const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");

const sendResponse = (body = {}, statusCode = 400) => ({
    statusCode, body: JSON.stringify(body), headers: {
        "Access-Control-Allow-Origin": "*", // Required for CORS support to work
        "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
        "Access-Control-Allow-Headers": "*"
    }
});

exports.handler = async (event) => {
    try {
        const token = event?.headers?.token;

        const awsConfig = {
            region: process.env.AWS_REGION_CUSTOM,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_CUSTOM,
                secretAccessKey: process.env.AWS_SECRET_KEY_CUSTOM
            }
        };

        const cognitoDomain = process.env.COGNITO_DOMAIN;

        if (!token) return sendResponse({ message: 'UnAuthorized' }, 401)

        if (!event.body) return sendResponse({ message: 'Nothing to update here' }, 419)
        event.body = JSON.parse(event.body)

        const userInfoHeaders = { Authorization: "Bearer " + token };

        const { data: userData, status } = await axios.get(`${cognitoDomain}/oauth2/userInfo`, { headers: userInfoHeaders })

        if (status !== 200) {
            if (status === 401) return sendResponse({ message: 'Unauthorized' }, 401)
            return sendResponse({ message: 'Bad Request' }, 400)
        }

        const client = new DynamoDBClient(awsConfig);

        const getCommand = new GetItemCommand({
            TableName: process.env.USERDETAILS_COLLECTION,
            Key: {
                userId: { S: userData?.sub },
            },
        });

        const getUserData = await client.send(getCommand);
        if (!getUserData.Item) return sendResponse({ message: 'User not found' }, 400);

        const updateObj = {
            profilePicture: event?.body?.profilePicture
        }

        if (!updateObj) return sendResponse({ message: 'Nothing to update here' }, 419)
        const itemKeys = Object.keys(updateObj)

        const updateCommand = new UpdateItemCommand({
            TableName: process.env.USERDETAILS_COLLECTION,
            Key: {
                userId: { S: userData?.sub },
            },
            ReturnValues: 'ALL_NEW',
            UpdateExpression: `SET ${itemKeys.map((k, index) => `#field${index} = :value${index}`).join(', ')}`,
            ExpressionAttributeNames: itemKeys.reduce((accumulator, k, index) => ({ ...accumulator, [`#field${index}`]: k }), {}),
            ExpressionAttributeValues: marshall(itemKeys.reduce((accumulator, k, index) => ({ ...accumulator, [`:value${index}`]: updateObj[k] }), {})),
        })

        const updateClient = await client.send(updateCommand)
        if (!updateClient.Attributes) return sendResponse({ message: 'Something went wrong while updating data' }, 400)

        return sendResponse({ message: 'User Data fetched successfully', data: unmarshall(updateClient.Attributes) }, 200)

    } catch (error) {
        if (error?.response?.status) return sendResponse({ message: 'Unauthorized' }, 401)
        console.log({ error })
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
};
