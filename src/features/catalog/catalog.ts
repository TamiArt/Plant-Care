import { ADDITIONAL_CATALOG } from "./additionalData";
import { CORE_CATALOG } from "./data";
import { GARDEN_CATALOG } from "./gardenData";

export const CATALOG = [...CORE_CATALOG, ...ADDITIONAL_CATALOG, ...GARDEN_CATALOG];
