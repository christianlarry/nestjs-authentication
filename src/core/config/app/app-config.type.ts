export type AppConfig = {
  nodeEnv: Environment;
  name: string;
  docsUrl: string;
  workingDirectory: string;
  frontendDomain?: string;
  backendDomain: string;
  port: number;
  apiPrefix: string;
  cookieSecret: string;
};

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}