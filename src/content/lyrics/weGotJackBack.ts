/**
 * "We Got Jack Back" (assets/music/weGotJackBack.mp3): the lyrics as sung,
 * one entry per sung line, for the sing-along video. Stage directions
 * (the bracketed sections' notes in parentheses) are left out; a line's own
 * backing shouts, like "(WOOO!)", stay in. When each line starts is timed by
 * hand on /dev/lyrics.html.
 */
export interface LyricLine {
  readonly section: string;
  readonly text: string;
}

export const WE_GOT_JACK_BACK_LYRICS: readonly LyricLine[] = [
  { section: 'Intro', text: 'WE GOT JACK BACK!' },
  { section: 'Verse 1', text: 'Well the frog had a hat and the hat was tall,' },
  { section: 'Verse 1', text: 'He rained down froggies on us all,' },
  { section: 'Verse 1', text: 'The Queen was sweet but her heart was sour,' },
  { section: 'Verse 1', text: 'She banned our plays every single hour,' },
  { section: 'Verse 1', text: 'But we flipped that play and we ran it back,' },
  { section: 'Verse 1', text: "'Cause nothing's can stop us gettin' Jack Back!" },
  { section: 'Pre-Chorus', text: 'Hey ghosts! (WOOO!)' },
  { section: 'Pre-Chorus', text: 'Hey golems! (UGH!)' },
  { section: 'Pre-Chorus', text: 'Hey werewolves! (AWOOOO!)' },
  { section: 'Pre-Chorus', text: 'Everybody... get... LOUD!' },
  { section: 'Chorus', text: "We got Jack back! (He's back! He's back!)" },
  { section: 'Chorus', text: "Pumpkin on the patch, now he's glowin' like that!" },
  { section: 'Chorus', text: 'We got Jack back! (Say what? Say what?)' },
  { section: 'Chorus', text: "Carried him home in a big ol' sack!" },
  { section: 'Chorus', text: "Throw your claws up high, wave 'em side to side," },
  { section: 'Chorus', text: "Shake your bones 'til the sun comes up outside," },
  { section: 'Chorus', text: 'We got Jack back! (Oh yeah!)' },
  { section: 'Chorus', text: 'We got Jack... BACK!' },
  { section: 'Dance Break', text: "Alright everybody, it's time to do... the Pumpkin Roll!" },
  { section: 'Dance Break', text: 'Step to the left! (Step!)' },
  { section: 'Dance Break', text: 'Step to the right! (Step!)' },
  { section: 'Dance Break', text: 'Rattle your bones! (Rattle rattle!)' },
  { section: 'Dance Break', text: 'Now ROLL like a gourd! (Rooooll!)' },
  { section: 'Dance Break', text: "Zombies, you can just shuffle, that's fine." },
  { section: 'Bridge', text: 'He was lost... (lost!)' },
  { section: 'Bridge', text: "Now he's found... (found!)" },
  { section: 'Bridge', text: "Glowin' bright on the pumpkin ground..." },
  { section: 'Bridge', text: 'Light him up! (Light him up!)' },
  { section: 'Bridge', text: 'Light him up! (Light him up!)' },
  { section: 'Bridge', text: 'LIGHT... HIM... UP!' },
  { section: 'Final Chorus', text: "We got Jack back! (He's back! He's back!)" },
  { section: 'Final Chorus', text: "Pumpkin on the patch, now he's glowin' like that!" },
  { section: 'Final Chorus', text: 'We got Jack back! (Say what? Say what?)' },
  { section: 'Final Chorus', text: "Carried him home in a big ol' sack!" },
  { section: 'Final Chorus', text: "Throw your claws up high, wave 'em side to side," },
  { section: 'Final Chorus', text: "Shake your bones 'til the sun comes up outside," },
  { section: 'Final Chorus', text: 'We got Jack back! (Oh yeah!)' },
  { section: 'Final Chorus', text: 'We got Jack... BACK!' },
  { section: 'Outro', text: "...wait, where's the frog?" },
];
