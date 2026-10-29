import type { ProjectPricing } from "../types/project-pricing";

export const isIndexedPriceMissing = (price: ProjectPricing | undefined): boolean =>
  price?.indexed_fee === null || price?.indexed_fee === undefined;
