import VError from '@openagenda/verror';
import {Command} from 'commander';
import {
  AirbyteLogger,
  AirbyteSourceBase,
  AirbyteSourceRunner,
  AirbyteSpec,
  AirbyteStreamBase,
} from 'faros-airbyte-cdk';
import fs from 'fs-extra';
import path from 'path';
import * as url from 'url';

import {Events} from './streams/events.js';
import {Web3Analytics, Web3AnalyticsConfig} from './web3analytics.js';

export function mainCommand(): Command {
  const logger = new AirbyteLogger();
  const source = new Web3AnalyticsSource(logger);
  return new AirbyteSourceRunner(logger, source).mainCommand();
}

export class Web3AnalyticsSource extends AirbyteSourceBase {
  async spec(): Promise<AirbyteSpec> {
    const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
    return new AirbyteSpec(
      fs.readJSONSync(path.resolve(__dirname, '../resources/spec.json'))
    );
  }
  async checkConnection(
    config: Web3AnalyticsConfig
  ): Promise<[boolean, VError]> {
    try {
      const web3analytics = await Web3Analytics.instance(config, this.logger);
      await web3analytics.checkConnection();
      console.log('checkConnection');
    } catch (err: any) {
      return [false, err];
    }
    return [true, undefined];
  }
  streams(config: Web3AnalyticsConfig): AirbyteStreamBase[] {
    return [new Events(config, this.logger)];
  }
}
