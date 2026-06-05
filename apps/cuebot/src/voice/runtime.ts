import { QueueManager } from "./queue-manager.js";
import { VoiceSessionManager } from "./voice-session.js";

export const queueManager = new QueueManager();
export const voiceSessionManager = new VoiceSessionManager(queueManager);
