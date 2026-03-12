export abstract class DomainEvent<T = any> {
  public readonly occurredAt: Date;
  public readonly eventId: string;

  constructor(
    public readonly payload: T,
    public readonly name: string,
  ) {
    this.occurredAt = new Date();
    this.eventId = crypto.randomUUID();
  }
}