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
    //TODO: mock this test and check for correctness
    const web3analytics = await Web3Analytics.instance(validConfig, logger);
    await expect(web3analytics.getAppIds()).resolves.toContain(
      '0xE6d24e69A35944FD15EF2948cA8E07067BD5d57a'
    );
  });

  test('verify we can get list of user registrations for an app', async () => {
    //TODO: mock this test and check for correctness
    const web3analytics = await Web3Analytics.instance(validConfig, logger);
    const appId = '0xE6d24e69A35944FD15EF2948cA8E07067BD5d57a';
    const users = await web3analytics.getUserRegistrations(appId);
    //console.log(users);
  });

  test('confirm we can verify user registrations', async () => {
    const web3analytics = await Web3Analytics.instance(validConfig, logger);
    //const did1 = 'did:key:zQ3shfzGsUyywyxz8U94iA32ifEj29VpzctY6NLTzGdjAAaQx';
    const did1 = 'did:key:zQ3shmsF7BxJ4tjLqgdAVaGkKNeE1UttrYgLA2tRqpmYqzCxr';
    const address1 = '0xF97eba606Fe1b1A6b6CCab76209A8BCf136C8769';
    const address2 = '0xcA64788809ae2EfDeaC73A7aa88a12Aa3aDDeE53';
    const fakeAddress = '0xcA64788809ae2EfDeaC73A7aa88a12Aa3aDDeE52';
    expect(web3analytics.verifyRegistration(did1, address1));
    expect(!web3analytics.verifyRegistration(did1, address2));
    expect(!web3analytics.verifyRegistration(null, null));
    expect(!web3analytics.verifyRegistration(did1, fakeAddress));
  });

  test('verify we can get tracking data for user from ceramic', async () => {
    //TODO: mock this test and check for correctness
    const web3analytics = await Web3Analytics.instance(validConfig, logger);
    const did = 'did:key:zQ3shmsF7BxJ4tjLqgdAVaGkKNeE1UttrYgLA2tRqpmYqzCxr';
    const events = await web3analytics.getTrackingEvents(did);
    //console.log(events);
  });

  test('verify we can get tracking data for apps', async () => {
    //TODO: mock this test and check for correctness
    const web3analytics = await Web3Analytics.instance(validConfig, logger);

    const allEvents = await web3analytics.getEvents();
    let i = 0;
    for await (const item of allEvents) {
      i++;
    }
    expect(i > 0);

    // Test starting with a date in the year 2037
    const noEvents = await web3analytics.getEvents('2125792707');
    i = 0;
    for await (const item of noEvents) {
      i++;
    }
    expect(i === 0);
  });
});
