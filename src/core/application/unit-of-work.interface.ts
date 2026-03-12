export interface UnitOfWork {
  withTransaction<T>(work: () => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK_TOKEN = 'UNIT_OF_WORK_TOKEN';