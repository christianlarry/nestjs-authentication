import { EventEmitter2 } from '@nestjs/event-emitter';
import { AccountRegisteredApplicationEvent } from '../../events/account-registered.event';
import { PasswordTooWeakError } from '../../../domain/errors/password-too-weak.error';
import { RegisterUseCase } from '../register.usecase';

describe('RegisterUseCase', () => {
  const mockPasswordHasher = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockAccountRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockAccountQueryRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    findAll: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  } as unknown as EventEmitter2;

  let registerUseCase: RegisterUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    registerUseCase = new RegisterUseCase(
      mockPasswordHasher,
      mockAccountRepository,
      mockAccountQueryRepository,
      mockEventEmitter,
    );
  });

  it('registers new account successfully', async () => {
    mockAccountQueryRepository.existsByEmail.mockResolvedValue(false);
    mockPasswordHasher.hash.mockResolvedValue('argon2-hash');

    const result = await registerUseCase.execute({
      name: 'John Doe',
      credentials: {
        email: 'john@example.com',
        password: 'SecurePass123!',
      },
    });

    expect(result.newAccountId).toBeDefined();
    expect(typeof result.newAccountId).toBe('string');

    expect(mockAccountQueryRepository.existsByEmail).toHaveBeenCalledWith('john@example.com');
    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('SecurePass123!');
    expect(mockAccountRepository.save).toHaveBeenCalledTimes(1);

    expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
    const [eventName, eventPayload] = (mockEventEmitter.emit as jest.Mock).mock.calls[0];
    expect(eventName).toBe(AccountRegisteredApplicationEvent.EventName);
    expect(eventPayload).toBeInstanceOf(AccountRegisteredApplicationEvent);
    expect(eventPayload.payload.email).toBe('john@example.com');
    expect(eventPayload.payload.name).toBe('John Doe');
    expect(eventPayload.payload.accountId).toBe(result.newAccountId);
  });

  it('throws error when email is already used', async () => {
    mockAccountQueryRepository.existsByEmail.mockResolvedValue(true);

    await expect(
      registerUseCase.execute({
        name: 'John Doe',
        credentials: {
          email: 'john@example.com',
          password: 'SecurePass123!',
        },
      }),
    ).rejects.toThrow('Email already in use');

    expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
    expect(mockAccountRepository.save).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });

  it('throws PasswordTooWeakError for weak password', async () => {
    mockAccountQueryRepository.existsByEmail.mockResolvedValue(false);

    await expect(
      registerUseCase.execute({
        name: 'John Doe',
        credentials: {
          email: 'john@example.com',
          password: 'weak',
        },
      }),
    ).rejects.toBeInstanceOf(PasswordTooWeakError);

    expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
    expect(mockAccountRepository.save).not.toHaveBeenCalled();
    expect(mockEventEmitter.emit).not.toHaveBeenCalled();
  });
});
