import {CeramicClient} from '@ceramicnetwork/http-client';
import {TileDocument} from '@ceramicnetwork/stream-tile';
import {DataModel, DataModelParams} from '@glazed/datamodel';
import {DIDDataStore} from '@glazed/did-datastore';
import {TileLoader} from '@glazed/tile-loader';
import VError from '@openagenda/verror';
import {ethers} from 'ethers';
import {AirbyteLogger, wrapApiError} from 'faros-airbyte-cdk';
import fs from 'fs-extra';
import path from 'path';
import * as u8a from 'uint8arrays';
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
const web3AnalyticsABI = fs.readJSONSync(
  path.resolve(__dirname, '../resources/abi/Web3Analytics.json')
);

export interface Web3AnalyticsConfig {
  readonly node_url: string;
  readonly ceramic_url: string;
  readonly web3analytics_address: string;
}

export class Web3Analytics {
  private static web3analytics: Web3Analytics = null;

  constructor(
    private readonly ceramic: CeramicClient,
    private readonly dataStore: DIDDataStore,
    private readonly provider: ethers.providers.JsonRpcProvider,
    private readonly cfg: Web3AnalyticsConfig
  ) {}

  static async instance(
    config: Web3AnalyticsConfig,
    logger: AirbyteLogger
  ): Promise<Web3Analytics> {
    if (Web3Analytics.web3analytics) return Web3Analytics.web3analytics;

    if (!config.node_url) {
      throw new VError('No node url provided');
    }
    if (!config.ceramic_url) {
      throw new VError('No Ceramic url provided');
    }
    if (!config.web3analytics_address) {
      throw new VError('No Web3 Analytics address provided');
    }

    const ceramic = await new CeramicClient(config.ceramic_url);
    const cache = new Map();
    const loader = await new TileLoader({ceramic, cache});
    const aliases = fs.readJSONSync(
      path.resolve(__dirname, '../resources/schemas/model.json')
    );
    type Params = DataModelParams<typeof aliases>;
    const model = await new DataModel({loader, aliases} as unknown as Params);
    const dataStore = await new DIDDataStore({ceramic, loader, model});

    const provider = new ethers.providers.JsonRpcProvider(config.node_url);

    Web3Analytics.web3analytics = new Web3Analytics(
      ceramic,
      dataStore,
      provider,
      config
    );
    logger.debug('Created Web3Analytics instance');
    return Web3Analytics.web3analytics;
  }

  async checkConnection(): Promise<void> {
    try {
      //TODO: add check for Ceramic as well
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
    } catch (err: any) {
      let errorMessage = 'Could not connect to blockchain network. Error: ';
      if (err.error_code || err.error_info) {
        errorMessage += `${err.error_code}: ${err.error_info}`;
        throw new VError(errorMessage);
      }
      try {
        errorMessage += err.message ?? err.statusText ?? wrapApiError(err);
      } catch (wrapError: any) {
        errorMessage += wrapError.message;
      }
      throw new VError(errorMessage);
    }
  }

  async getAppIds(): Promise<string[]> {
    const contract = new ethers.Contract(
      this.cfg.web3analytics_address,
      web3AnalyticsABI,
      this.provider
    );
    return await contract.getApps();
  }

  async getUserRegistrations(appId: string): Promise<string[][]> {
    const contract = new ethers.Contract(
      this.cfg.web3analytics_address,
      web3AnalyticsABI,
      this.provider
    );
    return contract.getUserRegistrations(appId);
  }

  verifyRegistration(did: string, ethAddress: string): boolean {
    if (did === null || did === '') return false; //TODO: add check for valid did
    if (!ethers.utils.isAddress(ethAddress)) return false;

    // Decode DID to make sure it matches ethereum address that registered it
    try {
      const toDecode = did.substring(9);
      const u8ak = u8a.fromString(toDecode, 'base58btc');
      const part1 = u8ak.subarray(2, 35);
      const publicKey = ethers.utils.computePublicKey(part1);
      const address = ethers.utils.getAddress(
        ethers.utils.hexDataSlice(
          ethers.utils.keccak256(ethers.utils.hexDataSlice(publicKey, 1)),
          12
        )
      );
      if (address === ethAddress) return true;
    } catch (err: any) {
      let errorMessage = "DID doesn't match ethereum address. Error: ";
      if (err.error_code || err.error_info) {
        errorMessage += `${err.error_code}: ${err.error_info}`;
        throw new VError(errorMessage);
      }
      try {
        errorMessage += err.message ?? err.statusText ?? wrapApiError(err);
      } catch (wrapError: any) {
        errorMessage += wrapError.message;
      }
      throw new VError(errorMessage);
    }

    return false;
  }

  async *getTrackingEvents(
    did: string,
    lastUpdatedAt?: string
  ): AsyncGenerator<Event> {
    const res = await this.dataStore.get('events', did);
    if (!res) return;

    for await (const item of res.events) {
      console.log(item.updated_at);

      const startTime = new Date(lastUpdatedAt ?? 0);
      if (item.updated_at > startTime) {
        //TODO: batch these requests to improve performance
        const doc = await TileDocument.load(this.ceramic, item.id);
        console.log(doc.content);
        yield doc.content as any;
      }
    }
  }

  async *getEvents(lastUpdatedAt?: string): AsyncGenerator<Event> {
    const appIds = await this.getAppIds();
    if (!appIds) return;
    //console.log(JSON.stringify(appIds));

    // loop through all appIds
    for await (const appId of appIds) {
      const registrations = await this.getUserRegistrations(appId);

      // loop through all registered users of appId
      for (const registration of registrations) {
        const verified = this.verifyRegistration(
          registration['userDid'],
          registration['userAddress']
        );
        // if user registation is valid, get its tracking events
        if (verified)
          yield* this.getTrackingEvents(registration['userDid'], lastUpdatedAt);
      }
    }
  }
}
