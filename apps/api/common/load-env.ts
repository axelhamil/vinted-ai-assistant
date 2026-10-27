import { parseEnv } from "./env";
import { readEnv } from "./read-env";

export const env = readEnv(parseEnv);
