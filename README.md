# deltaclaw

Discord on AR glasses. Read channels, scroll messages, reply by voice - all through the [Even G2](https://even.ai) display.

Built with the Even Hub SDK. Tap, scroll, double-tap - that's the whole interface.

## Flow

Tap to enter from the splash screen.

![welcome](docs/dc-welcome.png)

Browse your Discord channels. The selected channel shows a message preview on the right.

![channels](docs/dc-channels.png)

Scroll to a channel - here #home-server with its latest status.

![channels-home-server](docs/dc-channels-home-server.png)

Tap to open. Messages are paginated - scroll through 14 pages of server logs.

![home-server](docs/dc-home-server.png)

Double-tap to go back. Scroll down to #second-brain - org-roam knowledge graph updates.

![channels-second-brain](docs/dc-channels-second-brain.png)

Tap to read. Clark & Chalmers' extended mind thesis, linked to your daily notes on wearing the glasses.

![second-brain](docs/dc-second-brain.png)

Tap to reply by voice. Speech-to-text streams to the glasses display in real-time.

![recording](docs/dc-recording.png)

## Setup

```
cp .env.example .env   # add DISCORD_TOKEN + GUILD_ID
npm install
npm run dev             # vite on :5173
```

Pair with the Even Hub app, or run the simulator:

```
just simulate
```
