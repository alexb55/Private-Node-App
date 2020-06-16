var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
var s3 = new AWS.S3();

const s3Bucket = 'XXXXXXXXXXXXXXXXX';
const s3Dir = 'swap/';

//@// TODO: look for images in subdir
const Job = () => {
  console.log('Get S3 directory listing...');

  const listAllKeys = (params, out = []) =>
    new Promise((resolve, reject) => {
      s3
        .listObjectsV2(params)
        .promise()
        .then(({ Contents, IsTruncated, NextContinuationToken }) => {
          out.push(...Contents);
          !IsTruncated
            ? resolve(out)
            : resolve(
                listAllKeys(
                  Object.assign(params, {
                    ContinuationToken: NextContinuationToken,
                  }),
                  out
                )
              );
        })
        .catch(reject);
    });

  listAllKeys({
    Bucket: s3Bucket,
    Prefix: s3Dir,
  }).then(files => {
    console.log('Total:', files.length);

    let i = 0;

    return files.reduce((promise, file) => {
      return promise.then(() => {
        if (
          file.Key.indexOf('_front') > -1 ||
          file.Key.indexOf('_angleL') > -1
        ) {
          if (i % 1000 == 0) {
            console.log('synced: ' + i);
            console.log('current: ' + file.Key);
          }
          i = i + 1;
          return (
            s3
              .copyObject({
                Bucket: s3Bucket,
                CopySource: `${s3Bucket}/${file.Key}`,
                Key: file.Key.replace('_front', '').replace('_angleL', ''),
                ACL: 'public-read',
              })
              .promise()
              .then(() =>
                // Delete the old object
                s3
                  .deleteObject({
                    Bucket: s3Bucket,
                    Key: file.Key,
                  })
                  .promise()
              )
              // Error handling is left up to reader
              .catch(e => console.error(e))
          );
        }
        return Promise.resolve();
      });
    }, Promise.resolve([]));
  });
};

module.exports = Job;
