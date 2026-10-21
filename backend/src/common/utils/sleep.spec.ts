import { sleep } from './sleep';

describe('sleep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after the given time and not before', async () => {
    let done = false;
    const waiting = sleep(1000).then(() => {
      done = true;
    });

    await jest.advanceTimersByTimeAsync(999);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await waiting;

    expect(done).toBe(true);
  });

  it('rejects as soon as the signal is aborted and clears its timer', async () => {
    const controller = new AbortController();
    const waiting = sleep(5000, controller.signal);
    const outcome = expect(waiting).rejects.toThrow('stop');

    controller.abort(new Error('stop'));
    await outcome;

    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('already'));

    await expect(sleep(5000, controller.signal)).rejects.toThrow('already');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not leave an abort listener behind after finishing normally', async () => {
    const controller = new AbortController();
    const remove = jest.spyOn(controller.signal, 'removeEventListener');
    const waiting = sleep(10, controller.signal);

    await jest.advanceTimersByTimeAsync(10);
    await waiting;

    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  });
});
