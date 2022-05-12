import dotenv from 'dotenv';
import {AirbyteLogger, AirbyteLogLevel} from 'faros-airbyte-cdk';

import {Web3Analytics} from '../src/web3analytics.js';

dotenv.config({path: 'test/.env.test'});
const validConfig = {
  node_url: process.env.NODE_URL,
  ceramic_url: process.env.CERAMIC_URL,
  web3analytics_address: process.env.WEB3ANALYTICS,
};

describe('web3analytics', () => {
  test('ok?', async () => {
    expect('OK').toEqual('OK');
  });
});

describe('web3analytics', () => {
  const logger = new AirbyteLogger(
    // Quiet messages in tests, unless in debug
    process.env.LOG_LEVEL === 'debug'
      ? AirbyteLogLevel.DEBUG
      : AirbyteLogLevel.FATAL
  );

  test('verify we can get app IDs from blockchain', async () => {
    //TODO: mock this test
    const web3analytics = await Web3Analytics.instance(validConfig, logger);
    await expect(web3analytics.getAppIds()).resolves.toStrictEqual([
      '0xE6d24e69A35944FD15EF2948cA8E07067BD5d57a',
    ]);
  });

  test('verify we can get list of user registrations for an app', async () => {
    //TODO: mock this test
    const web3analytics = await Web3Analytics.instance(validConfig, logger);
    const appId = '0xE6d24e69A35944FD15EF2948cA8E07067BD5d57a';
    const users = await web3analytics.getUserRegistrations(appId);
    //console.log(users);
  });

  test('verify we can get tracking data for user from ceramic', async () => {
    //TODO: mock this test
    const web3analytics = await Web3Analytics.instance(validConfig, logger);
    const did = 'did:key:zQ3shp4NdGw9GvSLrCw9LRLC5nCVpXtp5Jc9UETVauUvTYGKf';
    const events = await web3analytics.getTrackingEvents(did);
    //console.log(events);
  });
});
