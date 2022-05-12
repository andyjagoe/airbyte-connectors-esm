import dotenv from 'dotenv';
import {
  AirbyteLogger,
  AirbyteLogLevel,
  AirbyteSpec,
  SyncMode,
} from 'faros-airbyte-cdk';
import fs from 'fs-extra';

import * as sut from '../src/index.js';
import {Web3Analytics} from '../src/web3analytics.js';

const web3analyticsInstance = Web3Analytics.instance;

dotenv.config({path: 'test/.env.test'});
const validConfig = {
  node_url: process.env.NODE_URL,
  ceramic_url: process.env.CERAMIC_URL,
  web3analytics_address: process.env.WEB3ANALYTICS,
};

describe('index', () => {
  test('ok?', async () => {
    expect('OK').toEqual('OK');
  });
});

describe('index', () => {
  const logger = new AirbyteLogger(
    // Quiet messages in tests, unless in debug
    process.env.LOG_LEVEL === 'debug'
      ? AirbyteLogLevel.DEBUG
      : AirbyteLogLevel.FATAL
  );

  beforeEach(() => {
    Web3Analytics.instance = web3analyticsInstance;
  });

  function readResourceFile(fileName: string): any {
    return JSON.parse(fs.readFileSync(`resources/${fileName}`, 'utf8'));
  }

  test('spec', async () => {
    const source = new sut.Web3AnalyticsSource(logger);
    await expect(source.spec()).resolves.toStrictEqual(
      new AirbyteSpec(readResourceFile('spec.json'))
    );
  });

  test('check connection', async () => {
    const source = new sut.Web3AnalyticsSource(logger);
    await expect(
      source.checkConnection(validConfig as any)
    ).resolves.toStrictEqual([true, undefined]);
  });

  test('streams - events, use full_refresh sync mode', async () => {
    //TODO: mock this test
    const source = new sut.Web3AnalyticsSource(logger);
    const streams = source.streams({} as any);
    //console.log(streams);

    const eventStream = streams[0];
    const eventIter = eventStream.readRecords(SyncMode.FULL_REFRESH);
    const events = [];
    for await (const event of eventIter) {
      events.push(event);
      //console.log(JSON.stringify(event));
    }
  });
});
