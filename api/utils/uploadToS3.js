const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3');
const bucket = process.env.BUCKET_NAME;
const fs = require('fs');

const uploadToS3 = async (path,originalFileName,mimetype) => {
    const requiredConfig = ['BUCKET_NAME', 'S3_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY'];
    const missingConfig = requiredConfig.filter((key) => !process.env[key]);
    if (missingConfig.length > 0) {
        throw new Error(`S3 upload is not configured. Missing: ${missingConfig.join(', ')}`);
    }

    const client = new S3Client({
        region:process.env.AWS_REGION || 'eu-north-1',
        credentials:{
            accessKeyId:process.env.S3_ACCESS_KEY,
            secretAccessKey:process.env.S3_SECRET_ACCESS_KEY
        },
    })
    const parts = originalFileName.split('.');
    const ext = parts[parts.length - 1];
    const newFileName = Date.now() + '.' + ext;
    try{
        await client.send(new PutObjectCommand({
            Bucket:bucket,
            Body:fs.readFileSync(path),
            Key:newFileName,
            ContentType:mimetype,
            ACL:'public-read'
        }))
        return `https://${bucket}.s3.amazonaws.com/${newFileName}`;
    }catch(err){
        throw err;
    }
}

module.exports = uploadToS3;