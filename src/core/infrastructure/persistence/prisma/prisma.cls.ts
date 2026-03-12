import { AsyncLocalStorage } from "async_hooks";
import { TransactionClient } from "./generated/client/internal/prismaNamespace";

export const prismaCls = new AsyncLocalStorage<TransactionClient>();