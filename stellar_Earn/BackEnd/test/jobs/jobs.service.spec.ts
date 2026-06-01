import { JobsService } from '../../src/modules/jobs/jobs.service';
import { QUEUES } from '../../src/modules/jobs/jobs.constants';

describe('JobsService (unit)', () => {
  let service: JobsService;

  beforeEach(() => {
    service = new JobsService();
  });

  it('should expose getQueue and return undefined for unknown before init', () => {
    expect(service.getQueue('nonexistent')).toBeUndefined();
  });

  it('addJob should throw when queue not found', async () => {
    await expect(service.addJob('nope', {})).rejects.toThrow();
  });
});
