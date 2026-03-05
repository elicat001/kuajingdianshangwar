/**
 * Mock TypeORM Repository factory for unit testing.
 * Provides a type-safe mock that implements the most commonly used Repository methods.
 */
export type MockRepository<T = any> = {
  find: jest.Mock;
  findOne: jest.Mock;
  findOneBy: jest.Mock;
  save: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  remove: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
  manager: { transaction: jest.Mock };
};

/**
 * Create a mock QueryBuilder that supports chaining.
 */
export function createMockQueryBuilder() {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(0),
    select: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
  };
  return qb;
}

/**
 * Create a fully mocked Repository for use in NestJS testing modules.
 *
 * Usage:
 *   const mockRepo = createMockRepository<SomeEntity>();
 *   // configure mocks...
 *   mockRepo.findOne.mockResolvedValue(someEntity);
 */
export function createMockRepository<T = any>(): MockRepository<T> {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation((entity) =>
      Promise.resolve({ id: 'generated-uuid', ...entity }),
    ),
    create: jest.fn().mockImplementation((dto) => ({ ...dto })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    remove: jest.fn().mockResolvedValue(undefined),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    manager: { transaction: jest.fn() },
  };
}
