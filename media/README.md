# media

Files for making things around the game, not shipped in it:

- `weGotJackBack.mp3`: "We Got Jack Back", the win song, made with Suno. Used by the lyric
  timer (`/dev/lyrics.html`) and the sing-along video tool (`tools/video/`). The game links to
  its YouTube video instead of playing it. It's not under `assets/` because its license isn't
  one of the allowed ones (TECHNICAL.md §14): Suno's terms apply (commercial use needs a paid
  plan). Review those before it's ever shipped in the game.
- `weGotJackBack.timings.json`: when each lyric line starts, tapped on the lyric timer.
