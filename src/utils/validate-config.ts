import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ClassConstructor } from 'class-transformer/types/interfaces';

function validateConfig<T extends object>(
  config: Record<string, unknown>,
  envVariablesClass: ClassConstructor<T>,
) {
  const validatedConfig = plainToClass(envVariablesClass, config, {
    enableImplicitConversion: true, // Automatically convert types
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false, // Ensure all properties are validated
  });

  if (errors.length > 0) {
    throw new Error(errors.toString() as string); // Throw an error if validation fails
  }
  return validatedConfig;
}

export default validateConfig;