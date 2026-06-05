import { LocalLibraryProvider, ProviderRegistry } from "@mediaforge/media-core";

export const providerRegistry = new ProviderRegistry();

providerRegistry.register(new LocalLibraryProvider());
