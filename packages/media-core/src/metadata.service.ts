import type { TrackMetadata } from "@mediaforge/shared";

export class MetadataService {
  async read(_trackId: string): Promise<TrackMetadata | null> {
    throw new Error("JSON metadata reads are not implemented in the MVP scaffold.");
  }

  async write(_metadata: TrackMetadata): Promise<void> {
    throw new Error("JSON metadata writes are not implemented in the MVP scaffold.");
  }
}
