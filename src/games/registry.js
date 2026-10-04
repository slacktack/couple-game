import * as Protocol from './Protocol.jsx';
import * as Case from './Case.jsx';
import * as Observatory from './Observatory.jsx';
import * as MusicBox from './MusicBox.jsx';
import * as Maze from './Maze.jsx';
import * as NightTrain from './NightTrain.jsx';
import * as Herbarium from './Herbarium.jsx';

import ProtocolWorld from '../worlds/ProtocolWorld.jsx';
import CaseWorld from '../worlds/CaseWorld.jsx';
import ObservatoryWorld from '../worlds/ObservatoryWorld.jsx';
import MusicBoxWorld from '../worlds/MusicBoxWorld.jsx';
import MazeWorld from '../worlds/MazeWorld.jsx';
import NightTrainWorld from '../worlds/NightTrainWorld.jsx';
import HerbariumWorld from '../worlds/HerbariumWorld.jsx';

// Each game module exports: default component, progress(data) => { done, total, finished }.
export const GAMES = [
  { id: 'protocol', tag: 'The big one', subtitle: 'The long-distance mystery', description: 'Follow a paper trail. Crack six clues. Open one shared vault.', label: 'PAPER TRAIL · SIX CLUES', number: '01', title: 'The Distance Protocol', tagline: 'Six little locks, one shared word.', time: '75–100 min', tone: 'rose', image: '/game-art/protocol-paper-map.jpg', mod: Protocol, world: ProtocolWorld },
  { id: 'case', tag: 'Solve the case', subtitle: 'A two-person murder mystery', description: 'Question five suspects. Find the clock that lied.', label: 'CASE FILE 11:47 · FIVE SUSPECTS', number: '02', title: 'The 11:47 Case', tagline: 'Five suspects. One wrong clock.', time: '25–40 min', tone: 'lilac', image: '/game-art/case-evidence-room.jpg', mod: Case, world: CaseWorld },
  { id: 'observatory', tag: 'Escape together', subtitle: 'A digital escape room', description: 'Decode five star locks. Find the hidden map.', label: 'NIGHT SHIFT · FIVE LOCKS', number: '03', title: 'The Observatory Lock', tagline: 'Five star locks before midnight.', time: '35–60 min', tone: 'blue', image: '/game-art/observatory-night-sky.jpg', mod: Observatory, world: ObservatoryWorld },
  { id: 'musicbox', tag: 'Talk fast', subtitle: 'Hold it · read the manual', description: 'One of you holds a broken music box. The other has the only repair manual.', label: 'WORKBENCH · THREE MODULES', number: '04', title: 'The Music Box', tagline: 'One of you holds it. One has the manual.', time: '20–30 min', tone: 'amber', image: '/game-art/musicbox-workshop.jpg', mod: MusicBox, world: MusicBoxWorld },
  { id: 'maze', tag: 'Voice only', subtitle: 'Guide each other home', description: 'One of you sees the maze. The other carries the lantern through the fog.', label: 'THE HEDGE · THREE LEVELS', number: '05', title: 'Fog Lantern Maze', tagline: 'Guide the lantern home by voice.', time: '15–25 min', tone: 'moss', image: '/game-art/fog-lantern-maze.jpg', mod: Maze, world: MazeWorld },
  { id: 'train', tag: 'Deduce it', subtitle: 'A sleeper-car love letter', description: 'Someone on the overnight train left an unsigned letter. Who, where and when?', label: 'CAR 4 · FIVE PASSENGERS', number: '06', title: 'The Night Train', tagline: 'Who left the unsigned love letter?', time: '25–35 min', tone: 'indigo', image: '/game-art/night-train-carriage.jpg', mod: NightTrain, world: NightTrainWorld },
  { id: 'herbarium', tag: 'Decode it', subtitle: 'Floriography for two', description: 'A book of pressed flowers hides a message. Each of you has half the key.', label: 'THREE PAGES · ONE LETTER', number: '07', title: 'Pressed Flower Cipher', tagline: 'Every petal is a letter.', time: '20–30 min', tone: 'sage', image: '/game-art/pressed-flower-herbarium.jpg', mod: Herbarium, world: HerbariumWorld },
];

export const gameById = id => GAMES.find(game => game.id === id);

export function progressOf(game, data) {
  try { return game.mod.progress?.(data || {}) || { done: 0, total: 0, finished: false }; }
  catch { return { done: 0, total: 0, finished: false }; }
}
