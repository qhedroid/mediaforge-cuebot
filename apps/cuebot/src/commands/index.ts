import { nowPlayingCommand } from "./nowplaying.js";
import { pauseCommand } from "./pause.js";
import { pingCommand } from "./ping.js";
import { playCommand } from "./play.js";
import { queueCommand } from "./queue.js";
import { resumeCommand } from "./resume.js";
import { searchCommand } from "./search.js";
import { skipCommand } from "./skip.js";
import { spotifyCommand } from "./spotify.js";
import { stopCommand } from "./stop.js";
import { helpCommand } from "./help.js";
import type { CommandModule } from "./command.js";

export const cuebotCommands: CommandModule[] = [
  pingCommand,
  helpCommand,
  playCommand,
  searchCommand,
  spotifyCommand,
  queueCommand,
  skipCommand,
  pauseCommand,
  resumeCommand,
  stopCommand,
  nowPlayingCommand
];
