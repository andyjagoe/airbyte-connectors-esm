import {ComposeClient} from '@composedb/client';
import VError from '@openagenda/verror';
import {ethers} from 'ethers';
import {AirbyteLogger, wrapApiError} from 'faros-airbyte-cdk';
import fs from 'fs-extra';
import path from 'path';
import * as u8a from 'uint8arrays';
import * as url from 'url';

import {definition} from '../resources/schemas/definition.js';

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
    private readonly composedb: ComposeClient,
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

    const compose = new ComposeClient({
      ceramic: config.ceramic_url,
      definition,
    });
    const provider = new ethers.providers.JsonRpcProvider(config.node_url);

    Web3Analytics.web3analytics = new Web3Analytics(compose, provider, config);
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
    const res: any = await this.composedb.executeQuery(`
      query {
        node (id: "${did}") {
          id  
          ... on CeramicAccount {
            eventList(last:1000) {
              edges {
                node {
                  id
                  app_id
                  did
                  created_at
                  updated_at
                  raw_payload
                  anonymousId
                  event
                  meta_ts
                  meta_rid
                  properties_url
                  properties_hash
                  properties_path
                  properties_title
                  properties_width
                  properties_height
                  properties_search
                  properties_referrer
                  traits_email
                  type
                  userId
                }
              }
            }
          }
        }
      }    
    `);
    //TODO: Handle paging

    if (!res) return;
    if (res.data.node.eventList.edges.length === 0) return;

    for await (const {node} of res.data.node.eventList.edges) {
      console.log(node.updated_at);

      const startTime = new Date(lastUpdatedAt ?? 0);
      if (node.updated_at > startTime) {
        //TODO: batch these requests to improve performance
        console.log(node);
        yield node as any;
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
