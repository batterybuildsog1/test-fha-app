/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as actions_solveDTI from "../actions/solveDTI.js";
import type * as domain_BorrowerProfile from "../domain/BorrowerProfile.js";
import type * as domain_DTICalculation from "../domain/DTICalculation.js";
import type * as domain_LoanProduct from "../domain/LoanProduct.js";
import type * as domain_types from "../domain/types.js";
import type * as functions from "../functions.js";
import type * as getFHARates from "../getFHARates.js";
import type * as homestead from "../homestead.js";
import type * as insuranceRates from "../insuranceRates.js";
import type * as propertyTax from "../propertyTax.js";
import type * as scenarios from "../scenarios.js";
import type * as services_borrowingPowerService from "../services/borrowingPowerService.js";
import type * as services_cacheService from "../services/cacheService.js";
import type * as services_compensatingFactorService from "../services/compensatingFactorService.js";
import type * as services_dtiService from "../services/dtiService.js";
import type * as services_loanProductService from "../services/loanProductService.js";
import type * as services_validationService from "../services/validationService.js";
import type * as shared_prompts from "../shared/prompts.js";
import type * as utils_env from "../utils/env.js";
import type * as utils_fresh from "../utils/fresh.js";
import type * as utils_grok from "../utils/grok.js";
import type * as utils_json from "../utils/json.js";
import type * as utils_kimi from "../utils/kimi.js";
import type * as utils_ninjas from "../utils/ninjas.js";
import type * as utils_tax from "../utils/tax.js";
import type * as validators_borrowerSchema from "../validators/borrowerSchema.js";
import type * as validators_dtiSchema from "../validators/dtiSchema.js";
import type * as validators_loanSchema from "../validators/loanSchema.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/solveDTI": typeof actions_solveDTI;
  "domain/BorrowerProfile": typeof domain_BorrowerProfile;
  "domain/DTICalculation": typeof domain_DTICalculation;
  "domain/LoanProduct": typeof domain_LoanProduct;
  "domain/types": typeof domain_types;
  functions: typeof functions;
  getFHARates: typeof getFHARates;
  homestead: typeof homestead;
  insuranceRates: typeof insuranceRates;
  propertyTax: typeof propertyTax;
  scenarios: typeof scenarios;
  "services/borrowingPowerService": typeof services_borrowingPowerService;
  "services/cacheService": typeof services_cacheService;
  "services/compensatingFactorService": typeof services_compensatingFactorService;
  "services/dtiService": typeof services_dtiService;
  "services/loanProductService": typeof services_loanProductService;
  "services/validationService": typeof services_validationService;
  "shared/prompts": typeof shared_prompts;
  "utils/env": typeof utils_env;
  "utils/fresh": typeof utils_fresh;
  "utils/grok": typeof utils_grok;
  "utils/json": typeof utils_json;
  "utils/kimi": typeof utils_kimi;
  "utils/ninjas": typeof utils_ninjas;
  "utils/tax": typeof utils_tax;
  "validators/borrowerSchema": typeof validators_borrowerSchema;
  "validators/dtiSchema": typeof validators_dtiSchema;
  "validators/loanSchema": typeof validators_loanSchema;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
