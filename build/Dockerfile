# Stage 0: Install Cloud SDK and Chrome from Debian packages.

# Node 17 apparently made an OpenSSL change that broke Webpack with
# "Error: error:0308010C:digital envelope routines::unsupported":
# https://github.com/webpack/webpack/issues/14532
# Somehow this is apparently still broken in node:17 as of 20211214.
FROM node:16-bullseye

# The Chrome stuff is based on https://askubuntu.com/a/510186 and
# https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-in-docker
RUN apt-get update
RUN apt-get upgrade
RUN apt-get install -y --no-install-recommends gnupg wget
RUN wget -q -O- https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' \
    >>/etc/apt/sources.list.d/chrome.list
RUN wget -q -O- https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add -
RUN echo 'deb [arch=amd64] https://packages.cloud.google.com/apt cloud-sdk main' \
    >>/etc/apt/sources.list.d/cloud-sdk.list
RUN apt-get update
RUN apt-get install -y \
    fonts-noto-core \
    fonts-noto-mono \
    fonts-noto-ui-core \
    google-chrome-stable \
    google-cloud-sdk \
    google-cloud-sdk-app-engine-go \
    google-cloud-sdk-app-engine-python \
    google-cloud-sdk-datastore-emulator \
    python-is-python2 \
    unzip \
    xvfb
