require('dotenv').config()
const axios = require('axios')
const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall, marshall } = require("@aws-sdk/util-dynamodb");

const sendResponse = (body = {}, statusCode = 400) => ({ statusCode, body: JSON.stringify(body) });

const schema = {
    userName: { type: 'string' },
    name: { type: 'string' },
    height: { type: 'number' },
    gender: { type: 'enum', enum: ['m', 'f', 'o'] },
    dob: { type: 'string' }
};

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

        const updateObj = {}

        if (Object.keys(event.body).length) {
            const objectKeysSchema = Object.keys(schema)
            Object.keys(event.body).forEach((ele) => {
                if (objectKeysSchema.includes(ele)) {
                    if (schema[ele]?.type === 'enum' && !schema[ele]?.enum?.includes(event.body[ele])) event.body[ele] = '';
                    updateObj[ele] = event?.body[ele]
                }
            })
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
        console.log({ error })
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
};

