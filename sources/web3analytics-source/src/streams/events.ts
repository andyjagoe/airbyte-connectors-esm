import {
  AirbyteLogger,
  AirbyteStreamBase,
  StreamKey,
  SyncMode,
} from 'faros-airbyte-cdk';
import fs from 'fs-extra';
import path from 'path';
import {Dictionary} from 'ts-essentials';
import * as url from 'url';

import {Web3Analytics, Web3AnalyticsConfig} from '../web3analytics.js';

export class Events extends AirbyteStreamBase {
  constructor(
    private readonly config: Web3AnalyticsConfig,
    protected readonly logger: AirbyteLogger
  ) {
    super(logger);
  }

  getJsonSchema(): Dictionary<any, string> {
    const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
    return fs.readJSONSync(
      path.resolve(__dirname, '../../resources/schemas/events.json')
    );
  }
  get primaryKey(): StreamKey {
    return 'id';
  }
  get cursorField(): string | string[] {
    return 'updated_at';
  }

  async *readRecords(
    syncMode: SyncMode,
    cursorField?: string[],
    streamSlice?: Dictionary<any, string>,
    streamState?: Dictionary<any, string>
  ): AsyncGenerator<Dictionary<any, string>, any, unknown> {
    const lastUpdatedAt =
      syncMode === SyncMode.INCREMENTAL ? streamState?.updated_at : undefined;
    const web3analytics = await Web3Analytics.instance(
      this.config,
      this.logger
    );
    yield* web3analytics.getEvents(lastUpdatedAt);
  }

  getUpdatedState(
    currentStreamState: Dictionary<any>,
    latestRecord: Dictionary<any>
  ): Dictionary<any> {
    const lastUpdatedAt: Date = new Date(latestRecord.updated_at);
    return {
      updated_at:
        lastUpdatedAt >= new Date(currentStreamState?.updated_at || 0)
          ? latestRecord.updated_at
          : currentStreamState.updated_at,
    };
  }
}
