import { deviceOf, locationOf } from './security-util.js';

it('parses device and private IP location', () => {
  expect(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('iPhone · Safari');
  expect(deviceOf('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36 Edg/140.0')).toBe('Windows · Edge');
  expect(locationOf('::ffff:192.168.1.5')).toBe('เครือข่ายภายใน');
  expect(locationOf('1.46.0.1')).toContain('TH');
});
