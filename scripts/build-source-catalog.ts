import { buildCatalogOutput, writeCatalogOutput } from "./catalog-core";

const output = await buildCatalogOutput();
await writeCatalogOutput(output);

console.log(
  `Source catalog built: ${output.manifest.files.length} file(s), ${output.envelopes.length} envelope(s).`,
);
