import type { PrepareOptions, QueueItem, UrlInput } from "@mediaforge/shared";

export class UrlIngestService {
  async prepareUrl(_input: UrlInput, _options: PrepareOptions = {}): Promise<QueueItem> {
    throw new Error("URL ingest is reserved for legally permitted MediaForge playback in CueBot 1.0.");
  }
}
