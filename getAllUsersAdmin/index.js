require('dotenv').config()
const axios = require('axios')
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require("@aws-sdk/util-dynamodb");

const sendResponse = (body = {}, statusCode = 400) => ({ statusCode, body: JSON.stringify(body) })

exports.handler = async (event) => {
    try {
        const token = event?.headers?.token
        if (!token) return sendResponse({ message: 'UnAuthorized, token or code missing' }, 401)
        let Limit = 10

        const awsConfig = {
            region: process.env.AWS_REGION_CUSTOM,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_CUSTOM,
                secretAccessKey: process.env.AWS_SECRET_KEY_CUSTOM
            }
        };

        if (event?.queryStringParameters?.limit) Limit = +event?.queryStringParameters?.limit;

        const cognitoDomain = process.env.COGNITO_DOMAIN;

        const userInfoHeaders = {
            Authorization: "Bearer " + token,
        };

        const { status } = await axios.get(`${cognitoDomain}/oauth2/userInfo`, { headers: userInfoHeaders });
        if (status !== 200) return sendResponse({ message: 'Something went wrong!!!' }, status);

        const client = new DynamoDBClient(awsConfig);

        const inputCommand = {
            TableName: process.env.USERDETAILS_COLLECTION,
            Limit
        };
        if (event?.queryStringParameters?.nextToken) {
            inputCommand.ExclusiveStartKey = {
                userId: {
                    S: event?.queryStringParameters?.nextToken
                }
            }
        }

        const command = new ScanCommand(inputCommand);

        const response = await client.send(command);

        return sendResponse({ data: { result: response.Items.map((ele) => unmarshall(ele)), total: response.Count, nextToken: response?.LastEvaluatedKey?.userId?.S }, message: 'User Data fetched successfully' }, 200)
    } catch (error) {
        console.log(error);
        return sendResponse({ message: 'Internal Server Error' }, 500)
    }
};
