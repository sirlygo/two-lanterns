# Two Lanterns

A two-player dungeon crawler in one HTML file: build two lantern-bearers, go down eight rooms of the Bell Stair, and find one of thousands of different endings.

**Play:** https://sirlygo.github.io/two-lanterns/

- **One device:** choose *Light the lanterns* and pass the screen between you.
- **Two devices:** one of you chooses *Play online*, then *Host a room*, and shares the four-letter code (or the *Copy link* link). The other joins with it. Your moves stay hidden on your own screen until you have both locked in.

There is no game server. [PeerJS](https://peerjs.com)'s free public matchmaker only introduces the two browsers, and after that every move goes straight from one browser to the other (WebRTC). Saved lanterns, your game in progress and the Book of Endings stay in each browser's local storage.

Everything is in `index.html`, with the fonts and PeerJS inside it. Licences are in `LICENSES.txt`: Cinzel and Spectral are SIL OFL 1.1, PeerJS is MIT.
