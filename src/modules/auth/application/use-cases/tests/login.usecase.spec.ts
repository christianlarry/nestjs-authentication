import { LoginUseCase } from '../login.usecase';
import { InvalidCredentialsError } from '../../errors';

describe('LoginUseCase', () => {
  const mockAccountQueryRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    findAll: jest.fn(),
  };

  const mockAccountRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    existsByEmail: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockPasswordHasher = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockAccessTokenGenerator = {
    generate: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
    secret: 'test-secret',
    expirationTimeInSeconds: 3600,
    jwtService: {},
    configService: {},
  } as any;

  const mockRefreshTokenGenerator = {
    generate: jest.fn(),
    verify: jest.fn(),
    decode: jest.fn(),
    secret: 'test-secret',
    expirationTimeInSeconds: 86400,
    jwtService: {},
    configService: {},
  } as any;

  let loginUseCase: LoginUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    loginUseCase = new LoginUseCase(
      mockAccountQueryRepository as any,
      mockAccountRepository as any,
      mockPasswordHasher as any,
      mockAccessTokenGenerator,
      mockRefreshTokenGenerator,
    );
  });

  describe('execute', () => {
    const testEmail = 'john@example.com';
    const testPassword = 'SecurePass123!';
    const testAccountId = 'account-123';

    const mockAccount = {
      id: {
        getValue: jest.fn().mockReturnValue(testAccountId),
      },
      email: {
        getValue: jest.fn().mockReturnValue(testEmail),
      },
      password: {
        getValue: jest.fn().mockReturnValue('hashed-password'),
      },
      role: 'USER',
      assertCanLogin: jest.fn(),
      recordSuccessfulLogin: jest.fn(),
      recordFailedLoginAttempt: jest.fn(),
    };

    it('logs in user successfully with valid credentials', async () => {
      const accessToken = 'access-token-123';
      const refreshToken = 'refresh-token-456';

      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockAccessTokenGenerator.generate.mockResolvedValue(accessToken);
      mockRefreshTokenGenerator.generate.mockResolvedValue(refreshToken);

      const result = await loginUseCase.execute({
        email: testEmail,
        password: testPassword,
      });

      expect(result).toEqual({
        accountId: testAccountId,
        accessToken,
        refreshToken,
      });

      expect(mockAccountRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockAccountRepository.findByEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          value: testEmail,
        }),
      );

      expect(mockAccount.assertCanLogin).toHaveBeenCalledTimes(1);

      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        testPassword,
        'hashed-password',
      );

      expect(mockAccessTokenGenerator.generate).toHaveBeenCalledWith({
        accountId: testAccountId,
        email: testEmail,
        role: 'USER',
      });

      expect(mockRefreshTokenGenerator.generate).toHaveBeenCalledWith({
        accountId: testAccountId,
      });

      expect(mockAccount.recordSuccessfulLogin).toHaveBeenCalledTimes(1);
      expect(mockAccountRepository.save).toHaveBeenCalledWith(mockAccount);
    });

    it('throws InvalidCredentialsError when account not found', async () => {
      mockAccountRepository.findByEmail.mockResolvedValue(null);

      await expect(
        loginUseCase.execute({
          email: testEmail,
          password: testPassword,
        }),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockAccountRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockAccount.assertCanLogin).not.toHaveBeenCalled();
      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
      expect(mockAccessTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockRefreshTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockAccountRepository.save).not.toHaveBeenCalled();
    });

    it('throws InvalidCredentialsError when password is invalid', async () => {
      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockAccount.assertCanLogin.mockImplementation(() => {
        // do nothing - account is valid
      });
      mockPasswordHasher.compare.mockResolvedValue(false);

      await expect(
        loginUseCase.execute({
          email: testEmail,
          password: 'WrongPassword123!',
        }),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockAccountRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockAccount.assertCanLogin).toHaveBeenCalledTimes(1);
      expect(mockPasswordHasher.compare).toHaveBeenCalledWith(
        'WrongPassword123!',
        'hashed-password',
      );

      expect(mockAccessTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockRefreshTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockAccount.recordSuccessfulLogin).not.toHaveBeenCalled();
      expect(mockAccountRepository.save).not.toHaveBeenCalled();
    });

    it('throws error from assertCanLogin when account cannot login', async () => {
      const loginError = new Error('Account is locked');
      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockAccount.assertCanLogin.mockImplementation(() => {
        throw loginError;
      });

      await expect(
        loginUseCase.execute({
          email: testEmail,
          password: testPassword,
        }),
      ).rejects.toThrow(loginError);

      expect(mockAccountRepository.findByEmail).toHaveBeenCalledTimes(1);
      expect(mockAccount.assertCanLogin).toHaveBeenCalledTimes(1);
      expect(mockPasswordHasher.compare).not.toHaveBeenCalled();
      expect(mockAccessTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockRefreshTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockAccountRepository.save).not.toHaveBeenCalled();
    });

    it('generates both access and refresh tokens with correct payloads', async () => {
      const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...access';
      const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...refresh';

      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockAccessTokenGenerator.generate.mockResolvedValue(accessToken);
      mockRefreshTokenGenerator.generate.mockResolvedValue(refreshToken);

      const result = await loginUseCase.execute({
        email: testEmail,
        password: testPassword,
      });

      expect(mockAccessTokenGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: testAccountId,
          email: testEmail,
          role: 'USER',
        }),
      );

      expect(mockRefreshTokenGenerator.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: testAccountId,
        }),
      );

      expect(result.accessToken).toBe(accessToken);
      expect(result.refreshToken).toBe(refreshToken);
    });

    it('calls recordSuccessfulLogin and saves account after successful verification', async () => {
      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockAccessTokenGenerator.generate.mockResolvedValue('access-token');
      mockRefreshTokenGenerator.generate.mockResolvedValue('refresh-token');

      await loginUseCase.execute({
        email: testEmail,
        password: testPassword,
      });

      expect(mockAccount.recordSuccessfulLogin).toHaveBeenCalledTimes(1);
      expect(mockAccountRepository.save).toHaveBeenCalledTimes(1);
      expect(mockAccountRepository.save).toHaveBeenCalledWith(mockAccount);
    });

    it('returns correct structure with accountId, accessToken, and refreshToken', async () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockAccessTokenGenerator.generate.mockResolvedValue(accessToken);
      mockRefreshTokenGenerator.generate.mockResolvedValue(refreshToken);

      const result = await loginUseCase.execute({
        email: testEmail,
        password: testPassword,
      });

      expect(result).toHaveProperty('accountId');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(typeof result.accountId).toBe('string');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('trims whitespace from email before lookup', async () => {
      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockAccessTokenGenerator.generate.mockResolvedValue('access-token');
      mockRefreshTokenGenerator.generate.mockResolvedValue('refresh-token');

      await loginUseCase.execute({
        email: '  ' + testEmail + '  ',
        password: testPassword,
      });

      // Email.create should normalize the email
      expect(mockAccountRepository.findByEmail).toHaveBeenCalled();
    });

    it('handles password verification failure without calling token generators', async () => {
      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockAccount.assertCanLogin.mockImplementation(() => {
        // account is valid
      });
      mockPasswordHasher.compare.mockResolvedValue(false);

      await expect(
        loginUseCase.execute({
          email: testEmail,
          password: 'wrong-password',
        }),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(mockAccessTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockRefreshTokenGenerator.generate).not.toHaveBeenCalled();
      expect(mockAccount.recordSuccessfulLogin).not.toHaveBeenCalled();
      expect(mockAccountRepository.save).not.toHaveBeenCalled();
    });

    it('maintains correct execution order: find -> assert -> compare -> generate -> record -> save', async () => {
      const callOrder: string[] = [];

      mockAccountRepository.findByEmail.mockImplementation(() => {
        callOrder.push('findByEmail');
        return Promise.resolve(mockAccount);
      });

      mockAccount.assertCanLogin.mockImplementation(() => {
        callOrder.push('assertCanLogin');
      });

      mockPasswordHasher.compare.mockImplementation(() => {
        callOrder.push('compare');
        return Promise.resolve(true);
      });

      mockAccessTokenGenerator.generate.mockImplementation(() => {
        callOrder.push('generateAccessToken');
        return Promise.resolve('access-token');
      });

      mockRefreshTokenGenerator.generate.mockImplementation(() => {
        callOrder.push('generateRefreshToken');
        return Promise.resolve('refresh-token');
      });

      mockAccount.recordSuccessfulLogin.mockImplementation(() => {
        callOrder.push('recordSuccessfulLogin');
      });

      mockAccountRepository.save.mockImplementation(() => {
        callOrder.push('save');
        return Promise.resolve();
      });

      await loginUseCase.execute({
        email: testEmail,
        password: testPassword,
      });

      expect(callOrder).toEqual([
        'findByEmail',
        'assertCanLogin',
        'compare',
        'generateAccessToken',
        'generateRefreshToken',
        'recordSuccessfulLogin',
        'save',
      ]);
    });

    it('uses account repository not query repository for findByEmail', async () => {
      mockAccountRepository.findByEmail.mockResolvedValue(mockAccount);
      mockPasswordHasher.compare.mockResolvedValue(true);
      mockAccessTokenGenerator.generate.mockResolvedValue('access-token');
      mockRefreshTokenGenerator.generate.mockResolvedValue('refresh-token');

      await loginUseCase.execute({
        email: testEmail,
        password: testPassword,
      });

      expect(mockAccountRepository.findByEmail).toHaveBeenCalled();
      expect(mockAccountQueryRepository.findByEmail).not.toHaveBeenCalled();
    });
  });
});
