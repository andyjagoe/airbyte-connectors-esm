# Web3 Analytics Source

This is a source connector for the [Airbyte](https://airbyte.com/) open source ELT data integration platform. It enables loading web3 analytics data stored on the Ceramic decentralized data network into any of [dozens of traditional data store destinations](https://airbyte.com/connectors?connector-type=Destinations) for analysis.

## Development

This connector is based on an ESM port of the [Faros AI Airbyte Connectors](https://github.com/faros-ai/airbyte-connectors) project. The port was required because Ceramic publishes only pure ESM modules and they cannot be loaded from CommonJS. Details on how to build a source connector can be found [here](https://github.com/faros-ai/airbyte-connectors/tree/main/sources).

## Testing

Connectors must be published as docker containers, and must pass a source acceptance test to be added to an Airbyte system. To test, run the following from the root of [https://github.com/andyjagoe/airbyte-connectors-esm](https://github.com/andyjagoe/airbyte-connectors-esm):

```./scripts/source-acceptance-test.sh web3analytics-source```

## Publishing

You must publish a new source connector to Docker before you can use it. To do this, make sure you are logged in to your Docker account, edit the publish script for your account, then run from the root of [https://github.com/andyjagoe/airbyte-connectors-esm](https://github.com/andyjagoe/airbyte-connectors-esm):

```./scripts/publish-connector.sh sources/web3analytics-source```

This compiles a docker build using the platform you're publishing from since we have not set up dual architecture buidls yet. To build for AMD64, publish from an AMD64 machine. To build for arm64, publish from an arm64 machine.

## Use

To use your source connector, add a new connector and add the values from the Docker container, e.g. [https://hub.docker.com/r/web3analytics/airbyte-web3analytics-source/tags](https://hub.docker.com/r/web3analytics/airbyte-web3analytics-source/tags)
