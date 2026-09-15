# Cloud Agent base image for Mycel (Electron + React + TypeScript desktop app).
# Ubuntu 24.04 with Node.js 22, plus the shared libraries Electron/Chromium needs
# to launch on Linux and Xvfb so the app can run in a headless display.
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Base tooling. git and curl are required in fully custom Cloud Agent images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        gnupg \
        xz-utils \
        sudo \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 (matches the repo's toolchain) via NodeSource.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Shared libraries required to launch Electron/Chromium on Linux, plus Xvfb for a
# virtual display when running the GUI headlessly. Package names use the Ubuntu
# 24.04 (noble) "t64" variants where applicable.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libnss3 \
        libatk1.0-0t64 \
        libatk-bridge2.0-0t64 \
        libcups2t64 \
        libdrm2 \
        libgtk-3-0t64 \
        libgbm1 \
        libasound2t64 \
        libxshmfence1 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libxkbcommon0 \
        libpango-1.0-0 \
        libcairo2 \
        libatspi2.0-0t64 \
        libxfixes3 \
        xvfb \
        x11-utils \
    && rm -rf /var/lib/apt/lists/*

# Ubuntu 24.04 ships a non-root "ubuntu" user (uid 1000). Give it passwordless
# sudo so setup steps can adjust the environment if needed.
RUN echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/ubuntu \
    && chmod 0440 /etc/sudoers.d/ubuntu

USER ubuntu
