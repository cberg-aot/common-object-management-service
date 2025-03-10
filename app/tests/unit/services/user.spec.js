const { NIL: SYSTEM_USER } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const IdentityProvider = require('../../../src/db/models/tables/identityProvider');
const User = require('../../../src/db/models/tables/user');

jest.mock('../../../src/db/models/tables/identityProvider', () => ({
  commit: jest.fn().mockReturnThis(),
  rollback: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  findById: jest.fn().mockReturnThis(),
  insertAndFetch: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/user', () => ({
  commit: jest.fn().mockReturnThis(),
  rollback: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),
  throwIfNotFound: jest.fn().mockReturnThis(),

  first: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  insertAndFetch: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  patchAndFetchById: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereNotNull: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/user');

const userId = SYSTEM_USER;
const token = {
  sub: userId,
  identity_provider_identity: 'jsmith:idir',
  preferred_username: 'john@email.com',
  given_name: 'john',
  family_name: 'smith',
  name: 'john smith',
  email: 'jsmith@email.com',
  identity_provider: 'idir'
};
const user = {
  userId: userId,
  identityId: userId,
  username: 'jsmith:idir',
  firstName: 'john',
  lastName: 'smith',
  fullName: 'john smith',
  email: 'jsmith@email.com',
  idp: 'idir'
};

beforeEach(() => {
  jest.clearAllMocks();
  resetReturnThis(IdentityProvider);
  resetReturnThis(User);
});

describe('_tokenToUser', () => {
  // TODO: Add more edge case testing
  it('Transforms JWT payload contents into a User Model object', () => {
    const expected = { ...user, userId: undefined };
    const newUser = service._tokenToUser(token);
    expect(newUser).toEqual(expected);
  });
});


describe('createIdp', () => {
  it('Creates an IDP record', async () => {
    await service.createIdp('foo');

    expect(IdentityProvider.startTransaction).toHaveBeenCalledTimes(1);
    expect(IdentityProvider.query).toHaveBeenCalledTimes(1);
    expect(IdentityProvider.query).toHaveBeenCalledWith(expect.anything());
    expect(IdentityProvider.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(IdentityProvider.insertAndFetch).toBeCalledWith(
      expect.objectContaining({
        idp: 'foo',
        createdBy: expect.any(String),
      })
    );
    expect(IdentityProvider.commit).toHaveBeenCalledTimes(1);
  });
});

describe('createUser', () => {
  const readIdpSpy = jest.spyOn(service, 'readIdp');
  const createIdpSpy = jest.spyOn(service, 'createIdp');

  beforeEach(() => {
    readIdpSpy.mockReset();
    createIdpSpy.mockReset();
  });

  afterAll(() => {
    readIdpSpy.mockRestore();
    createIdpSpy.mockRestore();
  });

  it('Creates an idp if no matching idp exists in database', async () => {
    readIdpSpy.mockReturnValue(false);
    await service.createUser(user);

    expect(readIdpSpy).toHaveBeenCalledTimes(1);
    expect(readIdpSpy).toHaveBeenCalledWith('idir');
    expect(createIdpSpy).toHaveBeenCalledTimes(1);
    expect(createIdpSpy).toHaveBeenCalledWith('idir', expect.anything());

    expect(User.startTransaction).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith(expect.anything());
    expect(User.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(User.insertAndFetch).toBeCalledWith(
      expect.objectContaining({
        ...user,
        userId: expect.any(String)
      })
    );
    expect(User.commit).toHaveBeenCalledTimes(1);
  });

  it('Skips creating an idp if matching idp already exists in database', async () => {
    readIdpSpy.mockReturnValue(true);
    await service.createUser(user);

    expect(readIdpSpy).toHaveBeenCalledTimes(1);
    expect(readIdpSpy).toHaveBeenCalledWith('idir');
    expect(createIdpSpy).toHaveBeenCalledTimes(0);

    expect(User.startTransaction).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith(expect.anything());
    expect(User.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(User.insertAndFetch).toBeCalledWith(
      expect.objectContaining({
        ...user,
        userId: expect.any(String)
      })
    );
    expect(User.commit).toHaveBeenCalledTimes(1);
  });

  it('Does not create an idp if user has none (eg: \'System\' user)', async () => {
    const systemUser = { ...user, idp: undefined };
    await service.createUser(systemUser);

    expect(readIdpSpy).toHaveBeenCalledTimes(0);
    expect(createIdpSpy).toHaveBeenCalledTimes(0);

    expect(User.startTransaction).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith(expect.anything());
    expect(User.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(User.insertAndFetch).toBeCalledWith(
      expect.objectContaining({
        ...systemUser,
        userId: expect.any(String)
      })
    );
    expect(User.commit).toHaveBeenCalledTimes(1);
  });
});

describe('getCurrentUserId', () => {
  it('Query user by identityId', async () => {
    User.first.mockResolvedValue({ ...user, userId: '123', identityId: '123-idir' });
    const result = await service.getCurrentUserId('123-idir');

    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith();
    expect(User.select).toHaveBeenCalledTimes(1);
    expect(User.select).toHaveBeenCalledWith('userId');
    expect(User.where).toHaveBeenCalledTimes(1);
    expect(User.where).toHaveBeenCalledWith('identityId', '123-idir');
    expect(User.first).toHaveBeenCalledTimes(1);
    expect(User.first).toHaveBeenCalledWith();
    expect(result).toEqual('123');
  });
});

describe('listIdps', () => {
  it('Query user by identityId', () => {
    const params = { active: true };
    service.listIdps(params);

    expect(IdentityProvider.query).toHaveBeenCalledTimes(1);
    expect(IdentityProvider.query).toHaveBeenCalledWith();
    expect(IdentityProvider.modify).toHaveBeenCalledTimes(2);
    expect(IdentityProvider.modify).toHaveBeenNthCalledWith(1, 'filterActive', params.active);
    expect(IdentityProvider.modify).toHaveBeenNthCalledWith(2, 'orderDefault');
  });
});

describe('login', () => {
  const createUserSpy = jest.spyOn(service, 'createUser');
  const updateUserSpy = jest.spyOn(service, 'updateUser');
  const tokenToUserSpy = jest.spyOn(service, '_tokenToUser');

  beforeEach(() => {
    tokenToUserSpy.mockReset();
    createUserSpy.mockReset();
    updateUserSpy.mockReset();

    service._tokenToUser = jest.fn().mockReturnValue(user);
  });

  afterAll(() => {
    tokenToUserSpy.mockRestore();
    createUserSpy.mockRestore();
    updateUserSpy.mockRestore();
  });

  it('Adds a new user record', async () => {
    User.first.mockResolvedValue(undefined);
    await service.login(token);

    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith();
    expect(User.where).toHaveBeenCalledTimes(1);
    expect(User.where).toHaveBeenCalledWith('identityId', user.identityId);
    expect(User.first).toHaveBeenCalledTimes(1);
    expect(User.first).toHaveBeenCalledWith();

    expect(createUserSpy).toHaveBeenCalledTimes(1);
    expect(createUserSpy).toHaveBeenCalledWith(user);
    expect(updateUserSpy).toHaveBeenCalledTimes(0);
  });

  it('Updates an existing user record', async () => {
    User.first.mockResolvedValue({ ...user, userId: 'a96f2809-d6f4-4cef-a02a-3f72edff06d7' });
    await service.login(token);

    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith();
    expect(User.where).toHaveBeenCalledTimes(1);
    expect(User.where).toHaveBeenCalledWith('identityId', user.identityId);
    expect(User.first).toHaveBeenCalledTimes(1);
    expect(User.first).toHaveBeenCalledWith();

    expect(createUserSpy).toHaveBeenCalledTimes(0);
    expect(updateUserSpy).toHaveBeenCalledTimes(1);
    expect(updateUserSpy).toHaveBeenCalledWith('a96f2809-d6f4-4cef-a02a-3f72edff06d7', expect.objectContaining(user));
  });
});

describe('readIdp', () => {
  it('Query identityProvider by code', () => {
    service.readIdp('idir');

    expect(IdentityProvider.query).toHaveBeenCalledTimes(1);
    expect(IdentityProvider.query).toHaveBeenCalledWith();
    expect(IdentityProvider.findById).toHaveBeenCalledTimes(1);
    expect(IdentityProvider.findById).toHaveBeenCalledWith('idir');
  });
});

describe('readUser', () => {
  it('Query user by userId', () => {
    service.readUser(SYSTEM_USER);

    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith();
    expect(User.findById).toHaveBeenCalledTimes(1);
    expect(User.findById).toHaveBeenCalledWith(SYSTEM_USER);
    expect(User.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(User.throwIfNotFound).toHaveBeenCalledWith();
  });
});

describe('searchUsers', () => {
  it('Query user by identityId', () => {
    const params = { ...user, active: true, search: 'foo' };
    service.searchUsers(params);

    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith();
    expect(User.modify).toHaveBeenCalledTimes(11);
    expect(User.modify).toHaveBeenNthCalledWith(1, 'filterUserId', params.userId);
    expect(User.modify).toHaveBeenNthCalledWith(2, 'filterIdentityId', params.identityId);
    expect(User.modify).toHaveBeenNthCalledWith(3, 'filterIdp', params.idp);
    expect(User.modify).toHaveBeenNthCalledWith(4, 'filterUsername', params.username);
    expect(User.modify).toHaveBeenNthCalledWith(5, 'filterEmail', params.email);
    expect(User.modify).toHaveBeenNthCalledWith(6, 'filterFirstName', params.firstName);
    expect(User.modify).toHaveBeenNthCalledWith(7, 'filterFullName', params.fullName);
    expect(User.modify).toHaveBeenNthCalledWith(8, 'filterLastName', params.lastName);
    expect(User.modify).toHaveBeenNthCalledWith(9, 'filterActive', params.active);
    expect(User.modify).toHaveBeenNthCalledWith(10, 'filterSearch', params.search);
    expect(User.modify).toHaveBeenNthCalledWith(11, 'orderLastFirstAscending');
    expect(User.whereNotNull).toHaveBeenCalledTimes(1);
    expect(User.whereNotNull).toHaveBeenCalledWith('identityId');
  });
});

describe('updateUser', () => {
  const tokenToUserSpy = jest.spyOn(service, '_tokenToUser');
  const readUserSpy = jest.spyOn(service, 'readUser');
  const createIdpSpy = jest.spyOn(service, 'createIdp');
  const readIdpSpy = jest.spyOn(service, 'readIdp');

  beforeEach(() => {
    tokenToUserSpy.mockReset();
    readIdpSpy.mockReset();
    createIdpSpy.mockReset();
    readUserSpy.mockReset();

    service._tokenToUser = jest.fn().mockReturnValue(user);
  });

  afterAll(() => {
    tokenToUserSpy.mockRestore();
    readIdpSpy.mockRestore();
    createIdpSpy.mockRestore();
    readUserSpy.mockRestore();
  });

  it('Does nothing if user is unchanged', async () => {
    readUserSpy.mockResolvedValue(user);
    await service.updateUser(userId, user);

    expect(readUserSpy).toHaveBeenCalledTimes(1);
    expect(readUserSpy).toHaveBeenCalledWith(userId);
    expect(readIdpSpy).toHaveBeenCalledTimes(0);
    expect(createIdpSpy).toHaveBeenCalledTimes(0);

    expect(User.query).toHaveBeenCalledTimes(0);
    expect(User.patchAndFetchById).toHaveBeenCalledTimes(0);
  });

  it('Updates existing user if properties have changed', async () => {
    const oldUser = { ...user, email: 'jsmith@yahoo.com' };
    readUserSpy.mockResolvedValue(oldUser);
    await service.updateUser(userId, user);

    expect(readUserSpy).toHaveBeenCalledTimes(1);
    expect(readUserSpy).toHaveBeenCalledWith(userId);
    expect(readIdpSpy).toHaveBeenCalledTimes(0);

    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith(expect.anything());
    expect(User.patchAndFetchById).toHaveBeenCalledTimes(1);
    expect(User.patchAndFetchById).toHaveBeenCalledWith(userId, expect.any(Object));
  });

  it.skip('Creates idp if idp does not exist in db', async () => {
    const oldUser = { ...user, email: 'jsmith@yahoo.com', idp: 'newIdp' };
    readUserSpy.mockResolvedValue(oldUser);
    readIdpSpy.mockResolvedValue(undefined);
    await service.updateUser(userId, user);

    expect(readUserSpy).toHaveBeenCalledTimes(1);
    expect(readUserSpy).toHaveBeenCalledWith(userId);
    // TODO: For some reason, the spied on functions below are not actually being spy wrapped.
    // expect(readIdpSpy).toHaveBeenCalledTimes(1);
    // expect(readIdpSpy).toHaveBeenCalledWith(user.idp, expect.anything());
    // expect(createIdpSpy).toHaveBeenCalledTimes(1);
    // expect(createIdpSpy).toHaveBeenCalledWith(user.idp, expect.anything());

    expect(User.query).toHaveBeenCalledTimes(1);
    expect(User.query).toHaveBeenCalledWith(expect.anything());
    expect(User.patchAndFetchById).toHaveBeenCalledTimes(1);
    expect(User.patchAndFetchById).toHaveBeenCalledWith(userId, expect.any(Object));
  });
});
