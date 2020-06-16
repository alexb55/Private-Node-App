var PromiseSftp = require('promise-sftp');
var fs = require('fs');

const host = 'XXXXXXXXXXx',
  port = XXXX,
  user = 'XXXXXXX',
  password = 'XXXXXXXXXXXX',
  remoteDir = '/XXXXXXXXXXXX';

var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws.json');
var s3 = new AWS.S3();

const s3Bucket = 'XXXXXXXXXXXXXX';
const s3Dir = 'swap/';

//@// TODO: look for images in subdir
const Job = () => {
  var sftp = new PromiseSftp();
  let sftpFiles = [];
  let s3Files = [];
  sftp
    .connect({
      host,
      port,
      user,
      password,
      debug: e => {
        //console.log(e);
      },
    })
    .then(function(serverMessage) {
      console.log('Connected successfully.');
      console.log('Get SFTP directories...');
      return sftp.list(remoteDir);
      //return sftp.list('/');
    })
    .then(function(sftpDirectories) {
      console.log('Done.');

      //sftpDirectories = sftpDirectories.slice(0, 3);

      return sftpDirectories.reduce((promise, sftpDir) => {
        return promise.then(() => {
          console.log('list: ' + sftpDir.name);
          return sftp.list(`${remoteDir}/${sftpDir.name}`).then(dirFiles => {
            console.log('files: ' + dirFiles.length);
            dirFiles = dirFiles.map(f => {
              f.dir = sftpDir.name;
              return f;
            });
            sftpFiles = sftpFiles.concat(dirFiles);
          });
        });
      }, Promise.resolve([]));
    })
    .then(() => {
      console.log('SFTP files total: ' + sftpFiles.length);
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

      return listAllKeys({
        Bucket: s3Bucket,
        Prefix: s3Dir,
      });
      //return sftp.list('/');
    })
    .then(function(s3List) {
      console.log('Done.');
      console.log('S3 files total: ' + s3List.length);

      let s3ListPrepared = {};
      s3List.map(
        item => (s3ListPrepared[item.Key.replace(s3Dir, '')] = item.Size)
      );

      //compare files go here
      sftpFiles = sftpFiles.filter(
        item =>
          !(
            item.name in s3ListPrepared &&
            s3ListPrepared[item.name] == item.size
          )
      );
      console.log('New/modified files total:' + sftpFiles.length);

      //return Promise.resolve();

      console.log('Start sync...');
      let i = 0;
      return sftpFiles.reduce((promise, sftpFile) => {
        return promise.then(() => {
          if (i % 100 == 0) {
            console.log('synced: ' + i);
            console.log('current: ' + sftpFile.name);
          }
          return sftp
            .createReadStream(`${remoteDir}/${sftpFile.dir}/${sftpFile.name}`)
            .then(stream => {
              delete stream.path;
              stream.length = sftpFile.size;
              i = i + 1;
              return s3
                .putObject({
                  Bucket: s3Bucket,
                  Key: `${s3Dir}${sftpFile.name}`,
                  Body: stream,
                  ACL: 'public-read',
                  ContentType: 'image/jpeg',
                })
                .promise();
            });
        });
      }, Promise.resolve([]));
    })
    .catch(e => {
      console.error(e);
      return Promise.resolve();
    })
    .then(() => {
      console.log('SFTP close.');
      return sftp.end();
    });
};

module.exports = Job;
