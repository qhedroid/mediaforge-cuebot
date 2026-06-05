import type { QueueItem } from "@mediaforge/shared";
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  type AudioPlayer,
  type VoiceConnection
} from "@discordjs/voice";
import type { GuildMember, VoiceBasedChannel } from "discord.js";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { QueueManager } from "./queue-manager.js";

interface GuildVoiceSession {
  connection: VoiceConnection;
  player: AudioPlayer;
  cleanupTimer?: NodeJS.Timeout;
}

export class VoiceSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoiceSessionError";
  }
}

export interface PlaybackStartResult {
  started: boolean;
  reason?: string;
}

function getPreparedFilePath(item: QueueItem): string | undefined {
  return item.preparedFilePath ?? item.metadata.preparedFilePath;
}

function findRepoRoot(startDirectory: string): string {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return path.resolve(startDirectory);
    }

    currentDirectory = parentDirectory;
  }
}

function isInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relative = path.relative(path.resolve(directoryPath), path.resolve(filePath));
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export class VoiceSessionManager {
  private readonly sessions = new Map<string, GuildVoiceSession>();
  private readonly tempDirectory = path.join(findRepoRoot(process.cwd()), "storage", "cuebot-temp");

  constructor(private readonly queueManager: QueueManager) {}

  getCurrent(guildId: string): QueueItem | undefined {
    return this.queueManager.getCurrent(guildId);
  }

  getQueue(guildId: string): QueueItem[] {
    return this.queueManager.getQueue(guildId);
  }

  enqueue(guildId: string, item: QueueItem): number {
    return this.queueManager.enqueue(guildId, item);
  }

  async ensureSession(guildId: string, member: GuildMember): Promise<GuildVoiceSession> {
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      throw new VoiceSessionError("Please join a voice channel before using /play.");
    }

    const existingSession = this.sessions.get(guildId);

    if (existingSession) {
      clearTimeout(existingSession.cleanupTimer);
      console.log(`CueBot voice session reused: guild=${guildId} channel=${voiceChannel.id}`);
      return existingSession;
    }

    console.log(`CueBot joining voice channel: guild=${guildId} channel=${voiceChannel.id}`);
    const session = this.createSession(guildId, voiceChannel);
    this.sessions.set(guildId, session);
    await entersState(session.connection, VoiceConnectionStatus.Ready, 20_000);
    console.log(`CueBot voice connection ready: guild=${guildId} channel=${voiceChannel.id}`);
    return session;
  }

  startIfIdle(guildId: string): PlaybackStartResult {
    const session = this.sessions.get(guildId);

    if (!session) {
      return { started: false, reason: "No voice session exists for this server." };
    }

    if (session.player.state.status !== AudioPlayerStatus.Idle) {
      return { started: false, reason: `Audio player is ${session.player.state.status}.` };
    }

    return this.playNext(guildId);
  }

  pause(guildId: string): boolean {
    const session = this.sessions.get(guildId);
    const paused = session?.player.pause() ?? false;

    if (paused) {
      this.queueManager.setPaused(guildId, true);
    }

    return paused;
  }

  resume(guildId: string): boolean {
    const session = this.sessions.get(guildId);
    const resumed = session?.player.unpause() ?? false;

    if (resumed) {
      this.queueManager.setPaused(guildId, false);
    }

    return resumed;
  }

  skip(guildId: string): QueueItem | undefined {
    const skipped = this.queueManager.skip(guildId);
    this.sessions.get(guildId)?.player.stop(true);

    if (skipped) {
      void this.cleanupQueueItem(skipped);
    }

    return skipped;
  }

  async stop(guildId: string): Promise<QueueItem[]> {
    const session = this.sessions.get(guildId);
    const clearedItems = this.queueManager.clear(guildId);

    if (session) {
      clearTimeout(session.cleanupTimer);
      session.player.stop(true);
      session.connection.destroy();
      this.sessions.delete(guildId);
    }

    await Promise.all(clearedItems.map((item) => this.cleanupQueueItem(item)));
    return clearedItems;
  }

  private createSession(guildId: string, voiceChannel: VoiceBasedChannel): GuildVoiceSession {
    console.log(`Creating CueBot voice connection: guild=${guildId} channel=${voiceChannel.id}`);
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator
    });
    const player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
      }
    });
    const session: GuildVoiceSession = {
      connection,
      player
    };

    connection.subscribe(player);
    console.log(`CueBot audio player subscribed: guild=${guildId} channel=${voiceChannel.id}`);

    player.on("stateChange", (oldState, newState) => {
      console.log(
        `CueBot audio player status changed: guild=${guildId} ${oldState.status} -> ${newState.status}`
      );
    });

    connection.on("stateChange", (oldState, newState) => {
      console.log(
        `CueBot voice connection status changed: guild=${guildId} ${oldState.status} -> ${newState.status}`
      );
    });

    player.on(AudioPlayerStatus.Idle, () => {
      console.log(`CueBot playback idle: guild=${guildId}`);
      const completed = this.queueManager.getCurrent(guildId);
      this.queueManager.setCurrent(guildId, undefined);

      if (completed) {
        void this.cleanupQueueItem(completed);
      }

      if (!this.playNext(guildId).started) {
        this.scheduleDisconnect(guildId);
      }
    });

    player.on("error", (error) => {
      console.error(`CueBot playback error: guild=${guildId} message=${error.message}`);
      const failed = this.queueManager.getCurrent(guildId);
      this.queueManager.setCurrent(guildId, undefined);

      if (failed) {
        void this.cleanupQueueItem(failed);
      }

      if (!this.playNext(guildId).started) {
        this.scheduleDisconnect(guildId);
      }
    });

    connection.on(VoiceConnectionStatus.Disconnected, () => {
      console.log(`CueBot voice connection disconnected: guild=${guildId}`);
      void this.stop(guildId).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to clean up disconnected session in guild ${guildId}: ${message}`);
      });
    });

    return session;
  }

  private playNext(guildId: string): PlaybackStartResult {
    const session = this.sessions.get(guildId);

    if (!session) {
      return { started: false, reason: "No voice session exists for this server." };
    }

    const nextItem = this.queueManager.dequeue(guildId);

    if (!nextItem) {
      return { started: false, reason: "Queue is empty." };
    }

    const preparedFilePath = getPreparedFilePath(nextItem);

    if (!preparedFilePath) {
      console.error(`Queue item ${nextItem.id} has no prepared file path.`);
      return this.playNext(guildId);
    }

    this.queueManager.setCurrent(guildId, nextItem);
    console.log(`CueBot creating audio resource: guild=${guildId} trackId=${nextItem.id} path=${preparedFilePath}`);
    const resource = createAudioResource(preparedFilePath);
    console.log(`CueBot audio resource created: guild=${guildId} trackId=${nextItem.id}`);
    session.player.play(resource);
    console.log(`CueBot audio player play called: guild=${guildId} trackId=${nextItem.id}`);
    return { started: true };
  }

  private scheduleDisconnect(guildId: string): void {
    const session = this.sessions.get(guildId);

    if (!session) {
      return;
    }

    session.cleanupTimer = setTimeout(() => {
      session.connection.destroy();
      this.sessions.delete(guildId);
      console.log(`Disconnected idle CueBot voice session in guild ${guildId}.`);
    }, 15_000);
  }

  private async cleanupQueueItem(item: QueueItem): Promise<void> {
    const preparedFilePath = getPreparedFilePath(item);

    if (!preparedFilePath || !isInsideDirectory(preparedFilePath, this.tempDirectory)) {
      return;
    }

    await unlink(preparedFilePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        console.error(`Failed to delete temp file for track ${item.id}: ${error.message}`);
      }
    });
  }
}
