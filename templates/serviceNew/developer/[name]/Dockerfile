##
## digiserve/ab-<%= name %>
##
## This is the microservice for <%= name %>.
##
## Security: image runs as non-root user (node). For production, prefer
## pinning the base image by digest and overriding CMD to remove --inspect.
##
## Docker Commands:
## ---------------
## $ docker build -t digiserve/ab-<%= name %>:master .
## $ docker push digiserve/ab-<%= name %>:master
##
## Multi-platform (M1/M2/M3 Mac → amd64 + arm64):
## $ docker buildx create --use  # once, if no builder
## $ docker buildx build --provenance=true --sbom=true --platform linux/amd64,linux/arm64 -t digiserve/ab-<%= name %>:master --push .
## Or use: $ DOCKER_ARGS="--platform linux/amd64,linux/arm64 --push" ./build.sh
## Supply chain: use --provenance=true --sbom=true when pushing to a registry for Docker Hub attestations and license visibility.
##

ARG BRANCH=master

FROM digiserve/service-cli:${BRANCH}

# OCI labels for Docker Hub / Scout (license, description)
LABEL org.opencontainers.image.title="<%= name %>" \
   org.opencontainers.image.description="Microservice for <%= name %>" \
   org.opencontainers.image.licenses="MIT"

COPY . /app

WORKDIR /app

# Reproducible install; use npm i -f only if npm ci fails (e.g. peer deps, git deps)
RUN npm ci && npm cache clean --force

# Security: run as non-root (base image should provide node user)
RUN chown -R node:node /app
USER node

# --inspect=0.0.0.0:9229 exposes debugger to the network; omit in production or bind to 127.0.0.1
CMD [ "node", "--inspect=0.0.0.0:9229", "app.js" ]
