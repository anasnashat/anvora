import { TemplatesService } from './templates.service';

describe('TemplatesService', () => {
  it('substitutes variable names literally', () => {
    const service = new TemplatesService({} as never);

    expect(
      service.substituteVariables('Hello {{name}}; keep {{other}}', {
        name: 'Ana',
        '.*': 'unsafe',
      }),
    ).toBe('Hello Ana; keep {{other}}');
  });
});
