import { buildPage } from './page-query.dto';

describe('buildPage', () => {
  it('totalPages — yuqoriga yaxlitlaydi', () => {
    expect(buildPage([1, 2], 45, 1, 20)).toEqual({
      items: [1, 2],
      page: 1,
      perPage: 20,
      total: 45,
      totalPages: 3,
    });
  });

  it('bo‘sh natija — totalPages kamida 1', () => {
    expect(buildPage([], 0, 1, 20).totalPages).toBe(1);
  });

  it('perPage aniq bo‘linadigan total', () => {
    expect(buildPage([], 40, 1, 20).totalPages).toBe(2);
  });
});
