import { loadCatalogDraft, validateCatalogDraft } from "./catalog-core";

const draft = await loadCatalogDraft();
const errors = validateCatalogDraft(draft);

if (errors.length > 0) {
  console.error("Catalog validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Catalog validation passed: ${draft.works.length} work(s), ${draft.charts.length} chart(s).`);
