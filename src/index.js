const AWS = require("aws-sdk");
const { v4: uuidv4 } = require('uuid');
const rekognition = new AWS.Rekognition();
const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const Bucket = event.Records[0].s3.bucket.name;
        const Name = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, " "));

        const params = {
            Image: {
                S3Object: {
                    Bucket,
                    Name
                }
            }
        };

        const celebrityData = await rekognition.recognizeCelebrities(params).promise();
        if (celebrityData.CelebrityFaces && celebrityData.CelebrityFaces.length) {

            const { Name, Urls, KnownGender, Face } = celebrityData.CelebrityFaces[0];
            const closelyMatchedEmotion = Face.Emotions.reduce((prev, current) => (prev.Confidence > current.Confidence) ? prev : current)

            const params = {
                TableName: process.env.DYNAMO_TABLE_NAME,
                Item: {
                    id: uuidv4(),
                    Name,
                    readMore: Urls,
                    KnownGender,
                    closelyMatchedEmotion
                },
                ConditionExpression: "attribute_not_exists(id)"
            };
            await dynamoDb.put(params).promise();
        }

    } catch (e) {
        console.log(e);
    }
};
