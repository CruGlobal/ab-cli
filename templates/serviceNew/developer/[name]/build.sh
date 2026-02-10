#!/usr/bin/env bash
# Supply chain: --provenance and --sbom are required for Docker Hub attestations; they are preserved when using --push.

docker buildx build --provenance=true --sbom=true $DOCKER_ARGS .
