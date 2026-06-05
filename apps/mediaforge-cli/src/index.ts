import { ConversionService, MetadataService } from "@mediaforge/media-core";

export function createMediaForgeServices(): {
  conversionService: ConversionService;
  metadataService: MetadataService;
} {
  return {
    conversionService: new ConversionService(),
    metadataService: new MetadataService()
  };
}

console.log("MediaForge CLI scaffold loaded. Conversion commands are not implemented yet.");
