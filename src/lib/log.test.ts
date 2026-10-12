import { describe, expect, it, vi } from 'vitest';
import { createLogger, log, type LogLevel } from './log';

function capture() {
  const lines: { level: LogLevel; entry: Record<string, unknown> }[] = [];
  const logger = createLogger({ service: 'test' }, (level, line) => {
    lines.push({ level, entry: JSON.parse(line) as Record<string, unknown> });
  });
  return { lines, logger };
}

describe('createLogger', () => {
  it('writes one JSON line per event with base fields', () => {
    const { lines, logger } = capture();
    logger.info('order created', { order_id: 'o1' });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.level).toBe('info');
    expect(lines[0]?.entry).toMatchObject({
      level: 'info',
      message: 'order created',
      service: 'test',
      order_id: 'o1',
    });
    expect(typeof lines[0]?.entry.time).toBe('string');
  });

  it('supports every level and child loggers', () => {
    const { lines, logger } = capture();
    const child = logger.child({ request_id: 'r1', restaurant_id: 'x' });
    child.debug('d');
    child.warn('w');
    logger.error('e');
    expect(lines.map((line) => line.level)).toEqual(['debug', 'warn', 'error']);
    expect(lines[0]?.entry).toMatchObject({
      request_id: 'r1',
      restaurant_id: 'x',
      service: 'test',
    });
    expect(lines[2]?.entry.request_id).toBeUndefined();
  });

  it('serialises errors without losing their message', () => {
    const { lines, logger } = capture();
    logger.error('failed', { error: new TypeError('boom') });
    expect(lines[0]?.entry.error).toMatchObject({ name: 'TypeError', message: 'boom' });
  });

  it('defaults to the console sink', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    log.debug('hello');
    log.warn('careful');
    expect(spy).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledOnce();
    spy.mockRestore();
    warn.mockRestore();
  });
});
